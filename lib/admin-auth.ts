import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { env } from "./env";

const COOKIE_NAME = "daily_draw_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function sign(value: string) {
  return createHmac("sha256", env.adminSessionSecret).update(value).digest("hex");
}

export function verifyPassword(password: string) {
  if (!env.adminPassword) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(env.adminPassword);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function makeSessionCookie() {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidSession(value?: string) {
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = sign(expires);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdminFromCookies() {
  const store = await cookies();
  return isValidSession(store.get(COOKIE_NAME)?.value);
}

export function isAdminRequest(request: NextRequest) {
  return isValidSession(request.cookies.get(COOKIE_NAME)?.value);
}

export const adminCookie = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE_SECONDS
};
