import { NextRequest, NextResponse } from "next/server";
import { pointTransactionsCollection, requireRole, usersCollection } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;
  const actor = await requireRole(request, ["super_admin"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminId = request.nextUrl.searchParams.get("adminId");
  if (!adminId) return NextResponse.json({ error: "Admin id required" }, { status: 400 });

  const userCollection = await usersCollection();
  const admin = await userCollection.findOne({ id: adminId, role: { $in: ["admin", "sub_admin"] } });
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  const createdUsers = await userCollection.find({ createdBy: admin.id, role: "user" }).sort({ username: 1 }).toArray();
  const transactions = await pointTransactionsCollection();
  const adminTransactions = await transactions
    .find({ $or: [{ actorId: admin.id }, { targetId: admin.id }] })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const given = adminTransactions.filter((item) => item.actorId === admin.id && item.type === "give").reduce((sum, item) => sum + item.amount, 0);
  const taken = adminTransactions.filter((item) => item.actorId === admin.id && item.type === "take").reduce((sum, item) => sum + item.amount, 0);
  const lossReceived = adminTransactions
    .filter((item) => item.targetId === admin.id && item.type === "loss")
    .reduce((sum, item) => sum + item.amount, 0);

  return NextResponse.json({
    admin: {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      points: admin.points,
      active: admin.active,
      createdAt: admin.createdAt.toISOString()
    },
    summary: {
      createdUsers: createdUsers.length,
      userCurrentPoints: createdUsers.reduce((sum, user) => sum + user.points, 0),
      given,
      taken,
      lossReceived
    },
    users: createdUsers.map((user) => ({
      id: user.id,
      username: user.username,
      points: user.points,
      active: user.active,
      createdAt: user.createdAt.toISOString()
    })),
    transactions: adminTransactions.map((item) => ({
      id: item.id,
      type: item.type,
      actorUsername: item.actorUsername,
      targetUsername: item.targetUsername,
      amount: item.amount,
      roundId: item.roundId,
      createdAt: item.createdAt.toISOString()
    }))
  });
}
