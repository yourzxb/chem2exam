import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";
import type { Grade } from "@/domain/types";

export interface SchoolSummaryFilters {
  schoolId?: string;
}

export interface SchoolWeakCoreLiteracySummary {
  literacyTag: string;
  label: string;
  answerCount: number;
  wrongCount: number;
  wrongRate: number;
  suggestion: string;
}

export interface SchoolClassSummary {
  classId: string;
  schoolId: string;
  schoolName: string;
  className: string;
  grade?: Grade;
  studentCount: number;
  teacherCount: number;
  answerCount: number;
  correctCount: number;
  accuracy: number;
  remediationCount: number;
}

export interface SchoolSummaryItem {
  schoolId: string;
  schoolName: string;
  region?: string;
  classCount: number;
  studentCount: number;
  teacherCount: number;
  answerCount: number;
  correctCount: number;
  accuracy: number;
  remediationCount: number;
  weakCoreLiteracy: SchoolWeakCoreLiteracySummary[];
  classes: SchoolClassSummary[];
}

export interface SchoolSummaryReport {
  generatedAt: string;
  scope: {
    schoolId?: string;
  };
  totals: Omit<SchoolSummaryItem, "schoolId" | "schoolName" | "region" | "classes">;
  schools: SchoolSummaryItem[];
}

export interface SchoolSummaryRepository {
  getSummary(filters?: SchoolSummaryFilters): Promise<SchoolSummaryReport>;
  exportCsv(filters?: SchoolSummaryFilters): Promise<string>;
}

class EmptySchoolSummaryRepository implements SchoolSummaryRepository {
  async getSummary(filters: SchoolSummaryFilters = {}) {
    return createEmptyReport(filters);
  }

  async exportCsv(filters: SchoolSummaryFilters = {}) {
    return reportToCsv(createEmptyReport(filters));
  }
}

class PrismaSchoolSummaryRepository implements SchoolSummaryRepository {
  async getSummary(filters: SchoolSummaryFilters = {}) {
    const prisma = getPrismaClient();
    const schools = await prisma.school.findMany({
      where: {
        status: "active",
        ...(filters.schoolId ? { id: filters.schoolId } : {})
      },
      include: {
        classes: {
          where: { status: "active" },
          orderBy: [{ createdAt: "desc" }]
        },
        teacherAssignments: {
          where: { status: "active" },
          select: { teacherId: true }
        }
      },
      orderBy: [{ createdAt: "desc" }]
    });

    const summaryItems = await Promise.all(
      schools.map(async (school) => {
        const classSummaries = await Promise.all(
          school.classes.map(async (classGroup) => {
            const students = await prisma.user.findMany({
              where: {
                role: "student",
                status: "active",
                schoolId: school.id,
                classId: classGroup.id
              },
              select: { id: true }
            });
            const studentIds = students.map((student) => student.id);
            const [teacherCount, answers, remediationCount] = await Promise.all([
              prisma.teacherClassAssignment.count({
                where: { schoolId: school.id, classId: classGroup.id, status: "active" }
              }),
              studentIds.length
                ? prisma.answerRecord.findMany({
                    where: { studentId: { in: studentIds } },
                    select: {
                      isCorrect: true,
                      question: {
                        select: {
                          literacyLinks: {
                            select: { literacyTag: true }
                          }
                        }
                      }
                    }
                  })
                : Promise.resolve([]),
              studentIds.length
                ? prisma.remediationPath.count({
                    where: { studentId: { in: studentIds } }
                  })
                : Promise.resolve(0)
            ]);
            const correctCount = answers.filter((answer) => answer.isCorrect).length;
            return {
              classId: classGroup.id,
              schoolId: school.id,
              schoolName: school.name,
              className: classGroup.name,
              grade: fromPrismaGrade(classGroup.grade),
              studentCount: studentIds.length,
              teacherCount,
              answerCount: answers.length,
              correctCount,
              accuracy: calculateAccuracy(correctCount, answers.length),
              remediationCount,
              answers
            };
          })
        );
        const allAnswers = classSummaries.flatMap((classGroup) => classGroup.answers);
        const correctCount = classSummaries.reduce((total, classGroup) => total + classGroup.correctCount, 0);
        const answerCount = classSummaries.reduce((total, classGroup) => total + classGroup.answerCount, 0);
        return {
          schoolId: school.id,
          schoolName: school.name,
          region: school.region ?? undefined,
          classCount: school.classes.length,
          studentCount: classSummaries.reduce((total, classGroup) => total + classGroup.studentCount, 0),
          teacherCount: new Set(school.teacherAssignments.map((assignment) => assignment.teacherId)).size,
          answerCount,
          correctCount,
          accuracy: calculateAccuracy(correctCount, answerCount),
          remediationCount: classSummaries.reduce((total, classGroup) => total + classGroup.remediationCount, 0),
          weakCoreLiteracy: summarizeWeakCoreLiteracy(allAnswers),
          classes: classSummaries.map(({ answers: _answers, ...classGroup }) => classGroup)
        };
      })
    );

    return {
      generatedAt: new Date().toISOString(),
      scope: filters.schoolId ? { schoolId: filters.schoolId } : {},
      totals: summarizeTotals(summaryItems),
      schools: summaryItems
    };
  }

