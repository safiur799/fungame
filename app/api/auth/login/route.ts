import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authCookie, serializeUser, verifyLogin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200)
});

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 20, 60_000);
  if (limited) return limited;

  try {
    const body = schema.parse(await request.json());
    const user = await verifyLogin(body.username, body.password);
    if (!user) return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    const response = NextResponse.json({ ok: true, user: serializeUser(user) });
    response.cookies.set(authCookie.name, authCookie.make(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: authCookie.maxAge
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to sign in" }, { status: 500 });
  }
}
