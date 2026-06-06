import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { hasDatabaseUrl } from "@/server/db/prisma";
import { organizationRepository } from "@/server/repositories/organization-repository";
import type { PublicUser } from "@/server/repositories/user-repository";

export async function requireReviewer(request: Request): Promise<
  | { ok: true; user: PublicUser }
  | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser(request);
  if (user && (user.role === "teacher" || user.role === "admin")) {
    return { ok: true, user };
  }

  if (!hasDatabaseUrl()) {
    return {
      ok: true,
      user: {
        id: "local_reviewer",
        username: "local_reviewer",
        displayName: "本地审核员",
        role: "admin"
      }
    };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "REVIEW_PERMISSION_REQUIRED" }, { status: 403 })
  };
}

export async function requireAdmin(request: Request): Promise<
  | { ok: true; user: PublicUser }
  | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser(request);
  if (user?.role === "admin") {
    return { ok: true, user };
  }

  if (!hasDatabaseUrl()) {
    return {
      ok: true,
      user: {
        id: "local_admin",
        username: "local_admin",
        displayName: "本地管理员",
        role: "admin"
      }
    };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "ADMIN_PERMISSION_REQUIRED" }, { status: 403 })
  };
}

export async function ensureTeacherClassAccess(user: PublicUser, classId: string) {
  const canAccess = await organizationRepository.canAccessClass(user, classId);
  return canAccess ? null : NextResponse.json({ error: "TEACHER_CLASS_ACCESS_REQUIRED" }, { status: 403 });
}
