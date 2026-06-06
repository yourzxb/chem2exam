export interface StructuredAiResult {
  ok: boolean;
  warnings: string[];
}

const taskRequiredFields: Record<string, string[]> = {
  paper_parse: ["questions"],
  paper_split: ["questions"],
  answer_alignment: ["aligned"],
  answer_align: ["aligned"],
  knowledge_linking: ["primaryKnowledgePointId", "confidence"],
  knowledge_link: ["primaryKnowledgePointId", "confidence"],
  literacy_tagging: ["literacyTags"],
  literacy_tag: ["literacyTags"],
  encouraging_evaluation: ["studentFeedback", "encouragement"],
  feedback_generate: ["studentFeedback", "encouragement"],
  learning_path_recommendation: ["nextSteps"],
  path_recommend: ["nextSteps"]
};

export function validateStructuredOutput(taskType: string, output: unknown): StructuredAiResult {
  const warnings: string[] = [];
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return { ok: false, warnings: ["AI 输出不是结构化 JSON 对象。"] };
  }

  const requiredFields = taskRequiredFields[taskType] ?? [];
  for (const field of requiredFields) {
    if (!(field in output)) {
      warnings.push(`缺少必填字段：${field}`);
    }
  }

  for (const confidence of collectConfidenceValues(output)) {
    if (confidence < 0 || confidence > 1) {
      warnings.push("置信度必须在 0 到 1 之间。");
      break;
    }
  }

  return {
    ok: warnings.length === 0,
    warnings
  };
}

function collectConfidenceValues(value: unknown): number[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectConfidenceValues);
  const record = value as Record<string, unknown>;
  const values: number[] = [];
  if (typeof record.confidence === "number") {
    values.push(record.confidence);
  }
  for (const nested of Object.values(record)) {
    values.push(...collectConfidenceValues(nested));
  }
  return values;
}
