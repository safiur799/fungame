import { MongoClient } from "mongodb";
import { env } from "./env";

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!global.mongoClientPromise) {
    const client = new MongoClient(env.mongodbUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000
    });
    global.mongoClientPromise = client.connect();
  }

  return global.mongoClientPromise;
}

export async function getDb() {
  const connectedClient = await getClientPromise();
  return connectedClient.db(env.mongodbDb);
}
