import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  createResultForDraw,
  ensureDueDraws,
  generateWinningNumber,
  makeDrawNumber
} from "@/lib/draw";
import { DEFAULT_GAME_ID, getGameById } from "@/lib/games";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { listResults, resultsCollection, serializeResult } from "@/lib/results";

export const dynamic = "force-dynamic";

const resultBaseSchema = z.object({
  gameId: z.string().min(1).default(DEFAULT_GAME_ID),
  drawTime: z.string().datetime(),
  winningNumber: z.string().optional().or(z.literal(""))
});

const createSchema = resultBaseSchema;

const updateSchema = resultBaseSchema.extend({
  id: z.string().min(1)
});

function isValidNumberString(value: string) {
  return /^\d{1,8}$/.test(value);
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 120, 60_000);
  if (limited) return limited;

  try {
    await ensureDueDraws();
    const page = Number(request.nextUrl.searchParams.get("page") || "1");
    const gameId = request.nextUrl.searchParams.get("gameId") || undefined;
    return NextResponse.json(await listResults({ page, pageSize: 50, gameId }));
  } catch (error) {
    logger.error("admin.results.list_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Unable to load admin results" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 30, 60_000);
  if (limited) return limited;

  try {
    const body = createSchema.parse(await request.json());
    const game = await getGameById(body.gameId);
    if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    if (body.winningNumber) {
      if (!isValidNumberString(body.winningNumber)) {
        return NextResponse.json({ error: "Winning number must be numeric" }, { status: 400 });
      }
        const numeric = Number(body.winningNumber);
        if (numeric < game.minNumber || numeric > game.maxNumber) {
        return NextResponse.json(
          { error: `Winning number must be from ${game.minNumber} to ${game.maxNumber}` },
          { status: 400 }
        );
        }
    }
    const result = await createResultForDraw(new Date(body.drawTime), body.winningNumber || undefined, game.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("admin.results.create_failed", { error: error instanceof Error ? error.message : "unknown" });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid draw payload", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create result" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 30, 60_000);
  if (limited) return limited;

  try {
    const body = updateSchema.parse(await request.json());
    const game = await getGameById(body.gameId);
    if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    if (body.winningNumber) {
      if (!isValidNumberString(body.winningNumber)) {
        return NextResponse.json({ error: "Winning number must be numeric" }, { status: 400 });
      }
        const numeric = Number(body.winningNumber);
        if (numeric < game.minNumber || numeric > game.maxNumber) {
        return NextResponse.json(
          { error: `Winning number must be from ${game.minNumber} to ${game.maxNumber}` },
          { status: 400 }
        );
        }
    }
    const collection = await resultsCollection();
    const existing = await collection.findOne({ id: body.id });
    if (!existing) return NextResponse.json({ error: "Result not found" }, { status: 404 });

    const drawTime = new Date(body.drawTime);
    const drawNumber = makeDrawNumber(drawTime);
    const duplicate = await collection.findOne({ gameId: game.id, drawNumber, id: { $ne: body.id } });
    if (duplicate) {
      return NextResponse.json({ error: `Another result already exists for ${drawNumber}` }, { status: 400 });
    }

    const winningNumber = body.winningNumber || generateWinningNumber(game.minNumber, game.maxNumber);
    await collection.updateOne(
      { id: body.id },
      {
        $set: {
          gameId: game.id,
          gameName: game.name,
          drawNumber,
          drawTime,
          winningNumber
        }
      }
    );

    const updated = await collection.findOne({ id: body.id });
    if (!updated) return NextResponse.json({ error: "Result not found after update" }, { status: 404 });
    logger.info("admin.results.updated", { id: body.id, drawNumber });
    return NextResponse.json(serializeResult(updated));
  } catch (error) {
    logger.error("admin.results.update_failed", { error: error instanceof Error ? error.message : "unknown" });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid draw payload", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update result" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = rateLimit(request, 30, 60_000);
  if (limited) return limited;

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Result id is required" }, { status: 400 });
    const collection = await resultsCollection();
    const deleted = await collection.deleteOne({ id });
    if (!deleted.deletedCount) return NextResponse.json({ error: "Result not found" }, { status: 404 });
    logger.warn("admin.results.deleted", { id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("admin.results.delete_failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Unable to delete result" }, { status: 500 });
  }
}
