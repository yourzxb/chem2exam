import { NextResponse } from "next/server";
import type { Grade } from "@/domain/types";
import { requireAdmin } from "@/server/auth/roles";
import { organizationRepository } from "@/server/repositories/organization-repository";

const allowedGrades: Grade[] = ["初三", "高一", "高二", "高三"];

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const url = new URL(request.url);
  const schoolId = url.searchParams.get("schoolId")?.trim() || undefined;
  const classes = await organizationRepository.listClasses(schoolId);
  return NextResponse.json({ classes });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json().catch(() => null)) as { schoolId?: string; name?: string; grade?: string } | null;
  const schoolId = body?.schoolId?.trim() ?? "";
  const name = body?.name?.trim() ?? "";
  const grade = body?.grade && allowedGrades.includes(body.grade as Grade) ? (body.grade as Grade) : undefined;
  if (!schoolId || !name) {
    return NextResponse.json({ error: "CLASS_SCHOOL_AND_NAME_REQUIRED" }, { status: 400 });
  }

  try {
    const classGroup = await organizationRepository.createClass(
      {
        schoolId,
        name: name.slice(0, 80),
        grade
      },
      admin.user.id
    );
    return NextResponse.json({ classGroup }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: organizationErrorCode(error) }, { status: organizationErrorStatus(error) });
  }
}

function organizationErrorCode(error: unknown) {
  return error instanceof Error ? error.message : "ORGANIZATION_OPERATION_FAILED";
}

function organizationErrorStatus(error: unknown) {
  if (error instanceof Error && error.message === "SCHOOL_NOT_FOUND") return 404;
  return 400;
}
