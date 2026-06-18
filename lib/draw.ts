import { randomInt, randomUUID } from "crypto";
import { MongoServerError } from "mongodb";
import { env } from "./env";
import {
  DEFAULT_GAME_ID,
  DEFAULT_MAX_NUMBER,
  DEFAULT_MIN_NUMBER,
  getGameById,
  listGames,
  serializeGame,
  type GameDocument
} from "./games";
import { logger } from "./logger";
import { resultsCollection, serializeResult } from "./results";
import type { CurrentDrawStatus, Result } from "@/types/result";

export const MIN_WINNING_NUMBER = DEFAULT_MIN_NUMBER;
export const MAX_WINNING_NUMBER = DEFAULT_MAX_NUMBER;

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

function addDays(parts: { year: number; month: number; day: number }, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12));
  const local = getParts(date);
  return { year: local.year, month: local.month, day: local.day };
}

export function makeDrawNumber(drawTime: Date) {
  const parts = getParts(drawTime);
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");
  return `${parts.year}${String(parts.month).padStart(2, "0")}${String(parts.day).padStart(2, "0")}-${hour}${minute}`;
}

export function generateWinningNumber(minNumber = MIN_WINNING_NUMBER, maxNumber = MAX_WINNING_NUMBER) {
  return String(randomInt(minNumber, maxNumber + 1));
}

function parseDrawTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

export function getDrawSlotsForLocalDay(date = new Date(), drawTimes: string[]) {
  const parts = getParts(date);
  return drawTimes.map((time) => {
    const { hour, minute } = parseDrawTime(time);
    return zonedDateToUtc(parts.year, parts.month, parts.day, hour, minute);
  });
}

export function getNextDrawTimeForGame(game: GameDocument, now = new Date()) {
  const { drawTimes } = game;
  const parts = getParts(now);
  for (const time of drawTimes) {
    const { hour, minute } = parseDrawTime(time);
    const slot = zonedDateToUtc(parts.year, parts.month, parts.day, hour, minute);
    if (slot.getTime() > now.getTime()) return slot;
  }
  const tomorrow = addDays(parts, 1);
  const firstTime = parseDrawTime(drawTimes[0]);
  return zonedDateToUtc(tomorrow.year, tomorrow.month, tomorrow.day, firstTime.hour, firstTime.minute);
}

export async function getNextDrawTime(now = new Date(), gameId = DEFAULT_GAME_ID) {
  const game = await getGameById(gameId);
  if (!game) throw new Error("Game not found");
  return getNextDrawTimeForGame(game, now);
}

export async function createResultForDraw(
  drawTime: Date,
  winningNumber?: string,
  gameId = DEFAULT_GAME_ID
): Promise<Result> {
  const game = await getGameById(gameId);
  if (!game) throw new Error("Game not found");
  const collection = await resultsCollection();
  const drawNumber = makeDrawNumber(drawTime);
  const now = new Date();
  const doc = {
    id: randomUUID(),
    gameId: game.id,
    gameName: game.name,
    drawNumber,
    winningNumber: winningNumber || generateWinningNumber(game.minNumber, game.maxNumber),
    drawTime,
    createdAt: now
  };

  try {
    await collection.insertOne(doc);
    logger.info("draw.result.created", { gameId: game.id, drawNumber, drawTime: drawTime.toISOString() });
    return serializeResult(doc);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new Error(`Result already exists for ${game.name} draw ${drawNumber}`);
    }
    throw error;
  }
}

export async function ensureDueDraws(now = new Date()) {
  const created: Result[] = [];
  const games = await listGames(false);
  for (const game of games) {
    const today = getDrawSlotsForLocalDay(now, game.drawTimes);
    const yesterdayParts = addDays(getParts(now), -1);
    const yesterday = game.drawTimes.map((time) => {
      const { hour, minute } = parseDrawTime(time);
      return zonedDateToUtc(yesterdayParts.year, yesterdayParts.month, yesterdayParts.day, hour, minute);
    });
    const dueSlots = [...yesterday, ...today].filter((slot) => slot.getTime() <= now.getTime());
    for (const slot of dueSlots) {
      const drawNumber = makeDrawNumber(slot);
      const collection = await resultsCollection();
      const exists = await collection.findOne({ gameId: game.id, drawNumber });
      if (!exists) {
        try {
          created.push(await createResultForDraw(slot, undefined, game.id));
        } catch (error) {
          logger.warn("draw.result.create_skipped", {
            gameId: game.id,
            drawNumber,
            reason: error instanceof Error ? error.message : "unknown"
          });
        }
      }
    }
  }
  return created;
}

export async function getCurrentStatus(): Promise<CurrentDrawStatus> {
  await ensureDueDraws();
  const games = await listGames(false);
  const collection = await resultsCollection();
  const defaultGame = games.find((game) => game.id === DEFAULT_GAME_ID) || games[0];
  const gameStatuses = await Promise.all(
    games.map(async (game) => {
      const [latestDoc] = await collection.find({ gameId: game.id }).sort({ drawTime: -1 }).limit(1).toArray();
      const nextDrawTime = getNextDrawTimeForGame(game);
      return {
        game: serializeGame(game),
        latest: latestDoc ? serializeResult(latestDoc) : null,
        nextDrawTime: nextDrawTime.toISOString(),
        nextDrawNumber: makeDrawNumber(nextDrawTime),
        schedule: game.drawTimes
      };
    })
  );
  const defaultStatus = gameStatuses.find((status) => status.game.id === defaultGame.id) || gameStatuses[0];
  const docs = await collection.find({ gameId: defaultGame.id }).sort({ drawTime: -1 }).limit(20).toArray();
  const recent = docs.map(serializeResult);
  return {
    latest: recent[0] || null,
    recent,
    nextDrawTime: defaultStatus.nextDrawTime,
    nextDrawNumber: defaultStatus.nextDrawNumber,
    serverTime: new Date().toISOString(),
    schedule: defaultGame.drawTimes,
    game: serializeGame(defaultGame),
    games: gameStatuses
  };
}
