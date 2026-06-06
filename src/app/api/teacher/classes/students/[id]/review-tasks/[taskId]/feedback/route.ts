import { NextResponse } from "next/server";
import { ensureTeacherClassAccess, requireReviewer } from "@/server/auth/roles";
import { teacherReportRepository } from "@/server/repositories/teacher-report-repository";

export async function POST(request: Request, context: { params: Promise<{ id: string; taskId: string }> }) {
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  const { id, taskId } = await context.params;
  const url = new URL(request.url);
  const classId = url.searchParams.get("classId") ?? "default";
  const accessError = await ensureTeacherClassAccess(reviewer.user, classId);
  if (accessError) return accessError;

  const body = (await request.json().catch(() => ({}))) as { feedbackNote?: string };
  const feedbackNote = typeof body.feedbackNote === "string" ? body.feedbackNote.trim() : "";
  if (!feedbackNote) {
    return NextResponse.json({ error: "FEEDBACK_NOTE_REQUIRED" }, { status: 400 });
  }
  if (feedbackNote.length > 500) {
    return NextResponse.json({ error: "FEEDBACK_NOTE_TOO_LONG" }, { status: 400 });
  }

  const result = await teacherReportRepository.recordReviewTaskFeedback(classId, id, taskId, reviewer.user.id, feedbackNote);
  if (!result) {
    return NextResponse.json({ error: "REVIEW_TASK_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ result });
}
