import type { Prisma } from "@prisma/client";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";

const adminSearchRoles = ["student", "teacher", "admin"] as const;

export type AdminUserSearchRole = (typeof adminSearchRoles)[number];

export interface AdminUserSearchItem {
  id: string;
  username: string;
  displayName: string;
  role: AdminUserSearchRole;
  schoolId?: string | null;
  schoolName?: string | null;
  classId?: string | null;
  className?: string | null;
  status: string;
  createdAt: string;
}

export interface ResolvedAdminUserIdentifier {
  identifier: string;
  user?: AdminUserSearchItem;
}

export interface AdminUserRepository {
  searchUsers(filters: { role?: AdminUserSearchRole; q?: string; limit?: number }): Promise<AdminUserSearchItem[]>;
  resolveUsersByIdentifiers(identifiers: string[]): Promise<ResolvedAdminUserIdentifier[]>;
}

class MemoryAdminUserRepository implements AdminUserRepository {
  async searchUsers() {
    return [];
  }

  async resolveUsersByIdentifiers(identifiers: string[]) {
    return identifiers.map((identifier) => ({ identifier }));
  }
}

class PrismaAdminUserRepository implements AdminUserRepository {
  async searchUsers(filters: { role?: AdminUserSearchRole; q?: string; limit?: number }) {
    const prisma = getPrismaClient();
    const query = filters.q?.trim();
    const take = clampLimit(filters.limit);
    const where: Prisma.UserWhereInput = {
      ...(filters.role ? { role: filters.role } : {}),
      ...(query
        ? {
            OR: [
              { id: { contains: query, mode: "insensitive" } },
              { username: { contains: query, mode: "insensitive" } },
              { displayName: { contains: query, mode: "insensitive" } }
            ]
          }
        : {})
    };
    const rows = await prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take,
      select: safeUserSelect
    });
    return rows.map(toAdminUserSearchItem);
  }

  async resolveUsersByIdentifiers(identifiers: string[]) {
    const normalized = normalizeIdentifiers(identifiers);
    if (!normalized.length) return [];
    const prisma = getPrismaClient();
    const rows = await prisma.user.findMany({
      where: {
        OR: [{ id: { in: normalized } }, { username: { in: normalized } }]
      },
      select: safeUserSelect
    });
    return normalized.map((identifier) => {
      const user = rows.find((row) => row.id === identifier || row.username === identifier);
      return {
        identifier,
        user: user ? toAdminUserSearchItem(user) : undefined
      };
    });
  }
}

const safeUserSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  schoolId: true,
  classId: true,
  status: true,
  createdAt: true,
  school: {
    select: {
      id: true,
      name: true
    }
  },
  classGroup: {
    select: {
      id: true,
      name: true
    }
  }
} satisfies Prisma.UserSelect;

type SafeUserRow = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;

function toAdminUserSearchItem(row: SafeUserRow): AdminUserSearchItem {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName ?? row.username,
    role: row.role,
    schoolId: row.schoolId,
    schoolName: row.school?.name ?? null,
    classId: row.classId,
    className: row.classGroup?.name ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString()
  };
}

function clampLimit(limit?: number) {
  if (!Number.isFinite(limit)) return 20;
  return Math.min(Math.max(Math.trunc(limit ?? 20), 1), 50);
}

export function normalizeAdminUserSearchRole(role?: string | null): AdminUserSearchRole | undefined {
  const normalized = role?.trim();
  return adminSearchRoles.includes(normalized as AdminUserSearchRole) ? (normalized as AdminUserSearchRole) : undefined;
}

export function normalizeIdentifiers(identifiers: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const identifier of identifiers) {
    const value = identifier.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }
  return normalized.slice(0, 100);
}

export const adminUserRepository: AdminUserRepository = hasDatabaseUrl()
  ? new PrismaAdminUserRepository()
  : new MemoryAdminUserRepository();
