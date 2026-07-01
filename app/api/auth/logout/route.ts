import { NextResponse } from "next/server";
import { authCookie } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookie.name, "", { path: "/", maxAge: 0 });
  return response;
}
