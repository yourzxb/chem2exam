const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:4174";

const checks = [
  {
    path: "/",
    includes: ["化学个性化学习诊断系统", "/student", "/teacher", "/admin", "/review", "演示账号"]
  },
  {
    path: "/student",
    includes: ["学生端", "演示账号", "知识图谱"]
  },
  {
    path: "/teacher",
    includes: ["老师端", "演示账号", "老师账号"]
  },
  {
    path: "/admin",
    includes: ["管理端", "演示账号", "管理员账号"]
  },
  {
    path: "/review",
    includes: ["AI 结果审核队列", "演示账号", "审核员登录"]
  }
];

async function main() {
  const results = [];
  for (const check of checks) {
    const url = new URL(check.path, baseUrl);
    const response = await fetch(url);
    assert(response.ok, `${check.path} expected 200, got ${response.status}`);
    const text = await response.text();
    for (const expected of check.includes) {
      assert(text.includes(expected), `${check.path} missing expected text: ${expected}`);
    }
    results.push({ path: check.path, status: response.status, checkedText: check.includes.length });
  }

  console.log(JSON.stringify({ ok: true, baseUrl, pages: results }, null, 2));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
