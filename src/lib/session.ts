import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

const COOKIE = "saysanaa_session";
const ALG = "HS256";

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET тохиргоо дутуу (32+ тэмдэгт).");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  uid: string;
  email: string;
  role: Role;
  // pending: credentials passed, awaiting 2FA verification
  pending2fa?: boolean;
}

export async function createSession(payload: SessionPayload, opts?: { maxAge?: number }) {
  const maxAge = opts?.maxAge ?? 60 * 60 * 8; // 8h
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(key());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function requireUser() {
  const s = await readSession();
  if (!s || s.pending2fa) {
    throw new Error("UNAUTHENTICATED");
  }
  return s;
}

export async function requireRole(...roles: Role[]) {
  const s = await requireUser();
  if (!roles.includes(s.role)) throw new Error("FORBIDDEN");
  return s;
}
