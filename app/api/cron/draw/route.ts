import { NextRequest, NextResponse } from "next/server";
import { ensureDueDraws } from "@/lib/draw";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (env.cronSecret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const created = await ensureDueDraws();
  return NextResponse.json({ ok: true, createdCount: created.length, created });
}
