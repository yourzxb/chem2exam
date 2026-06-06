import { NextResponse } from "next/server";
import { setSessionCookie } from "@/server/auth/session";
import { registerUser } from "@/server/repositories/user-repository";
import type { AppUser } from "@/server/repositories/user-repository";

export async function POST(request: Request) {
  const payload = (await request.json()) as { username?: string; password?: string; role?: AppUser["role"] };
  if (!payload.username || !payload.password || payload.password.length < 4) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const role = payload.role && ["student", "teacher", "admin"].includes(payload.role) ? payload.role : "student";

  try {
    const user = await registerUser(payload.username, payload.password, role);
    const response = NextResponse.json({ user });
    setSessionCookie(response, user);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_EXISTS") {
      return NextResponse.json({ error: "USERNAME_EXISTS" }, { status: 409 });
    }
    return NextResponse.json({ error: "REGISTER_FAILED" }, { status: 500 });
  }
}
