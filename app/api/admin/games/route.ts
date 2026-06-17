import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { DEFAULT_GAME_ID, createGame, listGames, removeGame, serializeGame, updateGame } from "@/lib/games";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const gameBaseSchema = z
  .object({
    name: z.string().min(2).max(80),
    minNumber: z.coerce.number().int().min(0),
    maxNumber: z.coerce.number().int().min(1),
    drawTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1).max(24),
    active: z.boolean().default(true)
  })
  .refine((value) => value.maxNumber > value.minNumber, {
    path: ["maxNumber"],
    message: "Max number must be greater than min number"
  });

const gameSchema = gameBaseSchema;
const updateGameSchema = gameBaseSchema.and(z.object({ id: z.string().min(1) }));

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;

  const games = await listGames(true);
  return NextResponse.json({ games: games.map(serializeGame) });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 30, 60_000);
  if (limited) return limited;

  try {
    const body = gameSchema.parse(await request.json());
    const game = await createGame(body);
    logger.info("admin.game.created", { id: game.id, name: game.name });
    return NextResponse.json(serializeGame(game), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid game details", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create game" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 30, 60_000);
  if (limited) return limited;

  try {
    const body = updateGameSchema.parse(await request.json());
    const game = await updateGame(body.id, body);
    if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    logger.info("admin.game.updated", { id: game.id, name: game.name });
    return NextResponse.json(serializeGame(game));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid game details", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update game" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 30, 60_000);
  if (limited) return limited;

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Game id is required" }, { status: 400 });
    if (id === DEFAULT_GAME_ID) {
      return NextResponse.json({ error: "Default game cannot be removed" }, { status: 400 });
    }
    const game = await removeGame(id);
    if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    logger.warn("admin.game.removed", { id, name: game.name });
    return NextResponse.json({ ok: true, game: serializeGame(game) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to remove game" }, { status: 400 });
  }
}
