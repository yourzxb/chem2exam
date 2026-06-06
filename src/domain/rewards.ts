import type { RewardEvent } from "./types";

export const rewardRules = {
  questionCorrect: { xp: 2, gems: 0 },
  remediationCompleted: { xp: 20, gems: 3 },
  reviewCompleted: { xp: 15, gems: 2 },
  breakthrough: { xp: 30, gems: 5 },
  literacyProgress: { xp: 25, gems: 4 },
  streak: { xp: 10, gems: 1 }
} as const;

export function createQuestionCorrectReward(): RewardEvent {
  return {
    eventType: "question_correct",
    xp: rewardRules.questionCorrect.xp,
    gems: rewardRules.questionCorrect.gems,
    reason: "答对题目，获得少量基础奖励"
  };
}

export function createRemediationReward(): RewardEvent {
  return {
    eventType: "remediation_completed",
    xp: rewardRules.remediationCompleted.xp,
    gems: rewardRules.remediationCompleted.gems,
    reason: "补清前置知识，这是高价值成长行为"
  };
}

export function createReviewCompletedReward(): RewardEvent {
  return {
    eventType: "review_completed",
    xp: rewardRules.reviewCompleted.xp,
    gems: rewardRules.reviewCompleted.gems,
    reason: "完成错题复盘，把原来的断点变成了下一次进步的起点"
  };
}

export function createBreakthroughReward(): RewardEvent {
  return {
    eventType: "breakthrough",
    xp: rewardRules.breakthrough.xp,
    gems: rewardRules.breakthrough.gems,
    reason: "完成从“难”到“会”的突破"
  };
}

export function createVariantChallengeReward(): RewardEvent {
  return {
    eventType: "breakthrough",
    xp: rewardRules.breakthrough.xp,
    gems: rewardRules.breakthrough.gems,
    reason: "完成变式题挑战，把方法迁移到新情境"
  };
}

export function createPrerequisiteConsolidationReward(): RewardEvent {
  return {
    eventType: "remediation_completed",
    xp: rewardRules.remediationCompleted.xp,
    gems: rewardRules.remediationCompleted.gems,
    reason: "完成前置知识巩固，把关键条件补得更稳"
  };
}

export function createCoreLiteracyGoalReward(label: string): RewardEvent {
  return {
    eventType: "literacy_progress",
    xp: rewardRules.literacyProgress.xp,
    gems: rewardRules.literacyProgress.gems,
    reason: `完成核心素养目标：${label}`
  };
}
