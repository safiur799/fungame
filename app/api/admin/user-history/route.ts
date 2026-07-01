import { NextRequest, NextResponse } from "next/server";
import { canManageUser, requireRole, serializeUser, usersCollection } from "@/lib/admin-auth";
import { getUserGameHistory } from "@/lib/hourly-game";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;
  const actor = await requireRole(request, ["super_admin", "admin", "sub_admin"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "User id required" }, { status: 400 });

  const collection = await usersCollection();
  const target = await collection.findOne({ id: userId });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role !== "user" || !canManageUser(actor, target)) {
    return NextResponse.json({ error: "History not allowed" }, { status: 403 });
  }

  const history = await getUserGameHistory(target.id, 100);
  return NextResponse.json({
    user: serializeUser(target, true),
    summary: {
      games: history.length,
      spentPoints: history.reduce((sum, item) => sum + item.spentPoints, 0),
      wonPoints: history.reduce((sum, item) => sum + item.wonPoints, 0),
      lostPoints: history.reduce((sum, item) => sum + item.lostPoints, 0),
      netPoints: history.reduce((sum, item) => sum + item.netPoints, 0)
    },
    history
  });
}
