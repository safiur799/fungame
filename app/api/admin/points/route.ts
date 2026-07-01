import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  canManagePoints,
  canManageUser,
  pointTransactionsCollection,
  requireRole,
  serializeUser,
  usersCollection
} from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  userId: z.string().min(1),
  points: z.coerce.number().int().min(1).max(1_000_000),
  action: z.enum(["give", "take"]).default("give")
});

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 50, 60_000);
  if (limited) return limited;
  const actor = await requireRole(request, ["super_admin", "admin", "sub_admin"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    const collection = await usersCollection();
    const target = await collection.findOne({ id: body.userId });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!canManagePoints(actor.role, target.role) || !canManageUser(actor, target)) {
      return NextResponse.json({ error: "Point transfer not allowed" }, { status: 403 });
    }

    if (body.action === "give" && actor.role !== "super_admin") {
      const charged = await collection.findOneAndUpdate(
        { id: actor.id, points: { $gte: body.points } },
        { $inc: { points: -body.points }, $set: { updatedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (!charged) return NextResponse.json({ error: "Not enough admin points" }, { status: 400 });
    }

    if (body.action === "take") {
      const debited = await collection.findOneAndUpdate(
        { id: target.id, points: { $gte: body.points } },
        { $inc: { points: -body.points }, $set: { updatedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (!debited) return NextResponse.json({ error: "User does not have enough points" }, { status: 400 });
      if (actor.role !== "super_admin") {
        await collection.updateOne({ id: actor.id }, { $inc: { points: body.points }, $set: { updatedAt: new Date() } });
      }
      const transactions = await pointTransactionsCollection();
      await transactions.insertOne({
        id: randomUUID(),
        actorId: actor.id,
        actorUsername: actor.username,
        targetId: target.id,
        targetUsername: target.username,
        amount: body.points,
        type: "take",
        createdAt: new Date()
      });
      return NextResponse.json({ user: serializeUser(debited, true) });
    }

    const updated = await collection.findOneAndUpdate(
      { id: target.id },
      { $inc: { points: body.points }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const transactions = await pointTransactionsCollection();
    await transactions.insertOne({
      id: randomUUID(),
      actorId: actor.id,
      actorUsername: actor.username,
      targetId: target.id,
      targetUsername: target.username,
      amount: body.points,
      type: "give",
      createdAt: new Date()
    });
    return NextResponse.json({ user: serializeUser(updated, true) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid point amount", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to add points" }, { status: 500 });
  }
}
