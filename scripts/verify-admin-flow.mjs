import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:4174";
const username = `admin_flow_${Date.now()}`;
const password = "123456";

async function main() {
  const { cookie, user } = await registerAdmin();
  const teacherAccount = await registerUser("teacher");
  const otherTeacherAccount = await registerUser("teacher");
  const studentAccount = await registerUser("student");
  const secondStudentAccount = await registerUser("student");
  const schoolResult = await postJson(cookie, "/api/admin/schools", {
    name: `验证学校 ${Date.now()}`,
    region: "本地验收"
  });
  const classResult = await postJson(cookie, "/api/admin/classes", {
    schoolId: schoolResult.school.id,
    name: "初三授权验收班",
    grade: "初三"
  });
  const teacherSearch = await getJson(cookie, `/api/admin/users?role=teacher&q=${encodeURIComponent(teacherAccount.user.username)}`);
  assert(teacherSearch.users.some((item) => item.id === teacherAccount.user.id), "expected admin user search to find teacher");
  assert(!JSON.stringify(teacherSearch.users).includes("passwordHash"), "admin user search must not return password hashes");
  const studentSearch = await getJson(cookie, `/api/admin/users?role=student&q=${encodeURIComponent(secondStudentAccount.user.username)}`);
  assert(studentSearch.users.some((item) => item.id === secondStudentAccount.user.id), "expected admin user search to find student");
  const assignmentResult = await postJson(cookie, `/api/admin/classes/${classResult.classGroup.id}/teachers`, {
    teacherId: teacherAccount.user.id,
    role: "teacher"
  });
  assert(assignmentResult.assignment.classId === classResult.classGroup.id, "expected teacher class assignment");
  assert(assignmentResult.assignment.role === "teacher", "expected default teacher class role");
  const classTeachers = await getJson(cookie, `/api/admin/classes/${classResult.classGroup.id}/teachers`);
  assert(
    classTeachers.assignments.some((assignment) => assignment.teacherId === teacherAccount.user.id && assignment.role === "teacher"),
    "expected admin to list class teacher assignments"
  );
  const invalidRoleUpdate = await fetch(`${baseUrl}/api/admin/classes/${classResult.classGroup.id}/teachers`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({
      teacherId: teacherAccount.user.id,
      role: "school_owner"
    })
  });
  assert(!invalidRoleUpdate.ok, "invalid teacher class role must be rejected");
  const roleUpdate = await patchJson(cookie, `/api/admin/classes/${classResult.classGroup.id}/teachers`, {
    teacherId: teacherAccount.user.id,
    role: "head_teacher"
  });
  assert(roleUpdate.assignment.role === "head_teacher", "expected teacher role to update to head_teacher");
  const studentClassResult = await postJson(cookie, `/api/admin/classes/${classResult.classGroup.id}/students`, {
    studentId: studentAccount.user.id
  });
  assert(studentClassResult.classGroup.id === classResult.classGroup.id, "expected student class assignment");
  const batchStudentResult = await postJson(cookie, `/api/admin/classes/${classResult.classGroup.id}/students/batch`, {
    identifiers: [secondStudentAccount.user.username, teacherAccount.user.username, "missing_student_identifier"]
  });
  assert(batchStudentResult.result.assignedCount === 1, "expected batch student assignment to add one student");
  assert(batchStudentResult.result.notFound.includes("missing_student_identifier"), "expected missing batch student identifier");
  assert(
    batchStudentResult.result.notStudent.some((item) => item.identifier === teacherAccount.user.username && item.role === "teacher"),
    "expected batch student assignment to skip non-student account"
  );
  const teacherClassReport = await getJson(teacherAccount.cookie, `/api/teacher/classes/overview?classId=${classResult.classGroup.id}`);
  assert(teacherClassReport.report.classId === classResult.classGroup.id, "assigned teacher should read explicit class report");
  const deniedClassReport = await fetch(`${baseUrl}/api/teacher/classes/overview?classId=${classResult.classGroup.id}`, {
    headers: { Cookie: otherTeacherAccount.cookie }
  });
  assert(deniedClassReport.status === 403, "unassigned teacher must not read explicit class report");
  const studentMembership = await prisma.user.findUnique({ where: { id: studentAccount.user.id } });
  const secondStudentMembership = await prisma.user.findUnique({ where: { id: secondStudentAccount.user.id } });
  assert(studentMembership?.classId === classResult.classGroup.id, "student should be stored with classId");
  assert(secondStudentMembership?.classId === classResult.classGroup.id, "batch student should be stored with classId");
  const teacherAssignment = await prisma.teacherClassAssignment.findUnique({
    where: {
      teacherId_classId: {
        teacherId: teacherAccount.user.id,
        classId: classResult.classGroup.id
      }
    }
  });
  assert(teacherAssignment?.status === "active", "teacher assignment should be active");
  assert(teacherAssignment?.role === "head_teacher", "teacher assignment role should be head_teacher after update");
  const organizationAuditCount = await prisma.auditRecord.count({
    where: {
      reviewerId: user.id,
      action: {
        in: [
          "admin_create_school",
          "admin_create_class",
          "admin_assign_teacher_class",
          "admin_update_teacher_class_role",
          "admin_assign_student_class"
        ]
      }
    }
  });
  assert(organizationAuditCount >= 5, "expected organization audit records");

  const schoolSummary = await getJson(cookie, `/api/admin/schools/summary?schoolId=${encodeURIComponent(schoolResult.school.id)}`);
  const schoolSummaryItem = schoolSummary.report.schools.find((school) => school.schoolId === schoolResult.school.id);
  assert(schoolSummary.report.scope.schoolId === schoolResult.school.id, "expected school summary scope for created school");
  assert(schoolSummaryItem, "expected school summary for created school");
  assert(schoolSummaryItem.classCount >= 1, "expected school summary to count classes");
  assert(schoolSummaryItem.studentCount >= 2, "expected school summary to count students");
  assert(schoolSummaryItem.teacherCount >= 1, "expected school summary to count teachers");
  assert(Array.isArray(schoolSummary.report.totals.weakCoreLiteracy), "expected school summary weak core literacy array");
  const deniedSchoolSummary = await fetch(`${baseUrl}/api/admin/schools/summary?schoolId=${encodeURIComponent(schoolResult.school.id)}`, {
    headers: { Cookie: teacherAccount.cookie }
  });
  assert(deniedSchoolSummary.status === 403, "school summary must be admin-only");
  const schoolSummaryCsv = await fetchCsv(cookie, `/api/admin/schools/summary/export?schoolId=${encodeURIComponent(schoolResult.school.id)}`);
  assert(schoolSummaryCsv.includes("rowType"), "expected school summary CSV header");
  assert(schoolSummaryCsv.includes(schoolResult.school.id), "expected school summary CSV to include school id");
  assert(!schoolSummaryCsv.includes("apiKey"), "school summary CSV must not expose sensitive config fields");

  const listBefore = await getJson(cookie, "/api/admin/questions");
  const target = listBefore.questions.find((question) => question.id === "q_ai_pending_1") ?? listBefore.questions[0];
  assert(target, "expected at least one question to update");
  const filteredByType = await getJson(cookie, "/api/admin/questions?questionType=single_choice");
  assert(filteredByType.questions.every((question) => question.questionType === "single_choice"), "expected question type filter");
  const filteredByGrade = await getJson(cookie, `/api/admin/questions?grade=${encodeURIComponent("初三")}`);
  assert(filteredByGrade.questions.every((question) => question.grade === "初三"), "expected grade filter");
  const filteredByKnowledge = await getJson(cookie, "/api/admin/questions?knowledgePointId=indicator");
  assert(
    filteredByKnowledge.questions.every((question) => question.primaryKnowledgePointId === "indicator"),
    "expected knowledge point filter"
  );

  const personalScheme = await postJson(cookie, "/api/admin/question-filter-schemes", {
    name: "验证个人待维护题",
    scopeType: "personal",
    filters: {
      status: "all",
      grade: "all",
      questionType: "all",
      knowledgePointId: ""
    }
  });
  const roleScheme = await postJson(cookie, "/api/admin/question-filter-schemes", {
    name: "验证管理员角色模板",
    scopeType: "role",
    filters: {
      status: "all",
      grade: "all",
      questionType: "single_choice",
      knowledgePointId: ""
    }
  });
  const sharedScheme = await postJson(cookie, "/api/admin/question-filter-schemes", {
    name: "验证共享方案",
    scopeType: "shared",
    filters: {
      status: "all",
      grade: "初三",
      questionType: "all",
      knowledgePointId: ""
    }
  });
  const schemes = await getJson(cookie, "/api/admin/question-filter-schemes");
  assert(schemes.schemes.some((scheme) => scheme.id === personalScheme.scheme.id && scheme.scopeType === "personal"), "expected personal filter scheme");
  assert(schemes.schemes.some((scheme) => scheme.id === roleScheme.scheme.id && scheme.scopeType === "role"), "expected role filter scheme");
  assert(schemes.schemes.some((scheme) => scheme.id === sharedScheme.scheme.id && scheme.scopeType === "shared"), "expected shared filter scheme");
  const updatedScheme = await patchJson(cookie, `/api/admin/question-filter-schemes/${personalScheme.scheme.id}`, {
    name: "验证个人待维护题更新",
    scopeType: "personal",
    filters: {
      status: "needs_edit",
      grade: "all",
      questionType: "all",
      knowledgePointId: ""
    }
  });
  assert(updatedScheme.scheme.filters.status === "needs_edit", "expected filter scheme update");

  const nextStem = `${target.stem}（管理端验证维护）`;
  const nextAnswer = "管理端验证答案";
  const nextAnalysis = "管理端验证解析：人工确认答案、解析和核心素养标签。";
  const update = await patchJson(cookie, `/api/admin/questions/${target.id}`, {
    auditStatus: "needs_edit",
    difficulty: "advanced",
    medianTimeSeconds: 88,
    primaryKnowledgePointId: "indicator",
    questionType: "short_answer",
    stem: nextStem,
    answer: nextAnswer,
    analysis: nextAnalysis,
    coreLiteracy: ["evidence_model", "inquiry_innovation"]
  });

  assert(update.question.auditStatus === "needs_edit", "expected question audit status to update");
  assert(update.question.difficulty === "advanced", "expected reviewed difficulty to update");
  assert(update.question.medianTimeSeconds === 88, "expected median time to update");
  assert(update.question.primaryKnowledgePointId === "indicator", "expected primary knowledge point to update");
  assert(update.question.questionType === "short_answer", "expected question type to update");
  assert(update.question.answer === nextAnswer, "expected answer to update");
  assert(update.question.analysis === nextAnalysis, "expected analysis to update");
  assert(update.question.coreLiteracy.includes("evidence_model"), "expected core literacy to update");
  assert(update.question.coreLiteracy.includes("inquiry_innovation"), "expected second core literacy tag to update");

  const row = await prisma.question.findUnique({
    where: { id: target.id },
    include: { knowledgeLinks: true, literacyLinks: true }
  });
  assert(row?.auditStatus === "needs_edit", "expected database audit status to update");
  assert(row?.questionType === "short_answer", "expected database question type to update");
  assert(row?.reviewedDifficulty === "advanced", "expected database reviewed difficulty to update");
  assert(row?.medianTimeSeconds === 88, "expected database median time to update");
  assert(row?.knowledgeLinks.some((link) => link.linkType === "primary" && link.knowledgePointId === "indicator" && link.source === "human"), "expected human primary knowledge link");
  assert(row?.answer === nextAnswer, "expected database answer to update");
  assert(row?.analysis === nextAnalysis, "expected database analysis to update");
  assert(row?.literacyLinks.some((link) => link.literacyTag === "inquiry_innovation" && link.source === "human"), "expected human literacy link");

  const audit = await prisma.auditRecord.findFirst({
    where: {
      targetId: target.id,
      reviewerId: user.id,
      action: "admin_update_question"
    },
    orderBy: { createdAt: "desc" }
  });
  assert(audit, "expected admin update audit record");

  const batchTargets = [target.id];
  const rejectedPublishPreview = await fetch(`${baseUrl}/api/admin/questions/batch-preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({
      questionIds: batchTargets,
      auditStatus: "published",
      difficulty: "medium"
    })
  });
  assert(!rejectedPublishPreview.ok, "batch publish must not bypass first-review boundary");

  const batchPreview = await postJson(cookie, "/api/admin/questions/batch-preview", {
    questionIds: batchTargets,
    auditStatus: "needs_edit",
    difficulty: "medium",
    primaryKnowledgePointId: "acid_base",
    coreLiteracy: ["macro_micro", "attitude_responsibility"]
  });
  assert(batchPreview.preview.previewToken, "expected batch preview token");
  assert(batchPreview.preview.selectedCount === batchTargets.length, "expected batch preview selected count");

  const rejectedNoPreview = await fetch(`${baseUrl}/api/admin/questions/batch-update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({
      questionIds: batchTargets,
      auditStatus: "needs_edit",
      difficulty: "medium",
      primaryKnowledgePointId: "acid_base",
      coreLiteracy: ["macro_micro", "attitude_responsibility"],
      reason: "验证无预览不得提交",
      confirmText: "确认批量更新"
    })
  });
  assert(!rejectedNoPreview.ok, "batch update must require preview token");

  const batchUpdate = await postJson(cookie, "/api/admin/questions/batch-update", {
    questionIds: batchTargets,
    auditStatus: "needs_edit",
    difficulty: "medium",
    primaryKnowledgePointId: "acid_base",
    coreLiteracy: ["macro_micro", "attitude_responsibility"],
    previewToken: batchPreview.preview.previewToken,
    reason: "验证批量维护必须带原因和确认文本",
    confirmText: "确认批量更新"
  });
  assert(batchUpdate.result.updatedCount === batchTargets.length, "expected batch update count");
  assert(batchUpdate.result.batchOperationId, "expected batch operation id");
  const batchLinkedQuestions = await prisma.question.findMany({
    where: { id: { in: batchTargets } },
    include: { knowledgeLinks: true, literacyLinks: true }
  });
  assert(
    batchLinkedQuestions.every((question) =>
      question.knowledgeLinks.some((link) => link.linkType === "primary" && link.knowledgePointId === "acid_base" && link.source === "human")
    ),
    "expected batch human primary knowledge links"
  );
  assert(
    batchLinkedQuestions.every((question) =>
      question.literacyLinks.some((link) => link.literacyTag === "attitude_responsibility" && link.source === "human")
    ),
    "expected batch human core literacy links"
  );
  const batchAuditCount = await prisma.auditRecord.count({
    where: {
      targetId: { in: batchTargets },
      reviewerId: user.id,
      action: "admin_batch_update_question"
    }
  });
  assert(batchAuditCount >= batchTargets.length, "expected batch update audit records");
  const auditByBatch = await getJson(cookie, `/api/admin/audit-records?batchId=${encodeURIComponent(batchUpdate.result.batchOperationId)}`);
  assert(auditByBatch.records.length >= batchTargets.length, "expected audit records by batch id");
  const auditByTarget = await getJson(cookie, `/api/admin/audit-records?targetId=${encodeURIComponent(batchTargets[0])}`);
  assert(auditByTarget.records.some((record) => record.targetId === batchTargets[0]), "expected audit records by target id");
  const auditByAction = await getJson(cookie, "/api/admin/audit-records?action=admin_batch_update_question");
  assert(auditByAction.records.some((record) => record.action === "admin_batch_update_question"), "expected audit records by action");

  const schemePreview = await postJson(cookie, "/api/admin/questions/batch-preview", {
    filterSchemeId: sharedScheme.scheme.id,
    difficulty: "medium"
  });
  assert(schemePreview.preview.filterSchemeId === sharedScheme.scheme.id, "expected scheme-backed batch preview");
  const deletedScheme = await fetch(`${baseUrl}/api/admin/question-filter-schemes/${roleScheme.scheme.id}`, {
    method: "DELETE",
    headers: { Cookie: cookie }
  });
  assert(deletedScheme.ok, "expected filter scheme delete");

  const studentNext = await fetch(`${baseUrl}/api/student/questions/next?grade=${encodeURIComponent(update.question.grade)}&knowledgePointId=indicator`);
  if (studentNext.ok) {
    const data = await studentNext.json();
    assert(data.question?.id !== target.id, "needs_edit question must not appear in student practice");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        adminUserId: user.id,
        schoolId: schoolResult.school.id,
        classId: classResult.classGroup.id,
        teacherAssignmentId: assignmentResult.assignment.id,
        teacherClassRole: roleUpdate.assignment.role,
        schoolSummaryClassCount: schoolSummaryItem.classCount,
        schoolSummaryStudentCount: schoolSummaryItem.studentCount,
        schoolSummaryTeacherCount: schoolSummaryItem.teacherCount,
        batchStudentAssignedCount: batchStudentResult.result.assignedCount,
        schoolSummaryCsvBytes: schoolSummaryCsv.length,
        questionId: target.id,
        auditStatus: update.question.auditStatus,
        questionType: update.question.questionType,
        primaryKnowledgePointId: update.question.primaryKnowledgePointId,
        coreLiteracy: update.question.coreLiteracy,
        batchUpdatedCount: batchUpdate.result.updatedCount,
        batchOperationId: batchUpdate.result.batchOperationId,
        batchPrimaryKnowledgePointId: "acid_base",
        batchCoreLiteracy: ["macro_micro", "attitude_responsibility"],
        auditRecordId: audit.id,
        filterSchemeScopes: schemes.schemes.map((scheme) => scheme.scopeType)
      },
      null,
      2
    )
  );
}

async function registerAdmin() {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role: "admin" })
  });
  if (!response.ok) {
    throw new Error(`admin register failed: ${response.status} ${await response.text()}`);
  }
  const cookie = response.headers.get("set-cookie");
  assert(cookie, "admin register response did not set a session cookie");
  const { user } = await response.json();
  return { cookie, user };
}

async function registerUser(role) {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: `${role}_flow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, password, role })
  });
  if (!response.ok) {
    throw new Error(`${role} register failed: ${response.status} ${await response.text()}`);
  }
  const cookie = response.headers.get("set-cookie");
  assert(cookie, `${role} register response did not set a session cookie`);
  const { user } = await response.json();
  return { cookie, user };
}

async function getJson(cookie, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function fetchCsv(cookie, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("text/csv"), `expected CSV content type for ${path}`);
  return response.text();
}

async function patchJson(cookie, path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function postJson(cookie, path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
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
