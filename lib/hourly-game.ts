import { randomInt, randomUUID } from "crypto";
import { Filter, WithId } from "mongodb";
import { env } from "./env";
import { getGameSettings, type GameSettingsDocument } from "./game-settings";
import { getDb } from "./mongodb";
import { pointTransactionsCollection, usersCollection, type UserDocument } from "./admin-auth";
import type { Bet, GameStatus, Result } from "@/types/result";

export const GAME_ID = "one-to-twelve";
export const GAME_NAME = "1-12 Number Game";
export const MIN_NUMBER = 1;
export const MAX_NUMBER = 12;
export const ENTRY_POINTS = 10;
export const WIN_POINTS = 80;
export const ENTRY_LOCK_SECONDS = 30;

type BetDocument = {
  id: string;
  roundId: string;
  userId: string;
  username: string;
  number: number;
  points: number;
  createdAt: Date;
};

type ResultDocument = {
  id: string;
  gameId: string;
  gameName: string;
  drawNumber: string;
  winningNumber: string;
  drawTime: Date;
  createdAt: Date;
  totalBetPoints: number;
  winnerCount: number;
  paidPoints: number;
  numberTotals: Record<string, number>;
  winners?: Array<{
    userId: string;
    username: string;
    entries: number;
    paidPoints: number;
  }>;
  losses?: Array<{
    userId: string;
    username: string;
    adminId: string;
    adminUsername: string;
    lostPoints: number;
  }>;
};

export type UserGameHistoryItem = {
  roundId: string;
  drawTime: string;
  winningNumber: string;
  numbers: number[];
  entries: number;
  spentPoints: number;
  wonEntries: number;
  wonPoints: number;
  lostEntries: number;
  lostPoints: number;
  netPoints: number;
};

export type UserGameStats = {
  spentPoints: number;
  wonPoints: number;
  lostPoints: number;
  netPoints: number;
};

let betIndexesReady: Promise<void> | null = null;
let resultIndexesReady: Promise<void> | null = null;

function getParts(date: Date, timeZone = env.drawTimezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
}

function offsetMinutes(date: Date, timeZone = env.drawTimezone) {
  const parts = getParts(date, timeZone);
  const utcLike = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((utcLike - date.getTime()) / 60000);
}

function zonedDateToUtc(year: number, month: number, day: number, hour: number, minute = 0) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offset = offsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function getRoundForSettings(settings: Pick<GameSettingsDocument, "durationMinutes">, now = new Date()) {
  const parts = getParts(now);
  const startMinute = Math.floor(parts.minute / settings.durationMinutes) * settings.durationMinutes;
  const start = zonedDateToUtc(parts.year, parts.month, parts.day, parts.hour, startMinute);
  const end = addMinutes(start, settings.durationMinutes);
  const roundId = `${parts.year}${String(parts.month).padStart(2, "0")}${String(parts.day).padStart(2, "0")}-${String(
    parts.hour
  ).padStart(2, "0")}${String(startMinute).padStart(2, "0")}`;
  return { roundId, start, end };
}

export async function getRound(now = new Date()) {
  return getRoundForSettings(await getGameSettings(), now);
}

function getPreviousRoundForSettings(settings: Pick<GameSettingsDocument, "durationMinutes">, now = new Date()) {
  return getRoundForSettings(settings, addMinutes(now, -settings.durationMinutes));
}

export async function betsCollection() {
  const db = await getDb();
  const collection = db.collection<BetDocument>("bets");
  if (!betIndexesReady) {
    betIndexesReady = Promise.all([
      collection.createIndex({ id: 1 }, { unique: true }),
      collection.createIndex({ roundId: 1, number: 1 }),
      collection.createIndex({ userId: 1, roundId: 1 })
    ]).then(() => undefined);
  }
  await betIndexesReady;
  return collection;
}

export async function gameResultsCollection() {
  const db = await getDb();
  const collection = db.collection<ResultDocument>("results");
  if (!resultIndexesReady) {
    resultIndexesReady = Promise.all([
      collection.createIndex({ gameId: 1, drawNumber: 1 }, { unique: true }),
      collection.createIndex({ drawTime: -1 })
    ]).then(() => undefined);
  }
  await resultIndexesReady;
  return collection;
}

function serializeBet(doc: WithId<BetDocument> | BetDocument): Bet {
  return {
    id: doc.id,
    roundId: doc.roundId,
    userId: doc.userId,
    username: doc.username,
    number: doc.number,
    points: doc.points,
    createdAt: doc.createdAt.toISOString()
  };
}

