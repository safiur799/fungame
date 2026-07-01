import { NextRequest, NextResponse } from "next/server";
import { listGameResults, settlePreviousRound } from "@/lib/hourly-game";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;
  await settlePreviousRound();
  return NextResponse.json({ items: await listGameResults(100), page: 1, pageSize: 100, total: 0, totalPages: 1 });
}
