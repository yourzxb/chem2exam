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

  const grade = url.searchParams.get("grade") ?? undefined;
  const startDate = parseDateParam(url.searchParams.get("startDate"), "start");
  const endDate = parseDateParam(url.searchParams.get("endDate"), "end");
  if (startDate === "invalid" || endDate === "invalid") {
    return NextResponse.json({ error: "Invalid date filter" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    studentIds?: string[];
    taskType?: "variant_challenge" | "prerequisite_consolidation";
  };
  if (!Array.isArray(body.studentIds) || !body.studentIds.length) {
    return NextResponse.json({ error: "studentIds required" }, { status: 400 });
  }
  if (body.taskType !== "variant_challenge" && body.taskType !== "prerequisite_consolidation") {
    return NextResponse.json({ error: "taskType invalid" }, { status: 400 });
  }

  const result = await teacherReportRepository.batchAssignNextRoundReviewTasks(
    classId,
    body.studentIds,
    reviewer.user.id,
    body.taskType,
    { grade, startDate, endDate }
  );
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
