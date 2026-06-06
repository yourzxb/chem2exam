import { Prisma } from "@prisma/client";
import type { CoreLiteracy, Grade, KnowledgePoint, KnowledgeRelation, QuestionOption, QuestionType } from "@/domain/types";
import { knowledgePoints, knowledgeRelations, questions } from "@/data/chemistry-seed";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";

export interface ImportExamPaperInput {
  title: string;
  examType: string;
  year?: number;
  region?: string;
  grade: Grade;
  paperText: string;
  answerAnalysisText: string;
  modelConfigId?: string;
  uploadUserId: string;
}

export interface ImportedExamPaperResult {
  paperId: string;
  taskId?: string;
  createdQuestionIds: string[];
  reviewStatus: "pending_review";
}

export interface ExamPaperRepository {
  importPaper(input: ImportExamPaperInput): Promise<ImportedExamPaperResult>;
}

class MemoryExamPaperRepository implements ExamPaperRepository {
  async importPaper(input: ImportExamPaperInput) {
    const parsed = parsePaperQuestions(input, buildSeedGraphContext(input.grade));
    const createdQuestionIds: string[] = [];

    for (const candidate of parsed) {
      questions.push({
        id: candidate.id,
        grade: input.grade,
        stem: candidate.stem,
        options: candidate.options,
        answer: candidate.answer,
        analysis: candidate.analysis,
        difficulty: "medium",
        medianTimeSeconds: 75,
        auditStatus: "pending_review",
        primaryKnowledgePointId: candidate.primaryKnowledgePointId,
        prerequisiteKnowledgePointIds: candidate.prerequisiteKnowledgePointIds,
        coreLiteracy: candidate.coreLiteracy,
        abilityTarget: candidate.abilityTarget,
        positiveFeedback: "你能从真题材料中提取关键证据，化学思维正在变清楚。",
        wrongFeedback: "先圈出题干条件，再回到对应知识点一步步判断。"
      });
      createdQuestionIds.push(candidate.id);
    }

    return {
      paperId: `paper_${Date.now()}`,
      taskId: input.modelConfigId ? `task_${Date.now()}` : undefined,
      createdQuestionIds,
      reviewStatus: "pending_review" as const
    };
  }
}

class PrismaExamPaperRepository implements ExamPaperRepository {
  async importPaper(input: ImportExamPaperInput) {
    const prisma = getPrismaClient();
    const graphContext = await getImportGraphContext(prisma, input.grade);
    const parsed = parsePaperQuestions(input, graphContext);

    const result = await prisma.$transaction(async (tx) => {
      const paper = await tx.examPaper.create({
        data: {
          title: input.title,
          examType: input.examType,
          year: input.year,
          region: input.region,
          grade: toDbGrade(input.grade),
          uploadUserId: input.uploadUserId,
          status: "ai_draft_created",
          sourceFileId: "text_input",
          answerFileId: input.answerAnalysisText ? "text_input" : undefined,
          analysisFileId: input.answerAnalysisText ? "text_input" : undefined
        }
      });

      let taskId: string | undefined;
      if (input.modelConfigId) {
        const task = await tx.aiTask.create({
          data: {
            taskType: "paper_parse",
            status: "needs_review",
            modelConfigId: input.modelConfigId,
            input: {
              paperId: paper.id,
              title: input.title,
              grade: input.grade,
              reviewPolicy: "AI 拆题结果必须进入人工一审，通过后才发布。"
            } as Prisma.InputJsonValue,
            output: {
              createdQuestionCount: parsed.length,
              createdQuestionIds: parsed.map((candidate) => candidate.id)
            } as Prisma.InputJsonValue,
            completedAt: new Date()
          }
        });
        taskId = task.id;
      }

      const createdQuestionIds: string[] = [];
      for (const candidate of parsed) {
        const question = await tx.question.create({
          data: {
            examPaperId: paper.id,
            questionNumber: candidate.questionNumber,
            grade: toDbGrade(input.grade),
            examType: input.examType,
            questionType: candidate.questionType,
            stem: candidate.stem,
            options: candidate.options as unknown as Prisma.InputJsonValue,
            answer: candidate.answer,
            analysis: candidate.analysis,
            aiDifficulty: "medium",
            medianTimeSeconds: 75,
            auditStatus: "pending_review",
            sourceMeta: {
              source: "exam_paper_import",
              title: input.title,
              year: input.year,
              region: input.region,
              taskId,
              reviewRisk: candidate.reviewRisk,
              warnings: candidate.warnings,
              subQuestionCount: candidate.subQuestions.length,
              subQuestions: candidate.subQuestions
            } as Prisma.InputJsonValue
          }
        });
        createdQuestionIds.push(question.id);

        await tx.questionKnowledgeLink.create({
          data: {
            questionId: question.id,
            knowledgePointId: candidate.primaryKnowledgePointId,
            linkType: "primary",
            confidence: candidate.confidence,
            reason: candidate.linkReason,
            source: "ai"
          }
        });

        for (const prerequisiteId of candidate.prerequisiteKnowledgePointIds) {
          await tx.questionKnowledgeLink.create({
            data: {
              questionId: question.id,
              knowledgePointId: prerequisiteId,
              linkType: "prerequisite",
              confidence: 0.72,
              reason: "根据知识图谱前置依赖自动带出，等待人工确认。",
              source: "ai"
            }
          });
        }

        for (const literacyTag of candidate.coreLiteracy) {
          await tx.questionLiteracyLink.create({
            data: {
              questionId: question.id,
              literacyTag,
              abilityTarget: candidate.abilityTarget,
              evaluationFocus: "基于题干关键词自动生成，等待人工一审确认。",
              confidence: 0.76,
              source: "ai"
            }
          });
        }
      }

      return { paperId: paper.id, taskId, createdQuestionIds };
    });

    return {
      ...result,
      reviewStatus: "pending_review" as const
    };
  }
}

