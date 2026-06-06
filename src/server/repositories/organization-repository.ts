import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { Grade } from "@/domain/types";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";
import type { PublicUser } from "@/server/repositories/user-repository";

const VALID_TEACHER_CLASS_ROLES = ["teacher", "head_teacher"] as const;

type TeacherClassRole = (typeof VALID_TEACHER_CLASS_ROLES)[number];
type TeacherAssignmentWithRelations = Prisma.TeacherClassAssignmentGetPayload<{
  include: {
    teacher: true;
    school: true;
    classGroup: true;
  };
}>;

export interface OrganizationSchool {
  id: string;
  name: string;
  region?: string;
  status: string;
  classCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationClassGroup {
  id: string;
  schoolId: string;
  schoolName: string;
  name: string;
  grade?: Grade;
  status: string;
  studentCount: number;
  teacherCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherClassAssignmentItem {
  id: string;
  assignmentId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail?: string | null;
  schoolId: string;
  schoolName?: string;
  classId: string;
  className: string;
  grade?: Grade;
  role: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSchoolInput {
  name: string;
  region?: string;
}

export interface CreateClassInput {
  schoolId: string;
  name: string;
  grade?: Grade;
}

export interface AssignTeacherInput {
  classId: string;
  teacherId: string;
  role?: string;
}

export interface AssignStudentInput {
  classId: string;
  studentId: string;
}

export interface OrganizationRepository {
  listSchools(): Promise<OrganizationSchool[]>;
  createSchool(input: CreateSchoolInput, adminUserId: string): Promise<OrganizationSchool>;
  listClasses(schoolId?: string): Promise<OrganizationClassGroup[]>;
  createClass(input: CreateClassInput, adminUserId: string): Promise<OrganizationClassGroup>;
  listClassTeacherAssignments(classId: string): Promise<TeacherClassAssignmentItem[]>;
  listTeacherClassAssignments(teacherId: string): Promise<TeacherClassAssignmentItem[]>;
  assignTeacherToClass(input: AssignTeacherInput, adminUserId: string): Promise<TeacherClassAssignmentItem>;
  updateTeacherClassRole(input: AssignTeacherInput, adminUserId: string): Promise<TeacherClassAssignmentItem>;
  assignStudentToClass(input: AssignStudentInput, adminUserId: string): Promise<OrganizationClassGroup>;
  canAccessClass(user: PublicUser, classId: string): Promise<boolean>;
}

const memorySchools: OrganizationSchool[] = [];
const memoryClasses: OrganizationClassGroup[] = [];
const memoryAssignments: TeacherClassAssignmentItem[] = [];

class MemoryOrganizationRepository implements OrganizationRepository {
  async listSchools() {
    return [...memorySchools];
  }

  async createSchool(input: CreateSchoolInput) {
    const now = new Date().toISOString();
    const school: OrganizationSchool = {
      id: createRepositoryId("school"),
      name: input.name,
      region: input.region,
      status: "active",
      classCount: 0,
      createdAt: now,
      updatedAt: now
    };
    memorySchools.unshift(school);
    return school;
  }

  async listClasses(schoolId?: string) {
    return memoryClasses.filter((item) => !schoolId || item.schoolId === schoolId);
  }

  async createClass(input: CreateClassInput) {
    const school = memorySchools.find((item) => item.id === input.schoolId);
    if (!school) throw new Error("SCHOOL_NOT_FOUND");
    const now = new Date().toISOString();
    const classGroup: OrganizationClassGroup = {
      id: createRepositoryId("class"),
      schoolId: school.id,
      schoolName: school.name,
      name: input.name,
      grade: input.grade,
      status: "active",
      studentCount: 0,
      teacherCount: 0,
      createdAt: now,
      updatedAt: now
    };
    memoryClasses.unshift(classGroup);
    school.classCount += 1;
    return classGroup;
  }

  async listClassTeacherAssignments(classId: string) {
    const classGroup = memoryClasses.find((item) => item.id === classId);
    if (!classGroup) throw new Error("CLASS_NOT_FOUND");
    return memoryAssignments
      .filter((item) => item.classId === classId)
      .map((item) => ({ ...item, assignmentId: item.assignmentId ?? item.id }));
  }

  async listTeacherClassAssignments(teacherId: string) {
    return memoryAssignments
      .filter((item) => item.teacherId === teacherId && item.status === "active")
      .map((item) => ({ ...item, assignmentId: item.assignmentId ?? item.id }));
  }

  async assignTeacherToClass(input: AssignTeacherInput) {
    const role = normalizeTeacherClassRole(input.role);
    const classGroup = memoryClasses.find((item) => item.id === input.classId);
    if (!classGroup) throw new Error("CLASS_NOT_FOUND");
    const existing = memoryAssignments.find((item) => item.teacherId === input.teacherId && item.classId === input.classId);
    if (existing) {
      existing.role = role;
      existing.status = "active";
      existing.updatedAt = new Date().toISOString();
      return { ...existing, assignmentId: existing.assignmentId ?? existing.id };
    }
    const assignmentId = createRepositoryId("teacher_class");
    const assignment: TeacherClassAssignmentItem = {
      id: assignmentId,
      assignmentId,
      teacherId: input.teacherId,
      teacherName: input.teacherId,
      teacherEmail: null,
      schoolId: classGroup.schoolId,
      schoolName: classGroup.schoolName,
      classId: classGroup.id,
      className: classGroup.name,
      grade: classGroup.grade,
      role,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryAssignments.unshift(assignment);
    classGroup.teacherCount += 1;
    return assignment;
  }

  async updateTeacherClassRole(input: AssignTeacherInput) {
    const role = normalizeTeacherClassRole(input.role);
    const classGroup = memoryClasses.find((item) => item.id === input.classId);
    if (!classGroup) throw new Error("CLASS_NOT_FOUND");
    const existing = memoryAssignments.find((item) => item.teacherId === input.teacherId && item.classId === input.classId);
    if (!existing) throw new Error("TEACHER_CLASS_ASSIGNMENT_NOT_FOUND");
    existing.role = role;
    existing.updatedAt = new Date().toISOString();
    return { ...existing, assignmentId: existing.assignmentId ?? existing.id };
  }

  async assignStudentToClass(input: AssignStudentInput) {
    const classGroup = memoryClasses.find((item) => item.id === input.classId);
    if (!classGroup) throw new Error("CLASS_NOT_FOUND");
    classGroup.studentCount += 1;
    classGroup.updatedAt = new Date().toISOString();
    return classGroup;
  }

  async canAccessClass(user: PublicUser, classId: string) {
    if (user.role === "admin") return true;
    if (user.role !== "teacher") return false;
    if (isLegacyClassScope(classId)) return false;
    return memoryAssignments.some((item) => item.teacherId === user.id && item.classId === classId && item.status === "active");
  }
}

class PrismaOrganizationRepository implements OrganizationRepository {
  async listSchools() {
    const prisma = getPrismaClient();
    const rows = await prisma.school.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: { _count: { select: { classes: true } } }
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      region: row.region ?? undefined,
      status: row.status,
      classCount: row._count.classes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }));
  }

  async createSchool(input: CreateSchoolInput, adminUserId: string) {
    const prisma = getPrismaClient();
    const row = await prisma.school.create({
      data: {
        name: input.name,
        region: input.region || undefined
      }
    });
    await this.recordOrgAudit("admin_create_school", "school", row.id, adminUserId, [`创建学校：${row.name}`], {
      name: row.name,
      region: row.region
    });
    return {
      id: row.id,
      name: row.name,
      region: row.region ?? undefined,
      status: row.status,
      classCount: 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async listClasses(schoolId?: string) {
    const prisma = getPrismaClient();
    const rows = await prisma.classGroup.findMany({
      where: {
        ...(schoolId ? { schoolId } : {})
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        school: true,
        _count: { select: { teacherAssignments: true } }
      }
    });
    return Promise.all(
      rows.map(async (row) => {
        const studentCount = await prisma.user.count({
          where: { classId: row.id, role: "student", status: "active" }
        });
        const teacherCount = await prisma.teacherClassAssignment.count({
          where: { classId: row.id, status: "active" }
        });
        return {
          id: row.id,
          schoolId: row.schoolId,
          schoolName: row.school.name,
          name: row.name,
          grade: fromPrismaGrade(row.grade),
          status: row.status,
          studentCount,
          teacherCount: teacherCount || row._count.teacherAssignments,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString()
        };
      })
    );
  }

  async createClass(input: CreateClassInput, adminUserId: string) {
    const prisma = getPrismaClient();
    const school = await prisma.school.findUnique({ where: { id: input.schoolId } });
    if (!school) throw new Error("SCHOOL_NOT_FOUND");
    const row = await prisma.classGroup.create({
      data: {
        schoolId: input.schoolId,
        name: input.name,
        grade: toPrismaGrade(input.grade)
      },
      include: { school: true }
    });
    await this.recordOrgAudit("admin_create_class", "class", row.id, adminUserId, [`创建班级：${row.school.name} / ${row.name}`], {
      schoolId: row.schoolId,
      grade: input.grade
    });
    return {
      id: row.id,
      schoolId: row.schoolId,
      schoolName: row.school.name,
      name: row.name,
      grade: fromPrismaGrade(row.grade),
      status: row.status,
      studentCount: 0,
      teacherCount: 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async listClassTeacherAssignments(classId: string) {
    const prisma = getPrismaClient();
    const classGroup = await prisma.classGroup.findUnique({
      where: { id: classId }
    });
    if (!classGroup) throw new Error("CLASS_NOT_FOUND");

    const rows = await prisma.teacherClassAssignment.findMany({
      where: { classId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        teacher: true,
        school: true,
        classGroup: true
      }
    });
    return rows.map(toTeacherClassAssignmentItem);
  }

  async listTeacherClassAssignments(teacherId: string) {
    const prisma = getPrismaClient();
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.role !== "teacher") throw new Error("TEACHER_NOT_FOUND");

    const rows = await prisma.teacherClassAssignment.findMany({
      where: {
        teacherId,
        status: "active",
        classGroup: { status: "active" },
        school: { status: "active" }
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        teacher: true,
        school: true,
        classGroup: true
      }
    });
    return rows.map(toTeacherClassAssignmentItem);
  }

  async assignTeacherToClass(input: AssignTeacherInput, adminUserId: string) {
    const role = normalizeTeacherClassRole(input.role);
    const prisma = getPrismaClient();
    const classGroup = await prisma.classGroup.findUnique({
      where: { id: input.classId },
      include: { school: true }
    });
    if (!classGroup) throw new Error("CLASS_NOT_FOUND");
    const teacher = await prisma.user.findUnique({ where: { id: input.teacherId } });
    if (!teacher || teacher.role !== "teacher") throw new Error("TEACHER_NOT_FOUND");

    const row = await prisma.teacherClassAssignment.upsert({
      where: { teacherId_classId: { teacherId: input.teacherId, classId: input.classId } },
      update: {
        schoolId: classGroup.schoolId,
        role,
        status: "active"
      },
      create: {
        teacherId: input.teacherId,
        schoolId: classGroup.schoolId,
        classId: input.classId,
        role,
        createdBy: adminUserId
      },
      include: {
        teacher: true,
        school: true,
        classGroup: true
      }
    });

    await prisma.user.update({
      where: { id: input.teacherId },
      data: { schoolId: classGroup.schoolId }
    });
    await this.recordOrgAudit(
      "admin_assign_teacher_class",
      "teacher_class_assignment",
      row.id,
      adminUserId,
      [`绑定任课教师：${teacher.displayName ?? teacher.username} -> ${classGroup.name}`],
      { teacherId: input.teacherId, classId: input.classId, schoolId: classGroup.schoolId, role }
    );

    return toTeacherClassAssignmentItem(row);
  }

  async updateTeacherClassRole(input: AssignTeacherInput, adminUserId: string) {
    const role = normalizeTeacherClassRole(input.role);
    const prisma = getPrismaClient();
    const existing = await prisma.teacherClassAssignment.findUnique({
      where: { teacherId_classId: { teacherId: input.teacherId, classId: input.classId } },
      include: {
        teacher: true,
        school: true,
        classGroup: true
      }
    });
    if (!existing) {
      const classGroup = await prisma.classGroup.findUnique({ where: { id: input.classId } });
      if (!classGroup) throw new Error("CLASS_NOT_FOUND");
      const teacher = await prisma.user.findUnique({ where: { id: input.teacherId } });
      if (!teacher || teacher.role !== "teacher") throw new Error("TEACHER_NOT_FOUND");
      throw new Error("TEACHER_CLASS_ASSIGNMENT_NOT_FOUND");
    }

    const row = await prisma.teacherClassAssignment.update({
      where: { id: existing.id },
      data: { role },
      include: {
        teacher: true,
        school: true,
        classGroup: true
      }
    });
    await this.recordOrgAudit(
      "admin_update_teacher_class_role",
      "teacher_class_assignment",
      row.id,
      adminUserId,
      [`更新任教角色：${row.teacher.displayName ?? row.teacher.username} -> ${row.classGroup.name}（${existing.role} 到 ${role}）`],
      {
        teacherId: row.teacherId,
        classId: row.classId,
        schoolId: row.schoolId,
        previousRole: existing.role,
        role
      }
    );

    return toTeacherClassAssignmentItem(row);
  }

  async assignStudentToClass(input: AssignStudentInput, adminUserId: string) {
    const prisma = getPrismaClient();
    const classGroup = await prisma.classGroup.findUnique({
      where: { id: input.classId },
      include: { school: true }
    });
    if (!classGroup) throw new Error("CLASS_NOT_FOUND");
    const student = await prisma.user.findUnique({ where: { id: input.studentId } });
    if (!student || student.role !== "student") throw new Error("STUDENT_NOT_FOUND");

    await prisma.user.update({
      where: { id: input.studentId },
      data: {
        schoolId: classGroup.schoolId,
        classId: classGroup.id
      }
    });
    await this.recordOrgAudit("admin_assign_student_class", "student_class_membership", input.studentId, adminUserId, [
      `加入班级：${student.displayName ?? student.username} -> ${classGroup.name}`
    ], {
      studentId: input.studentId,
      classId: classGroup.id,
      schoolId: classGroup.schoolId
    });

    const studentCount = await prisma.user.count({
      where: { classId: classGroup.id, role: "student", status: "active" }
    });
    const teacherCount = await prisma.teacherClassAssignment.count({
      where: { classId: classGroup.id, status: "active" }
    });
    return {
      id: classGroup.id,
      schoolId: classGroup.schoolId,
      schoolName: classGroup.school.name,
      name: classGroup.name,
      grade: fromPrismaGrade(classGroup.grade),
      status: classGroup.status,
      studentCount,
      teacherCount,
      createdAt: classGroup.createdAt.toISOString(),
      updatedAt: classGroup.updatedAt.toISOString()
    };
  }

  async canAccessClass(user: PublicUser, classId: string) {
    if (user.role === "admin") return true;
    if (user.role !== "teacher") return false;
    if (isLegacyClassScope(classId)) return false;

    const prisma = getPrismaClient();
    const count = await prisma.teacherClassAssignment.count({
      where: {
        teacherId: user.id,
        classId,
        status: "active",
        classGroup: { status: "active" },
        school: { status: "active" }
      }
    });
    return count > 0;
  }

  private async recordOrgAudit(
    action: string,
    targetType: string,
    targetId: string,
    adminUserId: string,
    diffSummary: string[],
    metadata?: Record<string, unknown>
  ) {
    const prisma = getPrismaClient();
    await prisma.auditRecord.create({
      data: {
        targetType,
        targetId,
        reviewerId: adminUserId,
        action,
        diffSummary,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        comment: "管理员维护学校、班级或任教关系。"
      }
    });
  }
}

function toPrismaGrade(grade?: Grade) {
  if (grade === "初三") return "junior_three";
  if (grade === "高一") return "senior_one";
  if (grade === "高二") return "senior_two";
  if (grade === "高三") return "senior_three";
  return undefined;
}

function fromPrismaGrade(grade?: string | null): Grade | undefined {
  if (grade === "junior_three") return "初三";
  if (grade === "senior_one") return "高一";
  if (grade === "senior_two") return "高二";
  if (grade === "senior_three") return "高三";
  return undefined;
}

export function normalizeTeacherClassRole(role?: string): TeacherClassRole {
  const normalized = (role || "teacher").trim();
  if (VALID_TEACHER_CLASS_ROLES.includes(normalized as TeacherClassRole)) {
    return normalized as TeacherClassRole;
  }
  throw new Error("INVALID_TEACHER_CLASS_ROLE");
}

function toTeacherClassAssignmentItem(row: TeacherAssignmentWithRelations): TeacherClassAssignmentItem {
  return {
    id: row.id,
    assignmentId: row.id,
    teacherId: row.teacherId,
    teacherName: row.teacher.displayName ?? row.teacher.username,
    teacherEmail: null,
    schoolId: row.schoolId,
    schoolName: row.school.name,
    classId: row.classId,
    className: row.classGroup.name,
    grade: fromPrismaGrade(row.classGroup.grade),
    role: row.role,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function isLegacyClassScope(classId: string) {
  return classId === "all" || classId === "default";
}

function createRepositoryId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export const organizationRepository: OrganizationRepository = hasDatabaseUrl()
  ? new PrismaOrganizationRepository()
  : new MemoryOrganizationRepository();
