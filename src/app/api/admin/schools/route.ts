import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { organizationRepository } from "@/server/repositories/organization-repository";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const schools = await organizationRepository.listSchools();
  return NextResponse.json({ schools });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json().catch(() => null)) as { name?: string; region?: string } | null;
  const name = body?.name?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "SCHOOL_NAME_REQUIRED" }, { status: 400 });
  }

  const school = await organizationRepository.createSchool(
    {
      name: name.slice(0, 80),
      region: body?.region?.trim() ? body.region.trim().slice(0, 80) : undefined
    },
    admin.user.id
  );
  return NextResponse.json({ school }, { status: 201 });
}
