import { Collection, Document, Filter, WithId } from "mongodb";
import { DEFAULT_GAME_ID } from "./games";
import { getDb } from "./mongodb";
import type { PaginatedResults, Result } from "@/types/result";

export type ResultDocument = {
  id: string;
  gameId: string;
  gameName: string;
  drawNumber: string;
  winningNumber: string;
  drawTime: Date;
  createdAt: Date;
};

let indexesReady: Promise<void> | null = null;

async function ensureIndexes(collection: Collection<ResultDocument>) {
  if (!indexesReady) {
    indexesReady = (async () => {
      await collection.updateMany(
        { gameId: { $exists: false } },
        { $set: { gameId: DEFAULT_GAME_ID, gameName: "Daily Number Draw" } }
      );
      const indexes = await collection.indexes();
      const oldUnique = indexes.find((index) => index.name === "drawNumber_1" && index.unique);
      if (oldUnique) {
        await collection.dropIndex("drawNumber_1");
      }
      await Promise.all([
        collection.createIndex({ gameId: 1, drawNumber: 1 }, { unique: true }),
        collection.createIndex({ drawTime: -1 }),
        collection.createIndex({ gameId: 1, drawTime: -1 }),
        collection.createIndex({ createdAt: -1 })
      ]);
    })();
  }
  return indexesReady;
}

export async function resultsCollection() {
  const db = await getDb();
  const collection = db.collection<ResultDocument>("results");
  await ensureIndexes(collection);
  return collection;
}

export function serializeResult(doc: WithId<ResultDocument> | ResultDocument): Result {
  return {
    id: doc.id,
    gameId: doc.gameId || DEFAULT_GAME_ID,
    gameName: doc.gameName || "Daily Number Draw",
    drawNumber: doc.drawNumber,
    winningNumber: doc.winningNumber,
    drawTime: doc.drawTime.toISOString(),
    createdAt: doc.createdAt.toISOString()
  };
}

export async function listResults(params: {
  page?: number;
  pageSize?: number;
  date?: string;
  drawNumber?: string;
  gameId?: string;
}): Promise<PaginatedResults> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const filter: Filter<ResultDocument> = {};

  if (params.gameId) {
    filter.gameId = params.gameId;
  }

  if (params.drawNumber) {
    filter.drawNumber = { $regex: params.drawNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } as Document;
  }

  if (params.date) {
    const start = new Date(`${params.date}T00:00:00.000Z`);
    const end = new Date(`${params.date}T23:59:59.999Z`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      filter.drawTime = { $gte: start, $lte: end };
    }
  }

  const collection = await resultsCollection();
  const [total, docs] = await Promise.all([
    collection.countDocuments(filter),
    collection
      .find(filter)
      .sort({ drawTime: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray()
  ]);

  return {
    items: docs.map(serializeResult),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getLatestResults(limit = 20, gameId?: string) {
  const collection = await resultsCollection();
  const docs = await collection.find(gameId ? { gameId } : {}).sort({ drawTime: -1 }).limit(limit).toArray();
  return docs.map(serializeResult);
}
