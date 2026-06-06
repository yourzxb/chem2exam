import { NextResponse } from "next/server";
import { ensureTeacherClassAccess, requireReviewer } from "@/server/auth/roles";
import { teacherReportRepository } from "@/server/repositories/teacher-report-repository";

export async function POST(request: Request) {
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId") ?? "default";
  const accessError = await ensureTeacherClassAccess(reviewer.user, classId);
  if (accessError) return accessError;

  const payload = (await request.json().catch(() => ({}))) as { studentIds?: string[]; cooldownHours?: number };
  const studentIds = Array.isArray(payload.studentIds) ? payload.studentIds.map((id) => id.trim()).filter(Boolean) : [];
  if (!studentIds.length) {
    return NextResponse.json({ error: "STUDENT_IDS_REQUIRED" }, { status: 400 });
  }

  const result = await teacherReportRepository.batchRemindStudentReviewTasks(classId, studentIds, reviewer.user.id, {
    cooldownHours: sanitizeCooldownHours(payload.cooldownHours)
  });

  return NextResponse.json({ result });
}

function sanitizeCooldownHours(value?: number) {
  return Number.isFinite(value) ? Math.min(168, Math.max(1, Number(value))) : 24;
}