export function serializeResult(doc: WithId<ResultDocument> | ResultDocument): Result {
  return {
    id: doc.id,
    gameId: doc.gameId,
    gameName: doc.gameName,
    drawNumber: doc.drawNumber,
    winningNumber: doc.winningNumber,
    drawTime: doc.drawTime.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    totalBetPoints: doc.totalBetPoints,
    winnerCount: doc.winnerCount,
    paidPoints: doc.paidPoints,
    numberTotals: doc.numberTotals,
    winners: doc.winners || [],
    losses: doc.losses || []
  };
}

function emptyTotals() {
  return Object.fromEntries(Array.from({ length: MAX_NUMBER }, (_, index) => [String(index + 1), 0]));
}

export async function getNumberTotals(roundId: string) {
  const totals = emptyTotals();
  const collection = await betsCollection();
  const grouped = await collection
    .aggregate<{ _id: number; total: number; count: number }>([
      { $match: { roundId } },
      { $group: { _id: "$number", total: { $sum: "$points" }, count: { $sum: 1 } } }
    ])
    .toArray();
  for (const row of grouped) totals[String(row._id)] = row.total;
  return totals;
}

function chooseWinningNumber(totals: Record<string, number>) {
  const allNumbers = Array.from({ length: MAX_NUMBER }, (_, index) => {
    const number = index + 1;
    return { number, total: totals[String(number)] || 0 };
  });
  const minimumTotal = Math.min(...allNumbers.map((item) => item.total));
  const tied = allNumbers.filter((item) => item.total === minimumTotal);
  return tied[randomInt(tied.length)].number;
}

export async function placeBets(user: UserDocument, numbers: number[]) {
  const settings = await getGameSettings();
  if (!settings.active) throw new Error("Game stopped");
  const now = new Date();
  const round = getRoundForSettings(settings, now);
  if (round.end.getTime() - now.getTime() <= ENTRY_LOCK_SECONDS * 1000) {
    throw new Error("Entry closed for last 30 seconds");
  }
  const cleanNumbers = numbers.filter((number) => Number.isInteger(number) && number >= MIN_NUMBER && number <= MAX_NUMBER);
  if (!cleanNumbers.length) throw new Error("Select at least one number");
  const totalCost = cleanNumbers.length * ENTRY_POINTS;
  const userCollection = await usersCollection();
  const updated = await userCollection.findOneAndUpdate(
    { id: user.id, active: true, points: { $gte: totalCost } },
    { $inc: { points: -totalCost }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!updated) throw new Error("Not enough balance");

  const docs = cleanNumbers.map((number) => ({
    id: randomUUID(),
    roundId: round.roundId,
    userId: user.id,
    username: user.username,
    number,
    points: ENTRY_POINTS,
    createdAt: now
  }));
  const collection = await betsCollection();
  await collection.insertMany(docs);
  return { user: updated, bets: docs.map(serializeBet) };
}

export async function settlePreviousRound(now = new Date()) {
  const settings = await getGameSettings();
  const previous = getPreviousRoundForSettings(settings, now);
  const results = await gameResultsCollection();
  const existing = await results.findOne({ gameId: GAME_ID, drawNumber: previous.roundId });
  if (existing) return serializeResult(existing);

  const totals = await getNumberTotals(previous.roundId);
  const winningNumber = chooseWinningNumber(totals);
  const betCollection = await betsCollection();
  const allBets = await betCollection.find({ roundId: previous.roundId }).toArray();
  const winningBets = winningNumber
    ? allBets.filter((bet) => bet.number === winningNumber)
    : [];
  const losingBets = winningNumber ? allBets.filter((bet) => bet.number !== winningNumber) : allBets;
  const totalBetPoints = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const paidPoints = winningBets.length * WIN_POINTS;
  const winners = Object.values(
    winningBets.reduce<Record<string, { userId: string; username: string; entries: number; paidPoints: number }>>((map, bet) => {
      const current = map[bet.userId] || { userId: bet.userId, username: bet.username, entries: 0, paidPoints: 0 };
      current.entries += 1;
      current.paidPoints += WIN_POINTS;
      map[bet.userId] = current;
      return map;
    }, {})
  );
  const userCollection = await usersCollection();
  if (winningBets.length) {
    await Promise.all(
      winningBets.map((bet) =>
        userCollection.updateOne({ id: bet.userId }, { $inc: { points: WIN_POINTS }, $set: { updatedAt: new Date() } })
      )
    );
  }
  const betUsers = allBets.length
    ? await userCollection.find({ id: { $in: Array.from(new Set(allBets.map((bet) => bet.userId))) } }).toArray()
    : [];
  const userMap = new Map(betUsers.map((betUser) => [betUser.id, betUser]));
  const creatorIds = Array.from(new Set(betUsers.map((betUser) => betUser.createdBy).filter(Boolean))) as string[];
  const creators = creatorIds.length ? await userCollection.find({ id: { $in: creatorIds } }).toArray() : [];
  const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));
  const lossMap = new Map<string, { userId: string; username: string; adminId: string; adminUsername: string; lostPoints: number }>();
  for (const bet of losingBets) {
    const loser = userMap.get(bet.userId);
    const adminId = loser?.createdBy;
    const admin = adminId ? creatorMap.get(adminId) : null;
    if (!loser || !adminId || !admin) continue;
    const key = `${loser.id}:${adminId}`;
    const current = lossMap.get(key) || {
      userId: loser.id,
      username: loser.username,
      adminId,
      adminUsername: admin.username,
      lostPoints: 0
    };
    current.lostPoints += bet.points;
    lossMap.set(key, current);
  }
  const losses = Array.from(lossMap.values());
  if (losses.length) {
    const transactions = await pointTransactionsCollection();
    await Promise.all([
      ...losses.map((loss) =>
        userCollection.updateOne({ id: loss.adminId }, { $inc: { points: loss.lostPoints }, $set: { updatedAt: new Date() } })
      ),
      transactions.insertMany(
        losses.map((loss) => ({
          id: randomUUID(),
          actorId: loss.userId,
          actorUsername: loss.username,
          targetId: loss.adminId,
          targetUsername: loss.adminUsername,
          amount: loss.lostPoints,
          type: "loss" as const,
          roundId: previous.roundId,
          createdAt: new Date()
        }))
      )
    ]);
  }

  const doc: ResultDocument = {
    id: randomUUID(),
    gameId: GAME_ID,
    gameName: GAME_NAME,
    drawNumber: previous.roundId,
    winningNumber: winningNumber ? String(winningNumber) : "-",
    drawTime: previous.end,
    createdAt: new Date(),
    totalBetPoints,
    winnerCount: winningBets.length,
    paidPoints,
    numberTotals: totals,
    winners,
    losses
  };
  await results.insertOne(doc);
  return serializeResult(doc);
}

