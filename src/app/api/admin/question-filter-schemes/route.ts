import { NextResponse } from "next/server";
import type { AuditStatus, Grade, QuestionType } from "@/domain/types";
import { requireAdmin } from "@/server/auth/roles";
import {
  adminContentRepository,
  type QuestionFilterSchemeInput,
  type QuestionFilterSchemeScope,
  type QuestionFilterState
} from "@/server/repositories/admin-content-repository";

const allowedScopes: QuestionFilterSchemeScope[] = ["personal", "role", "shared"];
const allowedStatuses: Array<AuditStatus | "all"> = ["all", "ai_processing", "pending_review", "needs_edit", "approved", "rejected", "published"];
const allowedGrades: Array<Grade | "all"> = ["all", "初三", "高一", "高二", "高三"];
const allowedQuestionTypes: Array<QuestionType | "all"> = [
  "all",
  "single_choice",
  "multiple_choice",
  "fill_blank",
  "short_answer",
  "calculation",
  "experiment",
  "inference"
];

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const schemes = await adminContentRepository.listQuestionFilterSchemes(admin.user.id, admin.user.role);
  return NextResponse.json({ schemes });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const parsed = parseQuestionFilterSchemeInput(await request.json().catch(() => null), admin.user.role);
  if (!parsed.ok) return parsed.response;

  const scheme = await adminContentRepository.createQuestionFilterScheme(parsed.input, admin.user.id, admin.user.role);
  return NextResponse.json({ scheme }, { status: 201 });
}

export function parseQuestionFilterSchemeInput(
  body: unknown,
  role: string
): { ok: true; input: QuestionFilterSchemeInput } | { ok: false; response: NextResponse } {
  if (!isRecord(body)) {
    return { ok: false, response: NextResponse.json({ error: "INVALID_BODY" }, { status: 400 }) };
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return { ok: false, response: NextResponse.json({ error: "SCHEME_NAME_REQUIRED" }, { status: 400 }) };
  }
  const scopeType = typeof body.scopeType === "string" && allowedScopes.includes(body.scopeType as QuestionFilterSchemeScope)
    ? (body.scopeType as QuestionFilterSchemeScope)
    : "personal";
  const filters = parseQuestionFilterState(body.filters);
  if (!filters) {
    return { ok: false, response: NextResponse.json({ error: "INVALID_FILTERS" }, { status: 400 }) };
  }
  const columns = Array.isArray(body.columns) ? body.columns.map((item) => String(item)).filter(Boolean).slice(0, 24) : null;
  const sort = isRecord(body.sort) ? body.sort : null;
  return {
    ok: true,
    input: {
      name: name.slice(0, 80),
      description: typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 200) : undefined,
      scopeType,
      role: scopeType === "role" ? (typeof body.role === "string" && body.role.trim() ? body.role.trim() : role) : undefined,
      filters,
      sort,
      columns,
      isDefault: Boolean(body.isDefault)
    }
  };
}

function parseQuestionFilterState(value: unknown): QuestionFilterState | null {
  if (!isRecord(value)) return null;
  const status: AuditStatus | "all" =
    typeof value.status === "string" && allowedStatuses.includes(value.status as AuditStatus | "all")
      ? (value.status as AuditStatus | "all")
      : "all";
  const grade: Grade | "all" =
    typeof value.grade === "string" && allowedGrades.includes(value.grade as Grade | "all") ? (value.grade as Grade | "all") : "all";
  const questionType: QuestionType | "all" =
    typeof value.questionType === "string" && allowedQuestionTypes.includes(value.questionType as QuestionType | "all")
      ? (value.questionType as QuestionType | "all")
      : "all";
  return {
    status,
    grade,
    questionType,
    knowledgePointId: typeof value.knowledgePointId === "string" ? value.knowledgePointId.trim().slice(0, 120) : ""
  };
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
