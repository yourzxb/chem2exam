import { NextResponse } from "next/server";
import { setSessionCookie } from "@/server/auth/session";
import { loginUser } from "@/server/repositories/user-repository";

export async function POST(request: Request) {
  const payload = (await request.json()) as { username?: string; password?: string };
  if (!payload.username || !payload.password) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const user = await loginUser(payload.username, payload.password);
    const response = NextResponse.json({ user });
    setSessionCookie(response, user);
    return response;
  } catch {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }
}
