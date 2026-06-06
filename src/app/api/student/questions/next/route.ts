import { NextResponse } from "next/server";
import type { Grade } from "@/domain/types";
import { grades } from "@/data/chemistry-seed";
import { learningRepository } from "@/server/repositories/learning-repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const grade = url.searchParams.get("grade") as Grade | null;
  const knowledgePointId = url.searchParams.get("knowledgePointId");

  if (!grade || !grades.includes(grade)) {
    return NextResponse.json({ error: "Missing or unsupported grade" }, { status: 400 });
  }

  const question = await learningRepository.getNextPublishedQuestion(grade, knowledgePointId);

  if (!question) {
    return NextResponse.json({ question: null });
  }

  return NextResponse.json({
    question: {
      id: question.id,
      grade: question.grade,
      stem: question.stem,
      options: question.options,
      questionType: "single_choice",
      difficulty: question.difficulty,
      medianTimeSeconds: question.medianTimeSeconds,
      primaryKnowledgePointId: question.primaryKnowledgePointId,
      prerequisiteKnowledgePointIds: question.prerequisiteKnowledgePointIds,
      coreLiteracy: question.coreLiteracy,
      abilityTarget: question.abilityTarget
    }
  });
}
