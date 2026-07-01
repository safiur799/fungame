import { getDb } from "./mongodb";

export const DEFAULT_GAME_DURATION_MINUTES = 5;
export const MIN_GAME_DURATION_MINUTES = 1;
export const MAX_GAME_DURATION_MINUTES = 1440;

export type GameSettingsDocument = {
  id: "game-settings";
  durationMinutes: number;
  active: boolean;
  updatedAt: Date;
};

export async function gameSettingsCollection() {
  const db = await getDb();
  return db.collection<GameSettingsDocument>("settings");
}

function normalizeDurationMinutes(value: number) {
  if (!Number.isInteger(value)) throw new Error("Duration must be whole minutes");
  if (value < MIN_GAME_DURATION_MINUTES || value > MAX_GAME_DURATION_MINUTES) {
    throw new Error(`Duration must be ${MIN_GAME_DURATION_MINUTES}-${MAX_GAME_DURATION_MINUTES} minutes`);
  }
  return value;
}

export async function getGameSettings() {
  const collection = await gameSettingsCollection();
  const existing = await collection.findOne({ id: "game-settings" });
  if (existing) {
    return {
      ...existing,
      durationMinutes: normalizeDurationMinutes(existing.durationMinutes || DEFAULT_GAME_DURATION_MINUTES),
      active: existing.active !== false
    };
  }

  const fallback: GameSettingsDocument = {
    id: "game-settings",
    durationMinutes: DEFAULT_GAME_DURATION_MINUTES,
    active: true,
    updatedAt: new Date()
  };
  await collection.updateOne({ id: "game-settings" }, { $setOnInsert: fallback }, { upsert: true });
  return fallback;
}

export async function updateGameSettings(input: { durationMinutes: number; active: boolean }) {
  const settings: GameSettingsDocument = {
    id: "game-settings",
    durationMinutes: normalizeDurationMinutes(input.durationMinutes),
    active: Boolean(input.active),
    updatedAt: new Date()
  };
  const collection = await gameSettingsCollection();
  await collection.updateOne({ id: "game-settings" }, { $set: settings }, { upsert: true });
  return settings;
}
