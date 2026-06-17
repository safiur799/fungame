import { randomUUID } from "crypto";
import { getDb } from "./mongodb";
import type { Game } from "@/types/result";

export const DEFAULT_GAME_ID = "main";
export const DEFAULT_DRAW_TIMES = ["10:00", "14:00", "18:00", "22:00"];

export type GameDocument = {
  id: string;
  name: string;
  minNumber: number;
  maxNumber: number;
  drawTimes: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

let indexesReady: Promise<void> | null = null;

function normalizeTimes(times: string[]) {
  const unique = Array.from(new Set(times.filter((time) => TIME_PATTERN.test(time))));
  return unique.sort((a, b) => a.localeCompare(b));
}

export function serializeGame(game: GameDocument): Game {
  return {
    id: game.id,
    name: game.name,
    minNumber: game.minNumber,
    maxNumber: game.maxNumber,
    drawTimes: game.drawTimes,
    active: game.active,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString()
  };
}

export async function gamesCollection() {
  const db = await getDb();
  const collection = db.collection<GameDocument>("games");
  if (!indexesReady) {
    indexesReady = Promise.all([
      collection.createIndex({ id: 1 }, { unique: true }),
      collection.createIndex({ active: 1, createdAt: 1 })
    ]).then(() => undefined);
  }
  await indexesReady;
  return collection;
}

export function makeDefaultGame(): GameDocument {
  const now = new Date();
  return {
    id: DEFAULT_GAME_ID,
    name: "Daily Number Draw",
    minNumber: 0,
    maxNumber: 10000,
    drawTimes: DEFAULT_DRAW_TIMES,
    active: true,
    createdAt: now,
    updatedAt: now
  };
}

export async function ensureDefaultGame() {
  const collection = await gamesCollection();
  const existing = await collection.findOne({ id: DEFAULT_GAME_ID });
  if (existing) return existing;
  const game = makeDefaultGame();
  await collection.updateOne({ id: DEFAULT_GAME_ID }, { $setOnInsert: game }, { upsert: true });
  return game;
}

export async function listGames(includeInactive = false) {
  await ensureDefaultGame();
  const collection = await gamesCollection();
  const filter = includeInactive ? {} : { active: true };
  return collection.find(filter).sort({ createdAt: 1 }).toArray();
}

export async function getGameById(gameId = DEFAULT_GAME_ID) {
  await ensureDefaultGame();
  const collection = await gamesCollection();
  return collection.findOne({ id: gameId });
}

export async function createGame(input: {
  name: string;
  minNumber: number;
  maxNumber: number;
  drawTimes: string[];
  active?: boolean;
}) {
  const now = new Date();
  const drawTimes = normalizeTimes(input.drawTimes);
  if (!drawTimes.length) throw new Error("At least one draw time is required");
  if (input.minNumber < 0 || input.maxNumber <= input.minNumber) throw new Error("Invalid number range");

  const game: GameDocument = {
    id: randomUUID(),
    name: input.name.trim(),
    minNumber: input.minNumber,
    maxNumber: input.maxNumber,
    drawTimes,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now
  };
  const collection = await gamesCollection();
  await collection.insertOne(game);
  return game;
}

export async function updateGame(
  id: string,
  input: {
    name: string;
    minNumber: number;
    maxNumber: number;
    drawTimes: string[];
    active: boolean;
  }
) {
  const drawTimes = normalizeTimes(input.drawTimes);
  if (!drawTimes.length) throw new Error("At least one draw time is required");
  if (input.minNumber < 0 || input.maxNumber <= input.minNumber) throw new Error("Invalid number range");

  const collection = await gamesCollection();
  await collection.updateOne(
    { id },
    {
      $set: {
        name: input.name.trim(),
        minNumber: input.minNumber,
        maxNumber: input.maxNumber,
        drawTimes,
        active: input.active,
        updatedAt: new Date()
      }
    }
  );
  return collection.findOne({ id });
}

export async function removeGame(id: string) {
  if (id === DEFAULT_GAME_ID) {
    throw new Error("Default game cannot be removed");
  }

  const collection = await gamesCollection();
  await collection.updateOne(
    { id },
    {
      $set: {
        active: false,
        updatedAt: new Date()
      }
    }
  );
  return collection.findOne({ id });
}
