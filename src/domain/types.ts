export type Grade = "初三" | "高一" | "高二" | "高三";

export type KnowledgeStatus = "untested" | "weak" | "mastered";

export type RelationType =
  | "parent"
  | "prerequisite"
  | "confused_with"
  | "similar_practice"
  | "integrated_application";

export type Difficulty = "basic" | "medium" | "advanced" | "integrated";

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "fill_blank"
  | "short_answer"
  | "calculation"
  | "experiment"
  | "inference";

export type DifficultyFeedback = "easy" | "medium" | "hard";

export type TimeAssessment = "too_fast" | "fast" | "normal" | "slow" | "stuck";

export type BehaviorSignal = "fluent" | "thoughtful" | "review_needed" | "possible_guessing";

export type AuditStatus = "ai_processing" | "pending_review" | "needs_edit" | "approved" | "rejected" | "published";

export type CoreLiteracy =
  | "macro_micro"
  | "change_balance"
  | "evidence_model"
  | "inquiry_innovation"
  | "attitude_responsibility";

export type LeaderboardType =
  | "growth_xp"
  | "streak"
  | "remediation"
  | "review"
  | "breakthrough"
  | "literacy_progress";

export interface KnowledgePoint {
  id: string;
  grade: Grade;
  name: string;
  description: string;
  x: number;
  y: number;
}

export interface KnowledgeRelation {
  fromPointId: string;
  toPointId: string;
  relationType: RelationType;
  weight?: number;
}

export interface QuestionOption {
  label: string;
  text: string;
}

export interface Question {
  id: string;
  grade: Grade;
  stem: string;
  options: QuestionOption[];
  answer: string;
  analysis: string;
  difficulty: Difficulty;
  medianTimeSeconds: number;
  auditStatus: AuditStatus;
  primaryKnowledgePointId: string;
  prerequisiteKnowledgePointIds: string[];
  coreLiteracy: CoreLiteracy[];
  abilityTarget: string;
  positiveFeedback: string;
  wrongFeedback: string;
}

export interface AnswerInput {
  question: Question;
  selectedAnswer: string;
  durationSeconds: number;
  difficultyFeedback?: DifficultyFeedback;
}

export interface AnswerEvaluation {
  isCorrect: boolean;
  timeAssessment: TimeAssessment;
  behaviorSignal: BehaviorSignal;
  studentFeedback: string;
  encouragement: string;
  shouldRemediate: boolean;
}

export interface RemediationRecommendation {
  sourceKnowledgePointId: string;
  targetKnowledgePointId: string;
  pathText: string;
  reason: string;
  keyHint: string;
}

export interface RewardEvent {
  eventType:
    | "question_correct"
    | "remediation_completed"
    | "review_completed"
    | "breakthrough"
    | "literacy_progress"
    | "streak";
  xp: number;
  gems: number;
  reason: string;
}

export interface LeaderboardEntry {
  studentName: string;
  leaderboardType: LeaderboardType;
  score: number;
  rank: number;
  description: string;
}
