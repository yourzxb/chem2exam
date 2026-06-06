import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:4174";
const username = `verify_${Date.now()}`;
const password = "123456";

async function main() {
  const register = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!register.ok) {
    throw new Error(`register failed: ${register.status} ${await register.text()}`);
  }
  const cookie = register.headers.get("set-cookie");
  assert(cookie, "register response did not set a session cookie");
  const { user } = await register.json();

  const wrongAnswer = await submitAnswer(cookie, {
    questionId: "q_acid_base_1",
    selectedAnswer: "A",
    durationSeconds: 18,
    difficultyFeedback: "hard"
  });
  assert(wrongAnswer.isCorrect === false, "wrong answer should be evaluated as incorrect");
  assert(wrongAnswer.remediation?.needed === true, "wrong answer should trigger remediation");

  const correctAnswer = await submitAnswer(cookie, {
    questionId: "q_indicator_1",
    selectedAnswer: "A",
    durationSeconds: 28,
    difficultyFeedback: "medium"
  });
  assert(correctAnswer.isCorrect === true, "correct answer should be evaluated as correct");
  assert(correctAnswer.reward?.xp > 0, "correct answer should create a reward");

  const [answers, remediations, rewards] = await Promise.all([
    prisma.answerRecord.count({ where: { studentId: user.id } }),
    prisma.remediationPath.count({ where: { studentId: user.id } }),
    prisma.rewardEvent.count({ where: { studentId: user.id } })
  ]);

  assert(answers >= 2, `expected at least 2 answer records, found ${answers}`);
  assert(remediations >= 1, `expected at least 1 remediation path, found ${remediations}`);
  assert(rewards >= 1, `expected at least 1 reward event, found ${rewards}`);

  const reportResponse = await fetch(`${baseUrl}/api/student/reports/latest`, {
    headers: { Cookie: cookie }
  });
  if (!reportResponse.ok) {
    throw new Error(`report failed: ${reportResponse.status} ${await reportResponse.text()}`);
  }
  const { report } = await reportResponse.json();
  assert(report.totalAnswers >= 2, `expected report to include answers, found ${report.totalAnswers}`);
  assert(report.remediationCount >= 1, `expected report to include remediation, found ${report.remediationCount}`);
  assert(report.totalXp > 0, `expected report to include reward XP, found ${report.totalXp}`);

  const leaderboardResponse = await fetch(`${baseUrl}/api/student/leaderboard?limit=100`);
  if (!leaderboardResponse.ok) {
    throw new Error(`leaderboard failed: ${leaderboardResponse.status} ${await leaderboardResponse.text()}`);
  }
  const leaderboard = await leaderboardResponse.json();
  assert(
    leaderboard.entries.some((entry) => entry.studentName === username),
    "expected leaderboard to include verification student"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId: user.id,
        username,
        answerRecords: answers,
        remediationPaths: remediations,
        rewardEvents: rewards,
        reportAnswers: report.totalAnswers,
        leaderboardEntries: leaderboard.entries.length
      },
      null,
      2
    )
  );
}

async function submitAnswer(cookie, payload) {
  const response = await fetch(`${baseUrl}/api/student/answers/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({
      ...payload,
      startedAt: new Date(Date.now() - payload.durationSeconds * 1000).toISOString()
    })
  });
  if (!response.ok) {
    throw new Error(`answer submit failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
