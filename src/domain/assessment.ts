import type { AnswerEvaluation, AnswerInput, BehaviorSignal, TimeAssessment } from "./types";

const NEGATIVE_STUDENT_LABELS = ["乱做", "低投入", "偷懒", "不认真"];

export function assessTime(durationSeconds: number, medianTimeSeconds: number): TimeAssessment {
  const ratio = durationSeconds / medianTimeSeconds;
  if (ratio < 0.25) return "too_fast";
  if (ratio < 0.7) return "fast";
  if (ratio <= 1.5) return "normal";
  if (ratio <= 2.5) return "slow";
  return "stuck";
}

export function inferBehavior(isCorrect: boolean, timeAssessment: TimeAssessment): BehaviorSignal {
  if (isCorrect && (timeAssessment === "too_fast" || timeAssessment === "fast")) return "fluent";
  if (isCorrect && (timeAssessment === "slow" || timeAssessment === "stuck")) return "thoughtful";
  if (!isCorrect && timeAssessment === "too_fast") return "possible_guessing";
  return "review_needed";
}

export function evaluateAnswer(input: AnswerInput): AnswerEvaluation {
  const isCorrect = input.selectedAnswer === input.question.answer;
  const timeAssessment = assessTime(input.durationSeconds, input.question.medianTimeSeconds);
  const behaviorSignal = inferBehavior(isCorrect, timeAssessment);
  const studentFeedback = buildStudentFeedback(input, isCorrect, timeAssessment);
  const encouragement = buildEncouragement(isCorrect, behaviorSignal);
  assertStudentSafeFeedback(studentFeedback);
  assertStudentSafeFeedback(encouragement);

  return {
    isCorrect,
    timeAssessment,
    behaviorSignal,
    studentFeedback,
    encouragement,
    shouldRemediate: !isCorrect
  };
}

function buildStudentFeedback(input: AnswerInput, isCorrect: boolean, timeAssessment: TimeAssessment): string {
  if (isCorrect && (timeAssessment === "too_fast" || timeAssessment === "fast")) {
    return `${input.question.positiveFeedback} 你反应很快，说明这个知识点比较熟。`;
  }

  if (isCorrect && (timeAssessment === "slow" || timeAssessment === "stuck")) {
    return `${input.question.positiveFeedback} 你花时间把推理链走完了，这种认真分析很有价值。`;
  }

  if (isCorrect) {
    return input.question.positiveFeedback;
  }

  if (timeAssessment === "too_fast") {
    return `这题提交得有点快，建议先抓住关键词再判断。${input.question.wrongFeedback}`;
  }

  if (timeAssessment === "slow" || timeAssessment === "stuck") {
    return `你有认真思考的痕迹，问题可能出在前置知识还没连稳。${input.question.wrongFeedback}`;
  }

  return input.question.wrongFeedback;
}

function buildEncouragement(isCorrect: boolean, behaviorSignal: BehaviorSignal): string {
  if (isCorrect && behaviorSignal === "fluent") return "这个点已经比较稳，可以准备挑战更综合的题。";
  if (isCorrect && behaviorSignal === "thoughtful") return "慢慢推出来也是很好的学习成果，说明你的思路在变清楚。";
  if (!isCorrect && behaviorSignal === "possible_guessing") return "先慢半拍看条件，化学题里的关键词常常就是突破口。";
  if (!isCorrect) return "错题已经帮你定位到断点，补上这一环，后面的题会顺很多。";
  return "继续保持这个节奏。";
}

export function assertStudentSafeFeedback(text: string): void {
  const unsafeWord = NEGATIVE_STUDENT_LABELS.find((word) => text.includes(word));
  if (unsafeWord) {
    throw new Error(`Student feedback contains unsafe wording: ${unsafeWord}`);
  }
}
