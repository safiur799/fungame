import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser, serializeUser } from "@/lib/admin-auth";
import { getGameStatus, placeBets, serializeGameStatus } from "@/lib/hourly-game";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  numbers: z.array(z.coerce.number().int().min(1).max(12)).min(1).max(200)
});

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 60, 60_000);
  if (limited) return limited;
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    const result = await placeBets(user, body.numbers);
    const showPoints = result.user.role === "super_admin";
    const status = serializeGameStatus(await getGameStatus(result.user), showPoints);
    const bets = showPoints
      ? result.bets
      : result.bets.map((bet) => ({
          id: bet.id,
          roundId: bet.roundId,
          userId: bet.userId,
          username: bet.username,
          number: bet.number,
          createdAt: bet.createdAt
        }));
    return NextResponse.json({ ok: true, user: serializeUser(result.user, true), bets, status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Select valid numbers 1-12" }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to place bet" }, { status: 400 });
  }
}
