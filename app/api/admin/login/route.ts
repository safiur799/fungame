import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminCookie, makeSessionCookie, verifyPassword } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 10, 60_000);
  if (limited) return limited;

  try {
    const body = schema.parse(await request.json());
    if (!verifyPassword(body.password)) {
      logger.warn("admin.login.denied");
      return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminCookie.name, makeSessionCookie(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: adminCookie.maxAge
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to sign in" }, { status: 500 });
  }
}