export async function listGameResults(limit = 20) {
  const collection = await gameResultsCollection();
  const docs = await collection.find({ gameId: GAME_ID }).sort({ drawTime: -1 }).limit(limit).toArray();
  return docs.map(serializeResult);
}

export async function listBets(filter: Filter<BetDocument> = {}, limit = 200) {
  const collection = await betsCollection();
  const docs = await collection.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map(serializeBet);
}

export async function getUserGameHistory(userId: string, limit = 100): Promise<UserGameHistoryItem[]> {
  const betCollection = await betsCollection();
  const bets = await betCollection.find({ userId }).sort({ createdAt: -1 }).limit(1000).toArray();
  const grouped = new Map<string, BetDocument[]>();
  for (const bet of bets) {
    grouped.set(bet.roundId, [...(grouped.get(bet.roundId) || []), bet]);
  }
  const roundIds = Array.from(grouped.keys());
  if (!roundIds.length) return [];

  const resultCollection = await gameResultsCollection();
  const results = await resultCollection
    .find({ gameId: GAME_ID, drawNumber: { $in: roundIds } })
    .sort({ drawTime: -1 })
    .limit(limit)
    .toArray();

  return results.map((result) => {
    const roundBets = grouped.get(result.drawNumber) || [];
    const winningNumber = Number(result.winningNumber);
    const wonEntries = Number.isInteger(winningNumber) ? roundBets.filter((bet) => bet.number === winningNumber).length : 0;
    const entries = roundBets.length;
    const spentPoints = roundBets.reduce((sum, bet) => sum + bet.points, 0);
    const wonPoints = wonEntries * WIN_POINTS;
    const lostEntries = entries - wonEntries;
    const lostPoints = lostEntries * ENTRY_POINTS;
    return {
      roundId: result.drawNumber,
      drawTime: result.drawTime.toISOString(),
      winningNumber: result.winningNumber,
      numbers: roundBets.map((bet) => bet.number),
      entries,
      spentPoints,
      wonEntries,
      wonPoints,
      lostEntries,
      lostPoints,
      netPoints: wonPoints - spentPoints
    };
  });
}

