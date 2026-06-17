import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb();
    return NextResponse.json({ ok: true, service: "daily-number-draw", time: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Health check failed" },
      { status: 503 }
    );
  }
}
