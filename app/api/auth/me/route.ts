import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, serializeUser } from "@/lib/admin-auth";
import { getGameStatus, serializeGameStatus } from "@/lib/hourly-game";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  const status = serializeGameStatus(await getGameStatus(user), user?.role === "super_admin");
  return NextResponse.json({ user: user ? serializeUser(user, true) : null, status });
}
