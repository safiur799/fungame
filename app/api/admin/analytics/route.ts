import { NextRequest, NextResponse } from "next/server";
import { pointTransactionsCollection, requireRole, usersCollection } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const actor = await requireRole(request, ["super_admin"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;

  const userCollection = await usersCollection();
  const transactionCollection = await pointTransactionsCollection();
  const users = await userCollection.find({}).sort({ role: 1, username: 1 }).toArray();
  const userNames = new Map(users.map((user) => [user.id, user.username]));
  const admins = users.filter((user) => user.role === "admin" || user.role === "sub_admin");
  const normalUsers = users.filter((user) => user.role === "user");
  const txTotals = await transactionCollection
    .aggregate<{ _id: { actorId: string; targetId: string; type: "give" | "take" | "loss" }; total: number }>([
      { $group: { _id: { actorId: "$actorId", targetId: "$targetId", type: "$type" }, total: { $sum: "$amount" } } }
    ])
    .toArray();

  const byKey = new Map(txTotals.map((row) => [`${row._id.actorId}:${row._id.targetId}:${row._id.type}`, row.total]));
  const sumActorType = (actorId: string, type: "give" | "take") =>
    txTotals.filter((row) => row._id.actorId === actorId && row._id.type === type).reduce((sum, row) => sum + row.total, 0);
  const sumTargetLoss = (targetId: string) =>
    txTotals.filter((row) => row._id.targetId === targetId && row._id.type === "loss").reduce((sum, row) => sum + row.total, 0);

  const adminAnalytics = admins.map((admin) => {
    const createdUsers = normalUsers.filter((user) => user.createdBy === admin.id);
    return {
      adminId: admin.id,
      adminUsername: admin.username,
      role: admin.role,
      points: admin.points,
      active: admin.active,
      createdUserCount: createdUsers.length,
      userCurrentPoints: createdUsers.reduce((sum, user) => sum + user.points, 0),
      givenToUsers: sumActorType(admin.id, "give"),
      takenFromUsers: sumActorType(admin.id, "take"),
      lossReceived: sumTargetLoss(admin.id),
      users: createdUsers.map((user) => ({
        userId: user.id,
        username: user.username,
        points: user.points,
        active: user.active,
        givenByAdmin: byKey.get(`${admin.id}:${user.id}:give`) || 0,
        takenByAdmin: byKey.get(`${admin.id}:${user.id}:take`) || 0,
        lostToAdmin: byKey.get(`${user.id}:${admin.id}:loss`) || 0
      }))
    };
  });

  const recentTransactions = await transactionCollection.find({}).sort({ createdAt: -1 }).limit(100).toArray();
  return NextResponse.json({
    summary: {
      admins: admins.length,
      users: normalUsers.length,
      userCurrentPoints: normalUsers.reduce((sum, user) => sum + user.points, 0),
      adminCurrentPoints: admins.reduce((sum, user) => sum + user.points, 0),
      totalGiven: txTotals.filter((row) => row._id.type === "give").reduce((sum, row) => sum + row.total, 0),
      totalTaken: txTotals.filter((row) => row._id.type === "take").reduce((sum, row) => sum + row.total, 0),
      totalLostToAdmins: txTotals.filter((row) => row._id.type === "loss").reduce((sum, row) => sum + row.total, 0)
    },
    adminAnalytics,
    creations: users
      .filter((user) => user.role !== "super_admin")
      .map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        points: user.points,
        active: user.active,
        createdBy: user.createdBy,
        createdByUsername: user.createdBy ? userNames.get(user.createdBy) || "-" : "-",
        createdAt: user.createdAt.toISOString()
      })),
    recentTransactions: recentTransactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      actorUsername: transaction.actorUsername,
      targetUsername: transaction.targetUsername,
      amount: transaction.amount,
      roundId: transaction.roundId,
      createdAt: transaction.createdAt.toISOString()
    }))
  });
}
