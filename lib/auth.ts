import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export type AppRole = "ADMIN" | "WARDEN" | "STUDENT";
export type SessionUser = {
  userId: number;
  fullName: string;
  email: string;
  role: AppRole;
  studentId: number | null;
  wardenId: number | null;
  expiresAt: number;
};

export const SESSION_COOKIE = "hostelcare_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random value of at least 32 characters in .env.local.");
  }
  return value;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(user: Omit<SessionUser, "expiresAt">): string {
  const payload: SessionUser = { ...user, expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readSession(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [encoded, receivedSignature] = token.split(".");
  if (!encoded || !receivedSignature) return null;
  try {
    const expected = Buffer.from(sign(encoded));
    const received = Buffer.from(receivedSignature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionUser;
    if (!payload.userId || !payload.role || payload.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    if (!["ADMIN", "WARDEN", "STUDENT"].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  try {
    const calculated = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
    const expected = Buffer.from(hashHex, "hex");
    return calculated.length === expected.length && timingSafeEqual(calculated, expected);
  } catch {
    return false;
  }
}

export function hasRole(user: SessionUser | null, roles: AppRole[]): user is SessionUser {
  return Boolean(user && roles.includes(user.role));
}

export const SESSION_TTL = SESSION_TTL_SECONDS;