interface ParsedQuestionCandidate {
  id: string;
  questionNumber: string;
  questionType: QuestionType;
  stem: string;
  options: QuestionOption[];
  answer: string;
  analysis: string;
  primaryKnowledgePointId: string;
  prerequisiteKnowledgePointIds: string[];
  coreLiteracy: CoreLiteracy[];
  abilityTarget: string;
  confidence: number;
  linkReason: string;
  reviewRisk: "normal" | "low_confidence" | "needs_structure_check";
  warnings: string[];
  subQuestions: Array<{ number: string; stem: string }>;
}

interface ImportGraphContext {
  points: KnowledgePoint[];
  relations: KnowledgeRelation[];
}

function parsePaperQuestions(input: ImportExamPaperInput, graphContext: ImportGraphContext): ParsedQuestionCandidate[] {
  const blocks = splitQuestionBlocks(input.paperText);
  const answerMap = parseAnswerAnalysis(input.answerAnalysisText);
  return blocks.map((block, index) => {
    const questionNumber = block.number || String(index + 1);
    const answerInfo = answerMap.get(questionNumber);
    const questionType = inferQuestionType(block.body);
    const stem = normalizeStem(block.body, questionType);
    const options = parseOptions(block.body);
    const subQuestions = parseSubQuestions(block.body);
    const link = inferKnowledgeLink(input.grade, `${stem}\n${answerInfo?.analysis ?? ""}`, graphContext);
    const literacy = inferCoreLiteracy(`${stem}\n${answerInfo?.analysis ?? ""}`);
    const warnings = buildWarnings(questionType, options, link.confidence, subQuestions);
    return {
      id: `ai_${Date.now()}_${index + 1}_${Math.random().toString(36).slice(2, 8)}`,
      questionNumber,
      questionType,
      stem,
      options: questionType === "single_choice" || questionType === "multiple_choice" ? options : [],
      answer: answerInfo?.answer ?? "A",
      analysis: answerInfo?.analysis ?? "AI 已完成初步解析，需人工一审补充确认。",
      primaryKnowledgePointId: link.knowledgePointId,
      prerequisiteKnowledgePointIds: findPrerequisites(link.knowledgePointId, graphContext),
      coreLiteracy: literacy.tags,
      abilityTarget: literacy.abilityTarget,
      confidence: link.confidence,
      linkReason: link.reason,
      reviewRisk: link.confidence < 0.7 ? "low_confidence" : warnings.length ? "needs_structure_check" : "normal",
      warnings,
      subQuestions
    };
  });
}

function splitQuestionBlocks(text: string) {
  const normalized = text.replace(/\r/g, "").trim();
  const matches = Array.from(normalized.matchAll(/(?:^|\n)\s*(\d+)[\.．、]\s*([\s\S]*?)(?=\n\s*\d+[\.．、]\s*|$)/g));
  if (!matches.length) {
    return [{ number: "1", body: normalized }];
  }
  return matches.map((match) => ({ number: match[1], body: match[2].trim() }));
}