  async exportCsv(filters: SchoolSummaryFilters = {}) {
    return reportToCsv(await this.getSummary(filters));
  }
}

function summarizeTotals(items: SchoolSummaryItem[]): SchoolSummaryReport["totals"] {
  const classCount = items.reduce((total, item) => total + item.classCount, 0);
  const studentCount = items.reduce((total, item) => total + item.studentCount, 0);
  const teacherCount = items.reduce((total, item) => total + item.teacherCount, 0);
  const answerCount = items.reduce((total, item) => total + item.answerCount, 0);
  const correctCount = items.reduce((total, item) => total + item.correctCount, 0);
  const remediationCount = items.reduce((total, item) => total + item.remediationCount, 0);
  const weakCoreLiteracy = summarizeWeakCoreLiteracyFromItems(items);
  return {
    classCount,
    studentCount,
    teacherCount,
    answerCount,
    correctCount,
    accuracy: calculateAccuracy(correctCount, answerCount),
    remediationCount,
    weakCoreLiteracy
  };
}

function summarizeWeakCoreLiteracy(answers: Array<{ isCorrect: boolean; question?: { literacyLinks?: Array<{ literacyTag: string }> } | null }>) {
  const grouped = new Map<string, { answerCount: number; wrongCount: number }>();
  for (const answer of answers) {
    const tags = answer.question?.literacyLinks?.map((link) => link.literacyTag).filter(Boolean) ?? [];
    for (const tag of tags.length ? tags : ["evidence_model"]) {
      const current = grouped.get(tag) ?? { answerCount: 0, wrongCount: 0 };
      current.answerCount += 1;
      if (!answer.isCorrect) current.wrongCount += 1;
      grouped.set(tag, current);
    }
  }
  return normalizeWeakCoreLiteracy(grouped);
}

function summarizeWeakCoreLiteracyFromItems(items: SchoolSummaryItem[]) {
  const grouped = new Map<string, { answerCount: number; wrongCount: number }>();
  for (const item of items) {
    for (const literacy of item.weakCoreLiteracy) {
      const current = grouped.get(literacy.literacyTag) ?? { answerCount: 0, wrongCount: 0 };
      current.answerCount += literacy.answerCount;
      current.wrongCount += literacy.wrongCount;
      grouped.set(literacy.literacyTag, current);
    }
  }
  return normalizeWeakCoreLiteracy(grouped);
}

