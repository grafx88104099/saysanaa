"use server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { audit } from "@/lib/audit";
import {
  uploadOrgAsset,
  deleteFromBucket,
  ORG_ASSETS_BUCKET,
} from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const orgSchema = z.object({
  name: z.string().min(1).max(120),
  legalName: z.string().max(200).nullable().optional(),
  tagline: z.string().max(160).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  website: z.string().max(200).nullable().optional(),
  address: z.string().max(400).nullable().optional(),
  registerNumber: z.string().max(40).nullable().optional(),
  foundedYear: z.number().int().min(1900).max(2100).nullable().optional(),
  facebook: z.string().max(200).nullable().optional(),
  instagram: z.string().max(200).nullable().optional(),
  linkedin: z.string().max(200).nullable().optional(),
});

const NULLABLE_FIELDS = [
  "legalName", "tagline", "description", "email", "phone", "website",
  "address", "registerNumber", "facebook", "instagram", "linkedin",
] as const;

export type OrgState = { ok?: boolean; error?: string } | undefined;

export async function saveOrganizationAction(
  _prev: OrgState,
  formData: FormData
): Promise<OrgState> {
  const me = await requireRole("ADMIN");

  const raw: Record<string, unknown> = {
    name: String(formData.get("name") || "").trim(),
  };
  for (const f of NULLABLE_FIELDS) {
    const v = String(formData.get(f) || "").trim();
    raw[f] = v ? v : null;
  }
  const fy = String(formData.get("foundedYear") || "").trim();
  raw.foundedYear = fy ? parseInt(fy, 10) : null;

  const parsed = orgSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  // Normalise empty email "" → null (zod treats "" as bad email otherwise)
  const email = d.email && d.email !== "" ? d.email : null;

  await prisma.organization.upsert({
    where: { id: "main" },
    update: {
      name: d.name,
      legalName: d.legalName ?? null,
      tagline: d.tagline ?? null,
      description: d.description ?? null,
      email,
      phone: d.phone ?? null,
      website: d.website ?? null,
      address: d.address ?? null,
      registerNumber: d.registerNumber ?? null,
      foundedYear: d.foundedYear ?? null,
      facebook: d.facebook ?? null,
      instagram: d.instagram ?? null,
      linkedin: d.linkedin ?? null,
      updatedBy: me.uid,
    },
    create: {
      id: "main",
      name: d.name,
      legalName: d.legalName ?? null,
      tagline: d.tagline ?? null,
      description: d.description ?? null,
      email,
      phone: d.phone ?? null,
      website: d.website ?? null,
      address: d.address ?? null,
      registerNumber: d.registerNumber ?? null,
      foundedYear: d.foundedYear ?? null,
      facebook: d.facebook ?? null,
      instagram: d.instagram ?? null,
      linkedin: d.linkedin ?? null,
      updatedBy: me.uid,
    },
  });

  await audit("organization.save", me.uid, "main", { name: d.name });
  revalidatePath("/admin/organization");
  revalidatePath("/handbook");
  return { ok: true };
}

export async function uploadOrgLogoAction(
  kind: "logo" | "logo-light",
  formData: FormData
): Promise<OrgState> {
  const me = await requireRole("ADMIN");
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Файл олдсонгүй" };
  if (file.size > 8 * 1024 * 1024) return { error: "8MB-аас ихгүй" };
  if (!file.type.startsWith("image/")) return { error: "Зөвхөн зураг" };

  // Delete old logo (best-effort)
  const existing = await prisma.organization.findUnique({ where: { id: "main" } });
  const oldUrl = kind === "logo" ? existing?.logoUrl : existing?.logoLightUrl;
  if (oldUrl) {
    try {
      await deleteFromBucket(ORG_ASSETS_BUCKET, oldUrl);
    } catch {}
  }

  let url: string;
  try {
    const out = await uploadOrgAsset(file, file.name, kind);
    url = out.url;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload алдаа" };
  }

  await prisma.organization.upsert({
    where: { id: "main" },
    update:
      kind === "logo" ? { logoUrl: url, updatedBy: me.uid } : { logoLightUrl: url, updatedBy: me.uid },
    create: {
      id: "main",
      name: "SAYSANAA",
      logoUrl: kind === "logo" ? url : null,
      logoLightUrl: kind === "logo-light" ? url : null,
      updatedBy: me.uid,
    },
  });
  await audit("organization.logo", me.uid, "main", { kind });
  revalidatePath("/admin/organization");
  revalidatePath("/handbook");
  return { ok: true };
}

export async function removeOrgLogoAction(
  kind: "logo" | "logo-light"
): Promise<OrgState> {
  const me = await requireRole("ADMIN");
  const existing = await prisma.organization.findUnique({ where: { id: "main" } });
  if (!existing) return { ok: true };
  const oldUrl = kind === "logo" ? existing.logoUrl : existing.logoLightUrl;
  if (oldUrl) {
    try {
      await deleteFromBucket(ORG_ASSETS_BUCKET, oldUrl);
    } catch {}
  }
  await prisma.organization.update({
    where: { id: "main" },
    data: kind === "logo" ? { logoUrl: null } : { logoLightUrl: null },
  });
  await audit("organization.logo.remove", me.uid, "main", { kind });
  revalidatePath("/admin/organization");
  return { ok: true };
}
