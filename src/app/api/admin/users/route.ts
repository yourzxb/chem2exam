import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { adminUserRepository, normalizeAdminUserSearchRole } from "@/server/repositories/admin-user-repository";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { searchParams } = new URL(request.url);
  const role = normalizeAdminUserSearchRole(searchParams.get("role"));
  const rawRole = searchParams.get("role");
  if (rawRole && !role) {
    return NextResponse.json({ error: "INVALID_USER_ROLE" }, { status: 400 });
  }

  const users = await adminUserRepository.searchUsers({
    role,
    q: searchParams.get("q") ?? undefined,
    limit: Number(searchParams.get("limit") ?? 20)
  });

  return NextResponse.json({ users });
}
