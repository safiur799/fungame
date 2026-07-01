import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  canManageUser,
  createUser,
  pointTransactionsCollection,
  requireRole,
  serializeUser,
  usersCollection
} from "@/lib/admin-auth";
import { getUsersGameStats } from "@/lib/hourly-game";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  username: z.string().min(3).max(80),
  password: z.string().min(4).max(200),
  role: z.enum(["admin", "sub_admin", "user"])
});

const updateSchema = z.object({
  userId: z.string().min(1),
  active: z.boolean()
});

export async function GET(request: NextRequest) {
  const actor = await requireRole(request, ["super_admin", "admin", "sub_admin"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collection = await usersCollection();
  const filter = actor.role === "super_admin" ? {} : { createdBy: actor.id, role: "user" as const };
  const users = await collection.find(filter).sort({ role: 1, username: 1 }).toArray();
  const gameStats = await getUsersGameStats(users.map((user) => user.id));
  const allUsers = await collection.find({}).project({ id: 1, username: 1 }).toArray();
  const creatorNames = new Map(allUsers.map((user) => [user.id, user.username]));
  const transactions = await pointTransactionsCollection();
  const totals = await transactions
    .aggregate<{ _id: { targetId: string; type: "give" | "take" }; total: number }>([
      { $match: { actorId: actor.id, type: { $in: ["give", "take"] } } },
      { $group: { _id: { targetId: "$targetId", type: "$type" }, total: { $sum: "$amount" } } }
    ])
    .toArray();
  const lossTotals = await transactions
    .aggregate<{ _id: string; total: number }>([
      { $match: { actorId: { $in: users.map((user) => user.id) }, type: "loss" } },
      { $group: { _id: "$actorId", total: { $sum: "$amount" } } }
    ])
    .toArray();
  const pointTotals = new Map<string, { give: number; take: number }>();
  for (const row of totals) {
    const current = pointTotals.get(row._id.targetId) || { give: 0, take: 0 };
    current[row._id.type] = row.total;
    pointTotals.set(row._id.targetId, current);
  }
  const lostPoints = new Map(lossTotals.map((row) => [row._id, row.total]));

  return NextResponse.json({
    users: users.map((user) => {
      const pointTotal = pointTotals.get(user.id);
      const gameStat = gameStats.get(user.id);
      return serializeUser(user, true, {
        createdByUsername: user.createdBy ? creatorNames.get(user.createdBy) : undefined,
        pointsGivenByActor: pointTotal?.give || 0,
        pointsTakenByActor: pointTotal?.take || 0,
        pointsLost: lostPoints.get(user.id) || gameStat?.lostPoints || 0,
        pointsWon: gameStat?.wonPoints || 0,
        gameProfit: gameStat?.netPoints || 0
      });
    }),
    actor: serializeUser(actor, true)
  });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 40, 60_000);
  if (limited) return limited;
  const actor = await requireRole(request, ["super_admin", "admin", "sub_admin"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await request.json());
    const user = await createUser({ ...body, createdBy: actor });
    return NextResponse.json({ user: serializeUser(user, true) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid user details", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create user" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const limited = rateLimit(request, 40, 60_000);
  if (limited) return limited;
  const actor = await requireRole(request, ["super_admin", "admin", "sub_admin"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = updateSchema.parse(await request.json());
    const collection = await usersCollection();
    const target = await collection.findOne({ id: body.userId });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!canManageUser(actor, target)) return NextResponse.json({ error: "User update not allowed" }, { status: 403 });

    const updated = await collection.findOneAndUpdate(
      { id: target.id },
      { $set: { active: body.active, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user: serializeUser(updated, true) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid user update", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to update user" }, { status: 500 });
  }
}
