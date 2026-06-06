import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { organizationRepository } from "@/server/repositories/organization-repository";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  try {
    const assignments = await organizationRepository.listClassTeacherAssignments(id);
    return NextResponse.json({ assignments });
  } catch (error) {
    return NextResponse.json({ error: organizationErrorCode(error) }, { status: organizationErrorStatus(error) });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { teacherId?: string; role?: string } | null;
  const teacherId = body?.teacherId?.trim() ?? "";
  if (!teacherId) {
    return NextResponse.json({ error: "TEACHER_ID_REQUIRED" }, { status: 400 });
  }

  try {
    const assignment = await organizationRepository.assignTeacherToClass(
      {
        classId: id,
        teacherId,
        role: body?.role?.trim() || "teacher"
      },
      admin.user.id
    );
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: organizationErrorCode(error) }, { status: organizationErrorStatus(error) });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { teacherId?: string; role?: string } | null;
  const teacherId = body?.teacherId?.trim() ?? "";
  const role = body?.role?.trim() ?? "";
  if (!teacherId) {
    return NextResponse.json({ error: "TEACHER_ID_REQUIRED" }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ error: "TEACHER_CLASS_ROLE_REQUIRED" }, { status: 400 });
  }

  try {
    const assignment = await organizationRepository.updateTeacherClassRole(
      {
        classId: id,
        teacherId,
        role
      },
      admin.user.id
    );
    return NextResponse.json({ assignment });
  } catch (error) {
    return NextResponse.json({ error: organizationErrorCode(error) }, { status: organizationErrorStatus(error) });
  }
}

function organizationErrorCode(error: unknown) {
  return error instanceof Error ? error.message : "ORGANIZATION_OPERATION_FAILED";
}

function organizationErrorStatus(error: unknown) {
  if (
    error instanceof Error &&
    (error.message === "CLASS_NOT_FOUND" ||
      error.message === "TEACHER_NOT_FOUND" ||
      error.message === "TEACHER_CLASS_ASSIGNMENT_NOT_FOUND")
  ) {
    return 404;
  }
  return 400;
}
