import type { KnowledgePoint, KnowledgeRelation, Question, RemediationRecommendation } from "./types";

export function recommendRemediation(
  question: Question,
  points: KnowledgePoint[],
  relations: KnowledgeRelation[]
): RemediationRecommendation | null {
  const directPrerequisite = question.prerequisiteKnowledgePointIds[0];
  const graphPrerequisite = relations.find(
    (relation) => relation.toPointId === question.primaryKnowledgePointId && relation.relationType === "prerequisite"
  )?.fromPointId;
  const parentFallback = relations.find(
    (relation) => relation.toPointId === question.primaryKnowledgePointId && relation.relationType === "parent"
  )?.fromPointId;
  const targetKnowledgePointId = directPrerequisite ?? graphPrerequisite ?? parentFallback;

  if (!targetKnowledgePointId) return null;

  const source = points.find((point) => point.id === question.primaryKnowledgePointId);
  const target = points.find((point) => point.id === targetKnowledgePointId);
  if (!source || !target) return null;

  return {
    sourceKnowledgePointId: source.id,
    targetKnowledgePointId: target.id,
    pathText: `先复习「${target.name}」→ 做 2 道基础题 → 回到「${source.name}」复测。`,
    reason: `这道题暴露了「${source.name}」上的小断点，建议先补清前置知识「${target.name}」。`,
    keyHint: question.wrongFeedback
  };
}
