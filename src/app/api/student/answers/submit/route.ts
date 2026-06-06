import { NextResponse } from "next/server";
import { evaluateAnswer } from "@/domain/assessment";
import { recommendRemediation } from "@/domain/remediation";
import { createPrerequisiteConsolidationReward, createQuestionCorrectReward, createVariantChallengeReward } from "@/domain/rewards";
import { getCurrentUser } from "@/server/auth/session";
import { learningEventRepository } from "@/server/repositories/learning-event-repository";
import { learningRepository } from "@/server/repositories/learning-repository";
import type { DifficultyFeedback } from "@/domain/types";

interface SubmitPayload {
  studentId?: string;
  questionId: string;
  selectedAnswer: string;
  durationSeconds: number;
  difficultyFeedback?: DifficultyFeedback;
  startedAt?: string;
  reviewTaskId?: string;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as SubmitPayload;
  const currentUser = await getCurrentUser(request);
  const studentId = currentUser?.role === "student" ? currentUser.id : payload.studentId;
  const question = await learningRepository.getPublishedQuestion(payload.questionId);

  if (!question) {
    return NextResponse.json({ error: "Question not found or not published" }, { status: 404 });
  }

  const evaluation = evaluateAnswer({
    question,
    selectedAnswer: payload.selectedAnswer,
    durationSeconds: payload.durationSeconds,
    difficultyFeedback: payload.difficultyFeedback
  });
  const gradePoints = await learningRepository.getGradeKnowledgePoints(question.grade);
  const relations = await learningRepository.getKnowledgeRelations();
  const remediation = evaluation.shouldRemediate
    ? recommendRemediation(question, gradePoints, relations)
    : null;
  const reward = evaluation.isCorrect ? createQuestionCorrectReward() : null;
  const submittedAt = new Date();
  const startedAt = payload.startedAt
    ? new Date(payload.startedAt)
    : new Date(submittedAt.getTime() - payload.durationSeconds * 1000);

  const answerRecordId = await learningEventRepository.saveAnswerRecord({
    studentId,
    questionId: question.id,
    knowledgePointId: question.primaryKnowledgePointId,
    startedAt,
    submittedAt,
    durationSeconds: payload.durationSeconds,
    selectedAnswer: payload.selectedAnswer,
    isCorrect: evaluation.isCorrect,
    difficultyFeedback: payload.difficultyFeedback,
    timeAssessment: evaluation.timeAssessment,
    behaviorSignal: evaluation.behaviorSignal,
    triggeredRemediation: Boolean(remediation)
  });

  const retestRecord = await learningEventRepository.recordReviewTaskRetest({
    studentId,
    reviewTaskId: payload.reviewTaskId,
    questionId: question.id,
    answerRecordId,
    isCorrect: evaluation.isCorrect
  });
  const retestNextAction = payload.reviewTaskId
    ? buildRetestNextAction(evaluation.isCorrect, remediation?.targetKnowledgePointId)
    : undefined;
  const retestNextActionReward = await maybeCreateRetestNextActionReward({
    studentId,
    reviewTaskId: payload.reviewTaskId,
    isCorrect: evaluation.isCorrect,
    previousRetestIsCorrect: retestRecord.previousRetestIsCorrect
  });

  if (remediation) {
    await learningEventRepository.createRemediationPath(studentId, question.id, remediation);
  }

  if (reward) {
    await learningEventRepository.createRewardEvent(studentId, reward);
  }

  return NextResponse.json({
    isCorrect: evaluation.isCorrect,
    answer: question.answer,
    analysis: question.analysis,
    durationSeconds: payload.durationSeconds,
    timeAssessment: evaluation.timeAssessment,
    studentFeedback: evaluation.studentFeedback,
    encouragement: evaluation.encouragement,
    remediation: remediation
      ? {
          needed: true,
          targetKnowledgePointId: remediation.targetKnowledgePointId,
          pathText: remediation.pathText,
          reason: remediation.reason,
          keyHint: remediation.keyHint
        }
      : { needed: false },
    reward,
    retest: payload.reviewTaskId
      ? {
          reviewTaskId: payload.reviewTaskId,
          recorded: retestRecord.recorded,
          isCorrect: evaluation.isCorrect,
          nextAction: retestNextAction,
          nextActionReward: retestNextActionReward
        }
      : undefined
  });
}

async function maybeCreateRetestNextActionReward(input: {
  studentId?: string;
  reviewTaskId?: string;
  isCorrect: boolean;
  previousRetestIsCorrect?: boolean;
}) {
  if (!input.studentId || !input.reviewTaskId || !input.isCorrect) return null;

  const reward =
    input.previousRetestIsCorrect === true
      ? createVariantChallengeReward()
      : input.previousRetestIsCorrect === false
        ? createPrerequisiteConsolidationReward()
        : null;
  if (!reward) return null;

  const alreadyRewarded = await learningEventRepository.hasRewardReason(input.studentId, reward.reason);
  if (alreadyRewarded) return null;

  await learningEventRepository.createRewardEvent(input.studentId, reward);
  return reward;
}

function buildRetestNextAction(isCorrect: boolean, remediationKnowledgePointId?: string) {
  if (isCorrect) {
    return {
      actionType: "challenge_variant",
      title: "进入变式题挑战",
      detail: "这次同类题已经迁移成功，下一步可以做一道变式题，把方法迁移到新情境。",
      targetKnowledgePointId: undefined,
      status: "available",
      rewardText: "挑战成功可获得突破奖励"
    };
  }
  if (remediationKnowledgePointId) {
    return {
      actionType: "revisit_prerequisite",
      title: "再补一个前置知识点",
      detail: "这次复测提示还有一个关键条件值得再补清。先回到前置知识点，再做短题确认。",
      targetKnowledgePointId: remediationKnowledgePointId,
      status: "available",
      rewardText: "巩固成功可获得补救奖励"
    };
  }
  return {
    actionType: "retry_foundation",
    title: "先做基础巩固",
    detail: "这次复测适合先回看复盘笔记，抓住题干条件后再做一道基础同类题。",
    targetKnowledgePointId: undefined,
    status: "available",
    rewardText: "巩固成功可获得补救奖励"
  };
}
