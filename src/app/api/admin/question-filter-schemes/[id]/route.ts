import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/roles";
import { adminContentRepository } from "@/server/repositories/admin-content-repository";
import { parseQuestionFilterSchemeInput } from "../route";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  const parsed = parseQuestionFilterSchemeInput(await request.json().catch(() => null), admin.user.role);
  if (!parsed.ok) return parsed.response;

  const scheme = await adminContentRepository.updateQuestionFilterScheme(id, parsed.input, admin.user.id, admin.user.role);
  if (!scheme) {
    return NextResponse.json({ error: "FILTER_SCHEME_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ scheme });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  const deleted = await adminContentRepository.deleteQuestionFilterScheme(id, admin.user.id, admin.user.role);
  if (!deleted) {
    return NextResponse.json({ error: "FILTER_SCHEME_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
