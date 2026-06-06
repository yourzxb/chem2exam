import { NextResponse } from "next/server";
import type { Grade } from "@/domain/types";
import { grades } from "@/data/chemistry-seed";
import { learningRepository } from "@/server/repositories/learning-repository";

export async function GET(_request: Request, context: { params: Promise<{ grade: string }> }) {
  const { grade: gradeParam } = await context.params;
  const grade = gradeParam as Grade;

  if (!grades.includes(grade)) {
    return NextResponse.json({ error: "Unsupported grade" }, { status: 404 });
  }

  const graph = await learningRepository.getKnowledgeGraph(grade);

  return NextResponse.json({
    grade,
    versionId: graph.versionId,
    nodes: graph.nodes,
    relations: graph.relations
  });
}
