import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { getDrawSettings, updateDrawTimes } from "@/lib/settings";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  drawTimes: z
    .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/))
    .min(1)
    .max(24)
});

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;

  try {
    const settings = await getDrawSettings();
    return NextResponse.json({
      drawTimes: settings.drawTimes,
      updatedAt: settings.updatedAt.toISOString()
    });
  } catch (error) {
    logger.error("admin.settings.get_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Unable to load settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 30, 60_000);
  if (limited) return limited;

  try {
    const body = settingsSchema.parse(await request.json());
    const settings = await updateDrawTimes(body.drawTimes);
    logger.info("admin.settings.updated", { drawTimes: settings.drawTimes });
    return NextResponse.json({
      drawTimes: settings.drawTimes,
      updatedAt: settings.updatedAt.toISOString()
    });
  } catch (error) {
    logger.error("admin.settings.update_failed", { error: error instanceof Error ? error.message : "unknown" });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid draw times", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update settings" },
      { status: 400 }
    );
  }
}
