import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { organizationRepository } from "@/server/repositories/organization-repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { studentId?: string } | null;
  const studentId = body?.studentId?.trim() ?? "";
  if (!studentId) {
    return NextResponse.json({ error: "STUDENT_ID_REQUIRED" }, { status: 400 });
  }

  try {
    const classGroup = await organizationRepository.assignStudentToClass({ classId: id, studentId }, admin.user.id);
    return NextResponse.json({ classGroup });
  } catch (error) {
    return NextResponse.json({ error: organizationErrorCode(error) }, { status: organizationErrorStatus(error) });
  }
}

function organizationErrorCode(error: unknown) {
  return error instanceof Error ? error.message : "ORGANIZATION_OPERATION_FAILED";
}

function organizationErrorStatus(error: unknown) {
  if (error instanceof Error && (error.message === "CLASS_NOT_FOUND" || error.message === "STUDENT_NOT_FOUND")) return 404;
  return 400;
}
