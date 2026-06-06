import { NextResponse } from "next/server";
import { requireReviewer } from "@/server/auth/roles";
import { organizationRepository } from "@/server/repositories/organization-repository";
import type { Grade } from "@/domain/types";

interface TeacherClassScope {
  classId: string;
  scope: "global" | "class";
  label: string;
  schoolId?: string;
  schoolName?: string;
  className?: string;
  grade?: Grade;
  role: "admin" | "teacher" | "head_teacher";
  status: string;
  studentCount?: number;
  teacherCount?: number;
}

export async function GET(request: Request) {
  const reviewer = await requireReviewer(request);
  if (!reviewer.ok) return reviewer.response;

  if (reviewer.user.role === "admin") {
    const classGroups = await organizationRepository.listClasses();
    const classScopes: TeacherClassScope[] = classGroups.map((classGroup) => ({
      classId: classGroup.id,
      scope: "class",
      label: `${classGroup.schoolName} / ${classGroup.name}`,
      schoolId: classGroup.schoolId,
      schoolName: classGroup.schoolName,
      className: classGroup.name,
      grade: classGroup.grade,
      role: "admin",
      status: classGroup.status,
      studentCount: classGroup.studentCount,
      teacherCount: classGroup.teacherCount
    }));
    return NextResponse.json({
      classes: [
        {
          classId: "all",
          scope: "global",
          label: "全部授权班级",
          role: "admin",
          status: "active"
        } satisfies TeacherClassScope,
        ...classScopes
      ],
      defaultClassId: "all",
      canUseGlobalScope: true
    });
  }

  const assignments = await organizationRepository.listTeacherClassAssignments(reviewer.user.id);
  const classGroups = await organizationRepository.listClasses();
  const classGroupById = new Map(classGroups.map((classGroup) => [classGroup.id, classGroup]));

  const classes: TeacherClassScope[] = assignments.map((assignment) => ({
    classId: assignment.classId,
    scope: "class",
    label: `${assignment.schoolName ?? classGroupById.get(assignment.classId)?.schoolName ?? "学校"} / ${assignment.className}`,
    schoolId: assignment.schoolId,
    schoolName: assignment.schoolName,
    className: assignment.className,
    grade: assignment.grade,
    role: assignment.role === "head_teacher" ? "head_teacher" : "teacher",
    status: assignment.status,
    studentCount: classGroupById.get(assignment.classId)?.studentCount,
    teacherCount: classGroupById.get(assignment.classId)?.teacherCount
  }));

  return NextResponse.json({
    classes,
    defaultClassId: classes[0]?.classId ?? null,
    canUseGlobalScope: false
  });
}
