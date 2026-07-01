import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { env } from "./env";
import { getDb } from "./mongodb";

export type Role = "super_admin" | "admin" | "sub_admin" | "user";

export type UserDocument = {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  points: number;
  active: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionUser = Pick<UserDocument, "id" | "username" | "role" | "active"> & {
  points?: number;
  createdBy?: string;
  createdByUsername?: string;
  pointsGivenByActor?: number;
  pointsTakenByActor?: number;
  pointsLost?: number;
  pointsWon?: number;
  gameProfit?: number;
};

export type PointTransactionDocument = {
  id: string;
  actorId: string;
  actorUsername: string;
  targetId: string;
  targetUsername: string;
  amount: number;
  type: "give" | "take" | "loss";
  roundId?: string;
  createdAt: Date;
};

const COOKIE_NAME = "number_game_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;
const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || "superadmin";

let indexesReady: Promise<void> | null = null;
let pointTransactionIndexesReady: Promise<void> | null = null;

function sign(value: string) {
  return scryptSync(value, env.adminSessionSecret, 32).toString("hex");
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyHash(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function usersCollection() {
  const db = await getDb();
  const collection = db.collection<UserDocument>("users");
  if (!indexesReady) {
    indexesReady = Promise.all([
      collection.createIndex({ id: 1 }, { unique: true }),
      collection.createIndex({ username: 1 }, { unique: true }),
      collection.createIndex({ role: 1, active: 1 })
    ]).then(() => undefined);
  }
  await indexesReady;
  return collection;
}

export async function pointTransactionsCollection() {
  const db = await getDb();
  const collection = db.collection<PointTransactionDocument>("point_transactions");
  if (!pointTransactionIndexesReady) {
    pointTransactionIndexesReady = Promise.all([
      collection.createIndex({ id: 1 }, { unique: true }),
      collection.createIndex({ actorId: 1, targetId: 1 }),
      collection.createIndex({ targetId: 1, createdAt: -1 }),
      collection.createIndex({ createdAt: -1 })
    ]).then(() => undefined);
  }
  await pointTransactionIndexesReady;
  return collection;
}

export async function ensureSuperAdmin() {
  const collection = await usersCollection();
  const username = normalizeUsername(SUPER_ADMIN_USERNAME);
  const existing = await collection.findOne({ username });
  if (existing) return existing;
  const now = new Date();
  const user: UserDocument = {
    id: randomUUID(),
    username,
    passwordHash: hashPassword(env.adminPassword),
    role: "super_admin",
    points: 0,
    active: true,
    createdAt: now,
    updatedAt: now
  };
  await collection.insertOne(user);
  return user;
}

export async function verifyLogin(username: string, password: string) {
  await ensureSuperAdmin();
  const collection = await usersCollection();
  const user = await collection.findOne({ username: normalizeUsername(username), active: true });
  if (!user || !verifyHash(password, user.passwordHash)) return null;
  return user;
}

function makeSessionValue(user: UserDocument) {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ id: user.id, expires })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionId(value?: string) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || signature !== sign(payload)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { id?: string; expires?: number };
    if (!parsed.id || !parsed.expires || parsed.expires < Date.now()) return null;
    return parsed.id;
  } catch {
    return null;
  }
}

export async function getUserById(id: string) {
  await ensureSuperAdmin();
  const collection = await usersCollection();
  return collection.findOne({ id, active: true });
}

export async function getCurrentUserFromCookie(value?: string) {
  const id = readSessionId(value);
  if (!id) return null;
  return getUserById(id);
}

export async function getCurrentUser() {
  const store = await cookies();
  return getCurrentUserFromCookie(store.get(COOKIE_NAME)?.value);
}

export async function getRequestUser(request: NextRequest) {
  return getCurrentUserFromCookie(request.cookies.get(COOKIE_NAME)?.value);
}

export async function isAdminFromCookies() {
  const user = await getCurrentUser();
  return Boolean(user && user.role !== "user");
}

export async function isAdminRequest(request: NextRequest) {
  const user = await getRequestUser(request);
  return Boolean(user && user.role !== "user");
}

export async function requireRole(request: NextRequest, roles: Role[]) {
  const user = await getRequestUser(request);
  if (!user || !roles.includes(user.role)) return null;
  return user;
}

export function canCreateRole(actor: Role, target: Role) {
  if (actor === "super_admin") return target !== "super_admin";
  if (actor === "admin") return target === "user";
  if (actor === "sub_admin") return target === "user";
  return false;
}

export function canManagePoints(actor: Role, target: Role) {
  if (actor === "super_admin") return target !== "super_admin";
  if (actor === "admin" || actor === "sub_admin") return target === "user";
  return false;
}

export function canManageUser(actor: UserDocument, target: UserDocument) {
  if (target.role === "super_admin") return false;
  if (actor.role === "super_admin") return true;
  if ((actor.role === "admin" || actor.role === "sub_admin") && target.role === "user") {
    return target.createdBy === actor.id;
  }
  return false;
}

export async function createUser(input: { username: string; password: string; role: Role; createdBy: UserDocument }) {
  if (!canCreateRole(input.createdBy.role, input.role)) throw new Error("Role not allowed");
  const collection = await usersCollection();
  const now = new Date();
  const doc: UserDocument = {
    id: randomUUID(),
    username: normalizeUsername(input.username),
    passwordHash: hashPassword(input.password),
    role: input.role,
    points: 0,
    active: true,
    createdBy: input.createdBy.id,
    createdAt: now,
    updatedAt: now
  };
  await collection.insertOne(doc);
  return doc;
}

export function serializeUser(
  user: UserDocument,
  showPoints = true,
  extra: {
    createdByUsername?: string;
    pointsGivenByActor?: number;
    pointsTakenByActor?: number;
    pointsLost?: number;
    pointsWon?: number;
    gameProfit?: number;
  } = {}
): SessionUser {
  const serialized: SessionUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    active: user.active,
    createdBy: user.createdBy,
    ...extra
  };
  if (showPoints) serialized.points = user.points;
  return serialized;
}

export const authCookie = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE_SECONDS,
  make: makeSessionValue
};
