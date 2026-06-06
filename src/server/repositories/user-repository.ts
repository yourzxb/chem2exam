import { hashPassword, verifyPassword } from "@/server/auth/password";
import { getPrismaClient, hasDatabaseUrl } from "@/server/db/prisma";

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: "student" | "teacher" | "admin";
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: AppUser["role"];
}

export interface UserRepository {
  register(username: string, password: string, role?: AppUser["role"]): Promise<PublicUser>;
  login(username: string, password: string): Promise<PublicUser>;
  findById(id: string): Promise<PublicUser | null>;
}

const users = new Map<string, AppUser>();
const demoPassword = "Chem2Exam@2026";

seedMemoryDemoUsers();

class MemoryUserRepository implements UserRepository {
  async register(username: string, password: string, role: AppUser["role"] = "student") {
    if (users.has(username)) {
      throw new Error("USERNAME_EXISTS");
    }

    const user: AppUser = {
      id: `u_${users.size + 1}`,
      username,
      passwordHash: hashPassword(password),
      displayName: username,
      role
    };
    users.set(username, user);
    return publicUser(user);
  }

  async login(username: string, password: string) {
    const user = users.get(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new Error("INVALID_CREDENTIALS");
    }
    return publicUser(user);
  }

  async findById(id: string) {
    const user = Array.from(users.values()).find((item) => item.id === id);
    return user ? publicUser(user) : null;
  }
}

class PrismaUserRepository implements UserRepository {
  async register(username: string, password: string, role: AppUser["role"] = "student") {
    const prisma = getPrismaClient();
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new Error("USERNAME_EXISTS");
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        displayName: username,
        role
      }
    });
    return publicUser({
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      displayName: user.displayName ?? user.username,
      role: user.role
    });
  }

  async login(username: string, password: string) {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new Error("INVALID_CREDENTIALS");
    }
    return publicUser({
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      displayName: user.displayName ?? user.username,
      role: user.role
    });
  }

  async findById(id: string) {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return publicUser({
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      displayName: user.displayName ?? user.username,
      role: user.role
    });
  }
}

function publicUser(user: AppUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role
  };
}

function seedMemoryDemoUsers() {
  const demoUsers: Array<Pick<AppUser, "id" | "username" | "displayName" | "role">> = [
    { id: "demo_student_01", username: "demo_student_01", displayName: "演示学生小林", role: "student" },
    { id: "demo_student_02", username: "demo_student_02", displayName: "演示学生小周", role: "student" },
    { id: "demo_teacher", username: "demo_teacher", displayName: "演示老师", role: "teacher" },
    { id: "demo_admin", username: "demo_admin", displayName: "演示管理员", role: "admin" }
  ];

  for (const demoUser of demoUsers) {
    users.set(demoUser.username, {
      ...demoUser,
      passwordHash: hashPassword(demoPassword)
    });
  }
}

export const userRepository: UserRepository = hasDatabaseUrl()
  ? new PrismaUserRepository()
  : new MemoryUserRepository();

export async function registerUser(username: string, password: string, role: AppUser["role"] = "student") {
  return userRepository.register(username, password, role);
}

export async function loginUser(username: string, password: string) {
  return userRepository.login(username, password);
}

export async function findUserById(id: string) {
  return userRepository.findById(id);
}
