import { NextResponse } from "next/server";
import { ensureTeacherClassAccess, requireReviewer } from "@/server/auth/roles";
import { teacherReportRepository } from "@/server/repositories/teacher-report-repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  const { id } = await context.params;
  const url = new URL(request.url);
  const classId = url.searchParams.get("classId") ?? "default";
  const accessError = await ensureTeacherClassAccess(reviewer.user, classId);
  if (accessError) return accessError;

  const payload = (await request.json().catch(() => ({}))) as { cooldownHours?: number };
  const result = await teacherReportRepository.remindStudentReviewTasks(classId, id, reviewer.user.id, {
    cooldownHours: sanitizeCooldownHours(payload.cooldownHours)
  });
  if (!result) {
    return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ result });
}

function sanitizeCooldownHours(value?: number) {
  return Number.isFinite(value) ? Math.min(168, Math.max(1, Number(value))) : 24;
}
