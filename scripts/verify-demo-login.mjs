const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:4174";
const demoSecret = process.env.DEMO_LOGIN_SECRET ?? "Chem2Exam@2026";

const checks = [
  {
    label: "student",
    username: "demo_student_01",
    expectedRole: "student",
    accessPath: "/api/student/reports/latest"
  },
  {
    label: "teacher",
    username: "demo_teacher",
    expectedRole: "teacher",
    accessPath: "/api/teacher/classes"
  },
  {
    label: "admin",
    username: "demo_admin",
    expectedRole: "admin",
    accessPath: "/api/admin/schools"
  },
  {
    label: "reviewer",
    username: "demo_admin",
    expectedRole: "admin",
    accessPath: "/api/review/questions?limit=1"
  }
];

async function main() {
  const results = [];
  for (const check of checks) {
    const cookieHeader = await login(check);
    const me = await fetchJson("/api/auth/me", { headers: { Cookie: cookieHeader } });
    assert(me.user?.username === check.username, `${check.label} current user mismatch`);
    assert(me.user?.role === check.expectedRole, `${check.label} role mismatch`);

    const accessResponse = await fetch(new URL(check.accessPath, baseUrl), {
      headers: { Cookie: cookieHeader }
    });
    assert(accessResponse.ok, `${check.label} access expected 200, got ${accessResponse.status}`);
    results.push({ label: check.label, username: check.username, role: check.expectedRole });
  }

  console.log(JSON.stringify({ ok: true, baseUrl, accounts: results }, null, 2));
}

async function login(check) {
  const response = await fetch(new URL("/api/auth/login", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: check.username, password: demoSecret })
  });
  assert(response.ok, `${check.label} login expected 200, got ${response.status}`);
  const cookieHeader = getCookieHeader(response);
  assert(cookieHeader, `${check.label} login did not return a session cookie`);
  return cookieHeader;
}

async function fetchJson(path, init) {
  const response = await fetch(new URL(path, baseUrl), init);
  assert(response.ok, `${path} expected 200, got ${response.status}`);
  return response.json();
}

function getCookieHeader(response) {
  const getSetCookie = response.headers.getSetCookie?.();
  if (getSetCookie?.length) return getSetCookie.join("; ");
  return response.headers.get("set-cookie") ?? "";
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
