import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, serializeUser } from "@/lib/admin-auth";
import { getUserGameHistory } from "@/lib/hourly-game";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const history = await getUserGameHistory(user.id, 100);
  return NextResponse.json({
    user: serializeUser(user, true),
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
