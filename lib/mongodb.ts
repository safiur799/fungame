import { MongoClient } from "mongodb";
import { env } from "./env";

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

const MONGODB_TIMEOUT_MS = 20_000;

function getClientPromise() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!global.mongoClientPromise) {
    const client = new MongoClient(env.mongodbUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: MONGODB_TIMEOUT_MS,
      connectTimeoutMS: MONGODB_TIMEOUT_MS
    });
    global.mongoClientPromise = client.connect().catch((error) => {
      global.mongoClientPromise = undefined;
      throw error;
    });
  }

  return global.mongoClientPromise;
}

export async function getDb() {
  const connectedClient = await getClientPromise();
  return connectedClient.db(env.mongodbDb);
}
