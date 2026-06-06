import { createHmac, timingSafeEqual } from "node:crypto";
import { findUserById, type PublicUser } from "@/server/repositories/user-repository";

const SESSION_COOKIE = "chem2exam_session";
const maxAgeSeconds = 60 * 60 * 24 * 14;

interface SessionPayload {
  userId: string;
  role: PublicUser["role"];
  exp: number;
}

export function createSessionToken(user: PublicUser) {
  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readSessionToken(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const sessionCookie = cookies.find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  return sessionCookie ? decodeURIComponent(sessionCookie.slice(SESSION_COOKIE.length + 1)) : null;
}

export function verifySessionToken(token: string | null): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !isValidSignature(encodedPayload, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(request: Request) {
  const session = verifySessionToken(readSessionToken(request));
  if (!session) return null;
  return findUserById(session.userId);
}

export function setSessionCookie(response: ResponseWithCookies, user: PublicUser) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: createSessionToken(user),
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: maxAgeSeconds
  });
}

export function clearSessionCookie(response: ResponseWithCookies) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: 0
  });
}

function shouldUseSecureCookie() {
  if (process.env.AUTH_COOKIE_SECURE === "true") return true;
  if (process.env.AUTH_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function isValidSignature(value: string, signature: string) {
  const expected = Buffer.from(sign(value));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function getSessionSecret() {
  return process.env.AUTH_SECRET || "chem2exam-local-dev-secret-change-before-production";
}

interface ResponseWithCookies extends Response {
  cookies: {
    set(options: {
      name: string;
      value: string;
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge: number;
    }): void;
  };
}
