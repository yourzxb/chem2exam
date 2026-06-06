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

  const grade = url.searchParams.get("grade") ?? undefined;
  const startDate = parseDateParam(url.searchParams.get("startDate"), "start");
  const endDate = parseDateParam(url.searchParams.get("endDate"), "end");
  const body = (await request.json()) as { questionIds?: string[] };
  const questionIds = Array.isArray(body.questionIds) ? body.questionIds.map((questionId) => questionId.trim()).filter(Boolean) : [];

  if (startDate === "invalid" || endDate === "invalid") {
    return NextResponse.json({ error: "Invalid date filter" }, { status: 400 });
  }
  if (!questionIds.length) {
    return NextResponse.json({ error: "QUESTION_IDS_REQUIRED" }, { status: 400 });
  }

  const result = await teacherReportRepository.assignStudentReviewTasks(classId, id, questionIds, reviewer.user.id, {
    grade,
    startDate,
    endDate
  });
  if (!result) {
    return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ result });
}

function parseDateParam(value: string | null, boundary: "start" | "end") {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "invalid";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (boundary === "start") date.setHours(0, 0, 0, 0);
    if (boundary === "end") date.setHours(23, 59, 59, 999);
  }
  return date;
}
