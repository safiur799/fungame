import { NextRequest, NextResponse } from "next/server";
import { getCurrentStatus } from "@/lib/draw";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;

  try {
    return NextResponse.json(await getCurrentStatus());
  } catch (error) {
    logger.error("api.status.failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Unable to load draw status" }, { status: 500 });
  }
}
