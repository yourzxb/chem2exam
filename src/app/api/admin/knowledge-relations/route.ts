import { NextResponse } from "next/server";
import type { RelationType } from "@/domain/types";
import { requireAdmin } from "@/server/auth/roles";
import { adminContentRepository } from "@/server/repositories/admin-content-repository";

const allowedRelationTypes: RelationType[] = ["parent", "prerequisite", "confused_with", "similar_practice", "integrated_application"];

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const relations = await adminContentRepository.listKnowledgeRelations();
  return NextResponse.json({ relations });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json()) as { fromPointId?: string; toPointId?: string; relationType?: RelationType };
  if (!body.fromPointId || !body.toPointId || !body.relationType || !allowedRelationTypes.includes(body.relationType)) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const relation = await adminContentRepository.createKnowledgeRelation({
      fromPointId: body.fromPointId,
      toPointId: body.toPointId,
      relationType: body.relationType
    });
    return NextResponse.json({ relation }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "RELATION_CREATE_FAILED" }, { status: 400 });
  }
}
