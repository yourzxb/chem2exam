import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { adminUserRepository, normalizeIdentifiers } from "@/server/repositories/admin-user-repository";
import { organizationRepository } from "@/server/repositories/organization-repository";

interface BatchAssignStudentsPayload {
  studentIds?: string[];
  identifiers?: string[];
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as BatchAssignStudentsPayload | null;
  const identifiers = normalizeIdentifiers([...(body?.studentIds ?? []), ...(body?.identifiers ?? [])]);
  if (!identifiers.length) {
    return NextResponse.json({ error: "STUDENT_IDENTIFIERS_REQUIRED" }, { status: 400 });
  }

  try {
    const resolved = await adminUserRepository.resolveUsersByIdentifiers(identifiers);
    const notFound: string[] = [];
    const notStudent: Array<{ identifier: string; role: string }> = [];
    const students: Array<{ id: string; username: string; displayName: string; classId?: string | null; schoolId?: string | null }> = [];

    for (const item of resolved) {
      if (!item.user) {
        notFound.push(item.identifier);
        continue;
      }
      if (item.user.role !== "student") {
        notStudent.push({ identifier: item.identifier, role: item.user.role });
        continue;
      }
      await organizationRepository.assignStudentToClass({ classId: id, studentId: item.user.id }, admin.user.id);
      students.push({
        id: item.user.id,
        username: item.user.username,
        displayName: item.user.displayName,
        classId: id,
        schoolId: item.user.schoolId
      });
    }

    return NextResponse.json({
      result: {
        classId: id,
        requestedCount: identifiers.length,
        assignedCount: students.length,
        skippedCount: notFound.length + notStudent.length,
        notFound,
        notStudent,
        students
      }
    });
  } catch (error) {
    return NextResponse.json({ error: organizationErrorCode(error) }, { status: organizationErrorStatus(error) });
  }
}

function organizationErrorCode(error: unknown) {
  return error instanceof Error ? error.message : "BATCH_STUDENT_ASSIGNMENT_FAILED";
}

function organizationErrorStatus(error: unknown) {
  if (error instanceof Error && error.message === "CLASS_NOT_FOUND") return 404;
  return 400;
}
