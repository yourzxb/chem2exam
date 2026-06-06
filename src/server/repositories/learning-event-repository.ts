import type {
  BehaviorSignal,
  DifficultyFeedback,
  RemediationRecommendation,
  RewardEvent,
  TimeAssessment
} from "@/domain/types";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";

export interface SaveAnswerRecordInput {
  studentId?: string;
  questionId: string;
  knowledgePointId?: string;
  startedAt: Date;
  submittedAt: Date;
  durationSeconds: number;
  selectedAnswer: string;
  isCorrect: boolean;
  difficultyFeedback?: DifficultyFeedback;
  timeAssessment: TimeAssessment;
  behaviorSignal: BehaviorSignal;
  triggeredRemediation: boolean;
}

export interface LearningEventRepository {
  saveAnswerRecord(input: SaveAnswerRecordInput): Promise<string | null>;
  createRemediationPath(studentId: string | undefined, sourceQuestionId: string, recommendation: RemediationRecommendation): Promise<void>;
  createRewardEvent(studentId: string | undefined, reward: RewardEvent): Promise<void>;
  recordReviewTaskRetest(input: {
    studentId?: string;
    reviewTaskId?: string;
    questionId: string;
    answerRecordId: string | null;
    isCorrect: boolean;
  }): Promise<{
    recorded: boolean;
    previousRetestIsCorrect?: boolean;
  }>;
  hasRewardReason(studentId: string | undefined, reason: string): Promise<boolean>;
}

const memoryEvents: {
  answers: SaveAnswerRecordInput[];
  remediations: Array<{ studentId?: string; sourceQuestionId: string; recommendation: RemediationRecommendation }>;
  rewards: Array<{ studentId?: string; reward: RewardEvent }>;
} = {
  answers: [],
  remediations: [],
  rewards: []
};

class MemoryLearningEventRepository implements LearningEventRepository {
  async saveAnswerRecord(input: SaveAnswerRecordInput) {
    memoryEvents.answers.push(input);
    return `memory_answer_${memoryEvents.answers.length}`;
  }

  async createRemediationPath(studentId: string | undefined, sourceQuestionId: string, recommendation: RemediationRecommendation) {
    memoryEvents.remediations.push({ studentId, sourceQuestionId, recommendation });
  }

  async createRewardEvent(studentId: string | undefined, reward: RewardEvent) {
    memoryEvents.rewards.push({ studentId, reward });
  }

  async recordReviewTaskRetest() {
    return { recorded: false };
  }

  async hasRewardReason(studentId: string | undefined, reason: string) {
    return memoryEvents.rewards.some((event) => event.studentId === studentId && event.reward.reason === reason);
  }
}

class PrismaLearningEventRepository implements LearningEventRepository {
  async saveAnswerRecord(input: SaveAnswerRecordInput) {
    if (!input.studentId) return null;
    const prisma = getPrismaClient();
    const answer = await prisma.answerRecord.create({
      data: {
        studentId: input.studentId,
        questionId: input.questionId,
        knowledgePointId: input.knowledgePointId,
        startedAt: input.startedAt,
        submittedAt: input.submittedAt,
        durationSeconds: input.durationSeconds,
        selectedAnswer: input.selectedAnswer,
        isCorrect: input.isCorrect,
        difficultyFeedback: input.difficultyFeedback,
        timeAssessment: input.timeAssessment,
        behaviorSignal: input.behaviorSignal,
        triggeredRemediation: input.triggeredRemediation
      }
    });
    return answer.id;
  }

  async createRemediationPath(studentId: string | undefined, sourceQuestionId: string, recommendation: RemediationRecommendation) {
    if (!studentId) return;
    const prisma = getPrismaClient();
    await prisma.remediationPath.create({
      data: {
        studentId,
        sourceQuestionId,
        sourceKnowledgePointId: recommendation.sourceKnowledgePointId,
        targetKnowledgePointId: recommendation.targetKnowledgePointId,
        reason: recommendation.reason,
        status: "active"
      }
    });
  }

  async createRewardEvent(studentId: string | undefined, reward: RewardEvent) {
    if (!studentId) return;
    const prisma = getPrismaClient();
    await prisma.rewardEvent.create({
      data: {
        studentId,
        eventType: reward.eventType,
        xp: reward.xp,
        gems: reward.gems,
        reason: reward.reason
      }
    });
  }

  async recordReviewTaskRetest(input: {
    studentId?: string;
    reviewTaskId?: string;
    questionId: string;
    answerRecordId: string | null;
    isCorrect: boolean;
  }) {
    if (!input.studentId || !input.reviewTaskId || !input.answerRecordId) return { recorded: false };
    const prisma = getPrismaClient();
    const existingTask = await prisma.remediationPath.findFirst({
      where: {
        id: input.reviewTaskId,
        studentId: input.studentId,
        OR: [{ status: { startsWith: "assigned_review:" } }, { status: { startsWith: "completed_review:" } }]
      },
      select: { retestIsCorrect: true }
    });
    const result = await prisma.remediationPath.updateMany({
      where: {
        id: input.reviewTaskId,
        studentId: input.studentId,
        OR: [{ status: { startsWith: "assigned_review:" } }, { status: { startsWith: "completed_review:" } }]
      },
      data: {
        retestQuestionId: input.questionId,
        retestAnswerRecordId: input.answerRecordId,
        retestIsCorrect: input.isCorrect,
        retestCompletedAt: new Date()
      }
    });
    return {
      recorded: result.count > 0,
      previousRetestIsCorrect: existingTask?.retestIsCorrect ?? undefined
    };
  }

  async hasRewardReason(studentId: string | undefined, reason: string) {
    if (!studentId) return false;
    const prisma = getPrismaClient();
    const count = await prisma.rewardEvent.count({
      where: {
        studentId,
        reason
      }
    });
    return count > 0;
  }
}

export const learningEventRepository: LearningEventRepository = hasDatabaseUrl()
  ? new PrismaLearningEventRepository()
  : new MemoryLearningEventRepository();
