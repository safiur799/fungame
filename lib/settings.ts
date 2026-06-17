import { getDb } from "./mongodb";

export const DEFAULT_DRAW_TIMES = ["10:00", "14:00", "18:00", "22:00"];

export type DrawSettings = {
  id: "draw-settings";
  drawTimes: string[];
  updatedAt: Date;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeTimes(times: string[]) {
  const unique = Array.from(new Set(times.filter((time) => TIME_PATTERN.test(time))));
  return unique.sort((a, b) => a.localeCompare(b));
}

export async function settingsCollection() {
  const db = await getDb();
  return db.collection<DrawSettings>("settings");
}

export async function getDrawSettings() {
  const collection = await settingsCollection();
  const settings = await collection.findOne({ id: "draw-settings" });
  if (settings?.drawTimes.length) {
    return { ...settings, drawTimes: normalizeTimes(settings.drawTimes) };
  }

  const fallback = {
    id: "draw-settings" as const,
    drawTimes: DEFAULT_DRAW_TIMES,
    updatedAt: new Date()
  };
  await collection.updateOne({ id: "draw-settings" }, { $setOnInsert: fallback }, { upsert: true });
  return fallback;
}

export async function updateDrawTimes(drawTimes: string[]) {
  const normalized = normalizeTimes(drawTimes);
  if (!normalized.length) {
    throw new Error("At least one draw time is required");
  }

  const settings = {
    id: "draw-settings" as const,
    drawTimes: normalized,
    updatedAt: new Date()
  };
  const collection = await settingsCollection();
  await collection.updateOne({ id: "draw-settings" }, { $set: settings }, { upsert: true });
  return settings;
}
