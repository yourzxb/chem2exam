import { ensureTeacherClassAccess, requireReviewer } from "@/server/auth/roles";
import { buildTeacherReportCsv, teacherReportRepository } from "@/server/repositories/teacher-report-repository";

export async function GET(request: Request) {
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId") ?? "default";
  const accessError = await ensureTeacherClassAccess(reviewer.user, classId);
  if (accessError) return accessError;

  const grade = url.searchParams.get("grade") ?? undefined;
  const reviewStatus = parseReviewStatus(url.searchParams.get("reviewStatus"));
  const reminderStatus = parseReminderStatus(url.searchParams.get("reminderStatus"));
  const retestStatus = parseRetestStatus(url.searchParams.get("retestStatus"));
  const reviewGroup = parseReviewGroup(url.searchParams.get("reviewGroup"));
  const reviewTaskType = parseReviewTaskType(url.searchParams.get("reviewTaskType"));
  const feedbackStatus = parseFeedbackStatus(url.searchParams.get("feedbackStatus"));
  const startDate = parseDateParam(url.searchParams.get("startDate"), "start");
  const endDate = parseDateParam(url.searchParams.get("endDate"), "end");

  if (
    startDate === "invalid" ||
    endDate === "invalid" ||
    reviewStatus === "invalid" ||
    reminderStatus === "invalid" ||
    retestStatus === "invalid" ||
    reviewGroup === "invalid" ||
    reviewTaskType === "invalid" ||
    feedbackStatus === "invalid"
  ) {
    return Response.json({ error: "Invalid report filter" }, { status: 400 });
  }

  const report = await teacherReportRepository.getClassReport(classId, {
    grade,
    startDate,
    endDate,
    reviewStatus,
    reminderStatus,
    retestStatus,
    reviewGroup,
    reviewTaskType,
    feedbackStatus
  });
  const csv = buildTeacherReportCsv(report);

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="chem2exam-teacher-report-${Date.now()}.csv"`
    }
  });
}

function parseReviewStatus(value: string | null): "all" | "assigned" | "completed" | "none" | "invalid" {
  if (!value || value === "all") return "all";
  if (value === "assigned" || value === "completed" || value === "none") return value;
  return "invalid";
}

function parseReminderStatus(value: string | null): "all" | "reminded" | "not_reminded" | "cooldown" | "invalid" {
  if (!value || value === "all") return "all";
  if (value === "reminded" || value === "not_reminded" || value === "cooldown") return value;
  return "invalid";
}

function parseRetestStatus(value: string | null): "all" | "success" | "needs_consolidation" | "pending" | "none" | "invalid" {
  if (!value || value === "all") return "all";
  if (value === "success" || value === "needs_consolidation" || value === "pending" || value === "none") return value;
  return "invalid";
}

function parseReviewGroup(
  value: string | null
): "all" | "needs_consolidation" | "pending_retest" | "ready_for_challenge" | "needs_assignment" | "invalid" {
  if (!value || value === "all") return "all";
  if (value === "needs_consolidation" || value === "pending_retest" || value === "ready_for_challenge" || value === "needs_assignment") {
    return value;
  }
  return "invalid";
}

function parseReviewTaskType(value: string | null): "all" | "review" | "variant_challenge" | "prerequisite_consolidation" | "invalid" {
  if (!value || value === "all") return "all";
  if (value === "review" || value === "variant_challenge" || value === "prerequisite_consolidation") return value;
  return "invalid";
}

function parseFeedbackStatus(value: string | null): "all" | "noted" | "pending_feedback" | "invalid" {
  if (!value || value === "all") return "all";
  if (value === "noted" || value === "pending_feedback") return value;
  return "invalid";
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