function normalizeWeakCoreLiteracy(grouped: Map<string, { answerCount: number; wrongCount: number }>): SchoolWeakCoreLiteracySummary[] {
  return Array.from(grouped.entries())
    .filter(([, stats]) => stats.wrongCount > 0)
    .map(([literacyTag, stats]) => ({
      literacyTag,
      label: literacyText(literacyTag),
      answerCount: stats.answerCount,
      wrongCount: stats.wrongCount,
      wrongRate: calculateAccuracy(stats.wrongCount, stats.answerCount),
      suggestion: buildLiteracySuggestion(literacyTag)
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate || b.wrongCount - a.wrongCount)
    .slice(0, 5);
}

function reportToCsv(report: SchoolSummaryReport) {
  const rows = [
    [
      "rowType",
      "schoolId",
      "schoolName",
      "classId",
      "className",
      "grade",
      "classCount",
      "studentCount",
      "teacherCount",
      "answerCount",
      "correctCount",
      "accuracy",
      "remediationCount",
      "literacyTag",
      "literacyLabel",
      "wrongCount",
      "wrongRate"
    ],
    [
      "total",
      report.scope.schoolId ?? "all",
      "全部学校",
      "",
      "",
      "",
      String(report.totals.classCount),
      String(report.totals.studentCount),
      String(report.totals.teacherCount),
      String(report.totals.answerCount),
      String(report.totals.correctCount),
      `${report.totals.accuracy}%`,
      String(report.totals.remediationCount),
      "",
      "",
      "",
      ""
    ],
    ...report.schools.flatMap((school) => [
      [
        "school",
        school.schoolId,
        school.schoolName,
        "",
        "",
        "",
        String(school.classCount),
        String(school.studentCount),
        String(school.teacherCount),
        String(school.answerCount),
        String(school.correctCount),
        `${school.accuracy}%`,
        String(school.remediationCount),
        "",
        "",
        "",
        ""
      ],
      ...school.classes.map((classGroup) => [
        "class",
        school.schoolId,
        school.schoolName,
        classGroup.classId,
        classGroup.className,
        classGroup.grade ?? "",
        "",
        String(classGroup.studentCount),
        String(classGroup.teacherCount),
        String(classGroup.answerCount),
        String(classGroup.correctCount),
        `${classGroup.accuracy}%`,
        String(classGroup.remediationCount),
        "",
        "",
        "",
        ""
      ]),
      ...school.weakCoreLiteracy.map((literacy) => [
        "weak_core_literacy",
        school.schoolId,
        school.schoolName,
        "",
        "",
        "",
        "",
        "",
        "",
        String(literacy.answerCount),
        "",
        "",
        "",
        literacy.literacyTag,
        literacy.label,
        String(literacy.wrongCount),
        `${literacy.wrongRate}%`
      ])
    ])
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function createEmptyReport(filters: SchoolSummaryFilters): SchoolSummaryReport {
  return {
    generatedAt: new Date().toISOString(),
    scope: filters.schoolId ? { schoolId: filters.schoolId } : {},
    totals: {
      classCount: 0,
      studentCount: 0,
      teacherCount: 0,
      answerCount: 0,
      correctCount: 0,
      accuracy: 0,
      remediationCount: 0,
      weakCoreLiteracy: []
    },
    schools: []
  };
}

function calculateAccuracy(correctCount: number, answerCount: number) {
  return answerCount ? Math.round((correctCount / answerCount) * 100) : 0;
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function fromPrismaGrade(grade?: string | null): Grade | undefined {
  if (grade === "junior_three") return "初三";
  if (grade === "senior_one") return "高一";
  if (grade === "senior_two") return "高二";
  if (grade === "senior_three") return "高三";
  return undefined;
}

function literacyText(tag: string) {
  const map: Record<string, string> = {
    macro_micro: "宏观辨识与微观探析",
    change_balance: "变化观念与平衡思想",
    evidence_model: "证据推理与模型认知",
    inquiry_innovation: "科学探究与创新意识",
    attitude_responsibility: "科学态度与社会责任"
  };
  return map[tag] ?? tag;
}

function buildLiteracySuggestion(tag: string) {
  const map: Record<string, string> = {
    macro_micro: "讲评时让学生把宏观现象和微观粒子变化对应起来。",
    change_balance: "适合用变化、守恒和平衡移动组织分层讲评。",
    evidence_model: "可以要求学生先说证据，再说明模型，最后给出结论。",
    inquiry_innovation: "建议围绕实验目的、变量、现象和结论整理讲评素材。",
    attitude_responsibility: "可结合真实情境，引导学生说明化学判断的社会意义。"
  };
  return map[tag] ?? "建议从证据提取、模型表达和结论说明三个步骤组织讲评。";
}

export const schoolSummaryRepository: SchoolSummaryRepository = hasDatabaseUrl()
  ? new PrismaSchoolSummaryRepository()
  : new EmptySchoolSummaryRepository();
