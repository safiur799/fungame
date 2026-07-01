import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/admin-auth";
import { getGameStatus, serializeGameStatus } from "@/lib/hourly-game";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;

  try {
    const user = await getRequestUser(request);
    return NextResponse.json(serializeGameStatus(await getGameStatus(user), user?.role === "super_admin"));
  } catch (error) {
    logger.error("api.status.failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Unable to load draw status" }, { status: 500 });
  }
}
