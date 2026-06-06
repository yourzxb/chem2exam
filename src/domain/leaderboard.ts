import type { LeaderboardEntry, RewardEvent } from "./types";

export function growthScore(events: RewardEvent[]): number {
  return events.reduce((total, event) => total + event.xp, 0);
}

export function buildDemoLeaderboard(): LeaderboardEntry[] {
  return [
    {
      studentName: "林同学",
      leaderboardType: "growth_xp",
      score: 148,
      rank: 1,
      description: "本周完成 5 次补链和 3 次错题复盘"
    },
    {
      studentName: "你",
      leaderboardType: "growth_xp",
      score: 126,
      rank: 2,
      description: "本周补清 3 个知识断点"
    },
    {
      studentName: "周同学",
      leaderboardType: "growth_xp",
      score: 111,
      rank: 3,
      description: "完成 2 次从难到会突破"
    }
  ];
}
