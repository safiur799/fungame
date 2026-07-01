import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/admin-auth";
import { getGameSettings, updateGameSettings } from "@/lib/game-settings";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  durationMinutes: z.number().int().min(1).max(1440),
  active: z.boolean()
});

function serialize(settings: Awaited<ReturnType<typeof getGameSettings>>) {
  return {
    durationMinutes: settings.durationMinutes,
    active: settings.active,
    updatedAt: settings.updatedAt.toISOString()
  };
}

export async function GET(request: NextRequest) {
  const actor = await requireRole(request, ["super_admin"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;

  try {
    return NextResponse.json(serialize(await getGameSettings()));
  } catch (error) {
    logger.error("admin.game_settings.get_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Unable to load game settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const actor = await requireRole(request, ["super_admin"]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 30, 60_000);
  if (limited) return limited;

  try {
    const body = settingsSchema.parse(await request.json());
    const settings = await updateGameSettings(body);
    logger.info("admin.game_settings.updated", { actorId: actor.id, durationMinutes: settings.durationMinutes, active: settings.active });
    return NextResponse.json(serialize(settings));
  } catch (error) {
    logger.error("admin.game_settings.update_failed", { error: error instanceof Error ? error.message : "unknown" });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid game settings", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update game settings" },
      { status: 400 }
    );
  }
}
