import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDueDraws } from "@/lib/draw";
import { listResults } from "@/lib/results";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  drawNumber: z.string().max(32).optional().or(z.literal("")),
  gameId: z.string().max(80).optional().or(z.literal(""))
});

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;

  try {
    await ensureDueDraws();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = querySchema.parse(params);
    const results = await listResults({
      page: parsed.page,
      pageSize: parsed.pageSize,
      date: parsed.date || undefined,
      drawNumber: parsed.drawNumber || undefined,
      gameId: parsed.gameId || undefined
    });
    return NextResponse.json(results);
  } catch (error) {
    logger.error("api.results.failed", { error: error instanceof Error ? error.message : "unknown" });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid result filters", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to load results" }, { status: 500 });
  }
}
