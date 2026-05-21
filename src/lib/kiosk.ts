import "server-only";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const KIOSK_COOKIE = "kiosk_token";

export function generateKioskTokenString() {
  return randomBytes(32).toString("base64url");
}

export async function createKioskToken(opts: { label: string; createdBy: string }) {
  const token = generateKioskTokenString();
  return prisma.kioskToken.create({
    data: { token, label: opts.label, createdBy: opts.createdBy },
  });
}

export async function revokeKioskToken(id: string) {
  await prisma.kioskToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export async function deleteKioskToken(id: string) {
  await prisma.kioskToken.delete({ where: { id } });
}

export async function listKioskTokens() {
  return prisma.kioskToken.findMany({
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function validateKioskToken(token: string | null | undefined) {
  if (!token) return null;
  const row = await prisma.kioskToken.findUnique({ where: { token } });
  if (!row || row.revokedAt) return null;
  return row;
}

export async function touchKioskToken(id: string) {
  await prisma.kioskToken
    .update({ where: { id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});
}

export async function setKioskCookie(token: string) {
  const store = await cookies();
  store.set(KIOSK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function readKioskCookie() {
  const store = await cookies();
  return store.get(KIOSK_COOKIE)?.value ?? null;
}

export async function clearKioskCookie() {
  const store = await cookies();
  store.delete(KIOSK_COOKIE);
}