export async function getUsersGameStats(userIds: string[]): Promise<Map<string, UserGameStats>> {
  const stats = new Map<string, UserGameStats>();
  const uniqueUserIds = Array.from(new Set(userIds));
  for (const userId of uniqueUserIds) {
    stats.set(userId, { spentPoints: 0, wonPoints: 0, lostPoints: 0, netPoints: 0 });
  }
  if (!uniqueUserIds.length) return stats;

  const betCollection = await betsCollection();
  const bets = await betCollection.find({ userId: { $in: uniqueUserIds } }).toArray();
  const roundIds = Array.from(new Set(bets.map((bet) => bet.roundId)));
  if (!roundIds.length) return stats;

  const resultCollection = await gameResultsCollection();
  const results = await resultCollection.find({ gameId: GAME_ID, drawNumber: { $in: roundIds } }).toArray();
  const winningByRound = new Map(results.map((result) => [result.drawNumber, Number(result.winningNumber)]));

  for (const bet of bets) {
    const winningNumber = winningByRound.get(bet.roundId);
    if (winningNumber === undefined) continue;
    const current = stats.get(bet.userId) || { spentPoints: 0, wonPoints: 0, lostPoints: 0, netPoints: 0 };
    current.spentPoints += bet.points;
    if (Number.isInteger(winningNumber) && bet.number === winningNumber) current.wonPoints += WIN_POINTS;
    else current.lostPoints += bet.points;
    current.netPoints = current.wonPoints - current.spentPoints;
    stats.set(bet.userId, current);
  }

  return stats;
}

export async function getGameStatus(user?: UserDocument | null): Promise<GameStatus> {
  await settlePreviousRound();
  const settings = await getGameSettings();
  const round = getRoundForSettings(settings);
  const [totals, recent, myBets] = await Promise.all([
    getNumberTotals(round.roundId),
    listGameResults(20),
    user ? listBets({ userId: user.id, roundId: round.roundId }, 100) : Promise.resolve([])
  ]);

  return {
    game: {
      id: GAME_ID,
      name: GAME_NAME,
      minNumber: MIN_NUMBER,
      maxNumber: MAX_NUMBER,
      entryPoints: ENTRY_POINTS,
      winPoints: WIN_POINTS,
      durationMinutes: settings.durationMinutes,
      active: settings.active,
      entryLockSeconds: ENTRY_LOCK_SECONDS
    },
    roundId: round.roundId,
    roundStart: round.start.toISOString(),
    nextDrawTime: round.end.toISOString(),
    entryClosesAt: new Date(round.end.getTime() - ENTRY_LOCK_SECONDS * 1000).toISOString(),
    serverTime: new Date().toISOString(),
    numberTotals: totals,
    recent,
    myBets
  };
}

export function serializeGameStatus(status: GameStatus, showPoints: boolean): GameStatus {
  if (showPoints) return status;
  return {
    ...status,
    game: {
      id: status.game.id,
      name: status.game.name,
      minNumber: status.game.minNumber,
      maxNumber: status.game.maxNumber,
      durationMinutes: status.game.durationMinutes,
      active: status.game.active,
      entryLockSeconds: status.game.entryLockSeconds
    },
    numberTotals: Object.fromEntries(Object.keys(status.numberTotals).map((number) => [number, 0])),
    recent: status.recent.map((result) => ({
      id: result.id,
      gameId: result.gameId,
      gameName: result.gameName,
      drawNumber: result.drawNumber,
      winningNumber: result.winningNumber,
      drawTime: result.drawTime,
      createdAt: result.createdAt,
      winners: (result.winners || []).map((winner) => ({
        userId: winner.userId,
        username: winner.username,
        entries: winner.entries
      })),
      losses: []
    })),
    myBets: status.myBets.map((bet) => ({
      id: bet.id,
      roundId: bet.roundId,
      userId: bet.userId,
      username: bet.username,
      number: bet.number,
      createdAt: bet.createdAt
    }))
  };
}

export async function listUsers() {
  await import("./admin-auth").then((mod) => mod.ensureSuperAdmin());
  const collection = await usersCollection();
  const docs = await collection.find({}).sort({ role: 1, username: 1 }).toArray();
  return docs;
}