function parseAnswerAnalysis(text: string) {
  const map = new Map<string, { answer: string; analysis: string }>();
  const matches = Array.from(text.replace(/\r/g, "").matchAll(/(?:^|\n)\s*(\d+)[\.．、]\s*(?:答案[:：]?)?\s*([A-D])\s*(?:解析[:：]?)?\s*([\s\S]*?)(?=\n\s*\d+[\.．、]\s*(?:答案[:：]?)?\s*[A-D]|$)/g));
  for (const match of matches) {
    map.set(match[1], {
      answer: match[2],
      analysis: match[3].trim() || "解析需人工一审补充。"
    });
  }
  return map;
}

function normalizeStem(body: string, questionType: QuestionType) {
  if (questionType !== "single_choice" && questionType !== "multiple_choice") {
    return body.replace(/\s+/g, " ").trim();
  }
  return body
    .replace(/\s*[A-D][\.．、]\s*[\s\S]*?(?=(?:\s+[A-D][\.．、])|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferQuestionType(body: string): QuestionType {
  if (/多选|多项选择|不定项/.test(body)) return "multiple_choice";
  if (/实验|装置|操作|现象/.test(body)) return "experiment";
  if (/计算|质量分数|物质的量|求/.test(body)) return "calculation";
  if (/填空|____|（\s*）|\(\s*\)/.test(body)) return "fill_blank";
  if (/[A-D][\.．、]/.test(body)) return "single_choice";
  if (/推断|流程|框图/.test(body)) return "inference";
  return "short_answer";
}

function parseSubQuestions(body: string) {
  const matches = Array.from(body.matchAll(/[（(](\d+)[）)]\s*([^（(]+?)(?=[（(]\d+[）)]|$)/g));
  return matches.map((match) => ({
    number: match[1],
    stem: match[2].replace(/\s+/g, " ").trim()
  }));
}

function buildWarnings(
  questionType: QuestionType,
  options: QuestionOption[],
  confidence: number,
  subQuestions: Array<{ number: string; stem: string }>
) {
  const warnings: string[] = [];
  if ((questionType === "single_choice" || questionType === "multiple_choice") && options.length < 4) {
    warnings.push("选择题选项可能不完整，需人工核对。");
  }
  if (questionType !== "single_choice" && questionType !== "multiple_choice" && options.length) {
    warnings.push("非选择题中检测到选项格式，需人工确认题型。");
  }
  if (confidence < 0.7) {
    warnings.push("知识点挂接置信度偏低，需人工重点确认。");
  }
  if (subQuestions.length) {
    warnings.push(`检测到 ${subQuestions.length} 个小问，需人工确认大题小问拆分。`);
  }
  return warnings;
}

function parseOptions(body: string): QuestionOption[] {
  const optionMatches = Array.from(body.matchAll(/([A-D])[\.．、]\s*([^A-D]+?)(?=\s+[A-D][\.．、]|$)/g));
  const options = optionMatches.map((match) => ({
    label: match[1],
    text: match[2].replace(/\s+/g, " ").trim()
  }));
  if (options.length >= 2) return options;
  return [
    { label: "A", text: "选项 A 待人工校对" },
    { label: "B", text: "选项 B 待人工校对" },
    { label: "C", text: "选项 C 待人工校对" },
    { label: "D", text: "选项 D 待人工校对" }
  ];
}

async function getImportGraphContext(prisma: ReturnType<typeof getPrismaClient>, grade: Grade): Promise<ImportGraphContext> {
  const dbGrade = toDbGrade(grade);
  const version = await prisma.knowledgeGraphVersion.findFirst({
    where: { grade: dbGrade, status: "published" },
    orderBy: { publishedAt: "desc" }
  });
  if (!version) return buildSeedGraphContext(grade);

  const points = await prisma.knowledgePoint.findMany({
    where: { grade: dbGrade, status: "published", graphVersionId: version.id }
  });
  const relations = await prisma.knowledgeRelation.findMany({
    where: { graphVersionId: version.id }
  });

  if (!points.length) return buildSeedGraphContext(grade);

  return {
    points: points.map((point: any) => ({
      id: point.id,
      grade,
      name: point.name,
      description: [point.chapter, point.description].filter(Boolean).join("\n"),
      x: point.x ?? 50,
      y: point.y ?? 50
    })),
    relations: relations.map((relation: any) => ({
      fromPointId: relation.fromPointId,
      toPointId: relation.toPointId,
      relationType: relation.relationType,
      weight: relation.weight ?? undefined
    }))
  };
}

function buildSeedGraphContext(grade: Grade): ImportGraphContext {
  const pointIds = new Set(knowledgePoints.filter((point) => point.grade === grade).map((point) => point.id));
  return {
    points: knowledgePoints.filter((point) => point.grade === grade),
    relations: knowledgeRelations.filter((relation) => pointIds.has(relation.fromPointId) && pointIds.has(relation.toPointId))
  };
}

function inferKnowledgeLink(grade: Grade, text: string, graphContext: ImportGraphContext) {
  const candidates = graphContext.points.filter((point) => point.grade === grade);
  const rules = [
    { keyword: /石蕊|酚酞|指示剂|变红|变蓝/, id: "indicator" },
    { keyword: /酸|碱|盐|中和|pH/, id: "acid_base" },
    { keyword: /化学变化|物理变化|新物质|燃烧/, id: "change" },
    { keyword: /溶液|溶质|溶剂|质量分数/, id: "solution" },
    { keyword: /方程式|质量守恒|计算/, id: "equation" },
    { keyword: /物质的量|摩尔|阿伏伽德罗/, id: "amount" },
    { keyword: /离子|沉淀|离子方程式/, id: "ion" },
    { keyword: /氧化|还原|电子|化合价/, id: "redox" },
    { keyword: /周期律|原子结构|电子层/, id: "structure" },
    { keyword: /平衡|转化率|勒夏特列/, id: "balance" },
    { keyword: /实验|探究|变量|现象/, id: "experiment" }
  ];
  const matched = rules.find((rule) => rule.keyword.test(text) && candidates.some((point) => point.id === rule.id));
  const scoredPoint = findBestKnowledgePointByText(candidates, text);
  const point = candidates.find((candidate) => candidate.id === matched?.id) ?? scoredPoint.point ?? candidates[0] ?? knowledgePoints[0];
  const confidence = matched ? 0.82 : scoredPoint.score >= 6 ? 0.78 : scoredPoint.score >= 3 ? 0.7 : 0.58;
  return {
    knowledgePointId: point.id,
    confidence,
    reason: matched || scoredPoint.score >= 3
      ? `根据题干关键词自动挂接到「${point.name}」。`
      : `未命中强关键词，先挂接到「${point.name}」等待人工确认。`
  };
}

function findBestKnowledgePointByText(candidates: KnowledgePoint[], text: string) {
  const normalizedText = text.toLowerCase();
  let best: { point?: KnowledgePoint; score: number } = { score: 0 };

  for (const point of candidates) {
    const tokens = buildKnowledgePointTokens(point);
    const score = tokens.reduce((total, token) => total + (normalizedText.includes(token.toLowerCase()) ? token.length : 0), 0);
    if (score > best.score) {
      best = { point, score };
    }
  }

  return best;
}

function buildKnowledgePointTokens(point: KnowledgePoint) {
  const raw = `${point.name} ${point.description ?? ""}`;
  const tokens = raw
    .split(/[、，,。\s：:；;（）()《》“”"'-]+|与|和|及其|及|的/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  return Array.from(new Set([point.name, ...tokens])).slice(0, 12);
}

function findPrerequisites(knowledgePointId: string, graphContext: ImportGraphContext) {
  return graphContext.relations
    .filter((relation) => relation.relationType === "prerequisite" && relation.toPointId === knowledgePointId)
    .map((relation) => relation.fromPointId);
}

function inferCoreLiteracy(text: string): { tags: CoreLiteracy[]; abilityTarget: string } {
  if (/实验|现象|探究|变量/.test(text)) {
    return { tags: ["inquiry_innovation", "evidence_model"], abilityTarget: "能基于实验现象提出证据并完成推理。" };
  }
  if (/电子|微观|离子|原子/.test(text)) {
    return { tags: ["macro_micro"], abilityTarget: "能从微观粒子角度解释宏观化学现象。" };
  }
  if (/反应|平衡|变化|守恒/.test(text)) {
    return { tags: ["change_balance"], abilityTarget: "能从变化和守恒角度分析化学问题。" };
  }
  return { tags: ["evidence_model"], abilityTarget: "能提取题干证据并建立解题模型。" };
}

function toDbGrade(grade: Grade) {
  const map = {
    初三: "junior_three",
    高一: "senior_one",
    高二: "senior_two",
    高三: "senior_three"
  } as const;
  return map[grade];
}

export const examPaperRepository: ExamPaperRepository = hasDatabaseUrl()
  ? new PrismaExamPaperRepository()
  : new MemoryExamPaperRepository();
