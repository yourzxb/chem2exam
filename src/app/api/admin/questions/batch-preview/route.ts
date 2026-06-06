import { NextResponse } from "next/server";
import type { AuditStatus, CoreLiteracy, Difficulty } from "@/domain/types";
import { requireAdmin } from "@/server/auth/roles";
import { adminContentRepository, type BatchQuestionPatch } from "@/server/repositories/admin-content-repository";

const allowedStatuses: AuditStatus[] = ["ai_processing", "pending_review", "needs_edit", "approved", "rejected", "published"];
const allowedDifficulties: Difficulty[] = ["basic", "medium", "advanced", "integrated"];
const allowedCoreLiteracy: CoreLiteracy[] = [
  "macro_micro",
  "change_balance",
  "evidence_model",
  "inquiry_innovation",
  "attitude_responsibility"
];

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json().catch(() => null)) as {
    questionIds?: string[];
    filterSchemeId?: string;
    auditStatus?: AuditStatus;
    difficulty?: Difficulty;
    primaryKnowledgePointId?: string;
    coreLiteracy?: CoreLiteracy[];
  } | null;
  const parsed = parseBatchPatch(body);
  if (!parsed.ok) return parsed.response;

  try {
    const preview = await adminContentRepository.previewBatchUpdate(
      {
        questionIds: Array.isArray(body?.questionIds) ? body?.questionIds : undefined,
        filterSchemeId: body?.filterSchemeId?.trim() || undefined,
        patch: parsed.patch
      },
      admin.user.id,
      admin.user.role
    );
    return NextResponse.json({ preview });
  } catch (error) {
    return NextResponse.json({ error: batchErrorCode(error) }, { status: batchErrorStatus(error) });
  }
}

export function parseBatchPatch(
  body: {
    auditStatus?: AuditStatus;
    difficulty?: Difficulty;
    primaryKnowledgePointId?: string;
    coreLiteracy?: CoreLiteracy[];
  } | null
): { ok: true; patch: BatchQuestionPatch } | { ok: false; response: NextResponse } {
  if (!body || typeof body !== "object") {
    return { ok: false, response: NextResponse.json({ error: "INVALID_BODY" }, { status: 400 }) };
  }
  if (body.auditStatus && !allowedStatuses.includes(body.auditStatus)) {
    return { ok: false, response: NextResponse.json({ error: "UNSUPPORTED_AUDIT_STATUS" }, { status: 400 }) };
  }
  if (body.auditStatus === "published") {
    return { ok: false, response: NextResponse.json({ error: "BATCH_PUBLISH_REQUIRES_REVIEW" }, { status: 400 }) };
  }
  if (body.difficulty && !allowedDifficulties.includes(body.difficulty)) {
    return { ok: false, response: NextResponse.json({ error: "UNSUPPORTED_DIFFICULTY" }, { status: 400 }) };
  }
  if (body.coreLiteracy !== undefined && !Array.isArray(body.coreLiteracy)) {
    return { ok: false, response: NextResponse.json({ error: "INVALID_CORE_LITERACY" }, { status: 400 }) };
  }
  const coreLiteracy = Array.isArray(body.coreLiteracy) ? body.coreLiteracy.map((tag) => String(tag).trim()).filter(Boolean) : undefined;
  if (coreLiteracy?.some((tag) => !allowedCoreLiteracy.includes(tag as CoreLiteracy))) {
    return { ok: false, response: NextResponse.json({ error: "UNSUPPORTED_CORE_LITERACY" }, { status: 400 }) };
  }
  const patch: BatchQuestionPatch = {
    auditStatus: body.auditStatus,
    difficulty: body.difficulty,
    primaryKnowledgePointId: body.primaryKnowledgePointId?.trim() || undefined,
    coreLiteracy: coreLiteracy as CoreLiteracy[] | undefined
  };
  if (!patch.auditStatus && !patch.difficulty && !patch.primaryKnowledgePointId && patch.coreLiteracy === undefined) {
    return { ok: false, response: NextResponse.json({ error: "NO_BATCH_FIELDS" }, { status: 400 }) };
  }
  return { ok: true, patch };
}

export function batchErrorCode(error: unknown) {
  return error instanceof Error && error.message ? error.message : "BATCH_PREVIEW_FAILED";
}

export function batchErrorStatus(error: unknown) {
  if (!(error instanceof Error)) return 400;
  if (error.message === "PREVIEW_TOKEN_MISMATCH") return 409;
  if (error.message === "FILTER_SCHEME_NOT_FOUND") return 404;
  return 400;
}
