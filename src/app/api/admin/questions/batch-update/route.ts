import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { adminBatchConfirmText, adminContentRepository } from "@/server/repositories/admin-content-repository";
import { batchErrorCode, batchErrorStatus, parseBatchPatch } from "../batch-preview/route";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json().catch(() => null)) as {
    questionIds?: string[];
    filterSchemeId?: string;
    auditStatus?: unknown;
    difficulty?: unknown;
    primaryKnowledgePointId?: string;
    coreLiteracy?: unknown;
    previewToken?: string;
    reason?: string;
    confirmText?: string;
  } | null;

  const parsed = parseBatchPatch(body as Parameters<typeof parseBatchPatch>[0]);
  if (!parsed.ok) return parsed.response;

  const questionIds = Array.isArray(body?.questionIds) ? body.questionIds.map((id) => id.trim()).filter(Boolean) : [];
  const filterSchemeId = body?.filterSchemeId?.trim() || undefined;
  if (!questionIds.length && !filterSchemeId) {
    return NextResponse.json({ error: "BATCH_TARGETS_REQUIRED" }, { status: 400 });
  }
  const previewToken = body?.previewToken?.trim() || "";
  if (!previewToken) {
    return NextResponse.json({ error: "PREVIEW_TOKEN_REQUIRED" }, { status: 400 });
  }
  const reason = body?.reason?.trim() || "";
  if (!reason) {
    return NextResponse.json({ error: "BATCH_REASON_REQUIRED" }, { status: 400 });
  }
  if (body?.confirmText !== adminBatchConfirmText) {
    return NextResponse.json({ error: "INVALID_BATCH_CONFIRM_TEXT" }, { status: 400 });
  }

  try {
    const result = await adminContentRepository.batchUpdateQuestions(
      {
        questionIds,
        filterSchemeId,
        patch: parsed.patch,
        previewToken,
        reason,
        confirmText: body.confirmText
      },
      admin.user.id,
      admin.user.role
    );

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: batchErrorCode(error) }, { status: batchErrorStatus(error) });
  }
}
