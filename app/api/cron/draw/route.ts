import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { settlePreviousRound } from "@/lib/hourly-game";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (env.cronSecret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await settlePreviousRound();
  return NextResponse.json({ ok: true, result });
}
