import "server-only";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const AVATARS_BUCKET = "avatars";
export const CONTRACTS_BUCKET = "contracts";
export const TASK_FILES_BUCKET = "task-files";
export const PPT_IMAGES_BUCKET = "ppt-images";
export const ORG_ASSETS_BUCKET = "org-assets";

if (!URL || !KEY) {
  console.warn("SUPABASE_URL эсвэл SUPABASE_SERVICE_ROLE_KEY тохируулагдаагүй.");
}

export const supabaseAdmin = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checked = new Set<string>();
async function ensureBucket(
  bucket: string,
  opts: { fileSizeLimit?: number; allowedMimeTypes?: string[]; isPublic?: boolean } = {},
) {
  if (checked.has(bucket)) return;
  const { data, error } = await supabaseAdmin.storage.getBucket(bucket);
  if (error || !data) {
    await supabaseAdmin.storage.createBucket(bucket, {
      public: opts.isPublic ?? false,
      fileSizeLimit: opts.fileSizeLimit,
      allowedMimeTypes: opts.allowedMimeTypes,
    });
  }
  checked.add(bucket);
}

/**
 * Generate a short-lived signed URL for a private bucket object.
 * The returned URL embeds a time-limited token; safe to send to authenticated
 * users (it expires) but should not be stored long-term.
 */
export async function signedUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number = 60 * 10
): Promise<string | null> {
  if (!path) return null;
  // Accept either bucket-relative paths or full public URLs (extract path).
  const marker = `/object/public/${bucket}/`;
  const idx = path.indexOf(marker);
  const objectPath = idx >= 0 ? path.slice(idx + marker.length) : path;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Strip query params + extract storage path from any Supabase URL. */
function objectPathFromUrl(bucket: string, raw: string): string {
  const marker = `/object/public/${bucket}/`;
  const i = raw.indexOf(marker);
  if (i >= 0) return raw.slice(i + marker.length).split("?")[0];
  const m2 = `/object/sign/${bucket}/`;
  const j = raw.indexOf(m2);
  if (j >= 0) return raw.slice(j + m2.length).split("?")[0];
  return raw;
}

/** Random unguessable slug component — replaces timestamps to prevent enumeration. */
function randomSlug(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export async function uploadAvatar(
  file: Blob,
  ext: string,
): Promise<{ url: string; path: string }> {
  await ensureBucket(AVATARS_BUCKET, {
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    isPublic: true, // Profile photos are intentionally public-readable
  });
  const path = `${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(AVATARS_BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabaseAdmin.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function uploadContract(
  file: Blob,
  fileName: string,
  projectId: string,
): Promise<{ url: string; path: string }> {
  // NOTE: existing bucket is public; ensureBucket is a no-op for existing buckets.
  // For new deployments, the false flag prevents accidental public creation —
  // serve via /api/files proxy (signedUrl helper above) for full privacy.
  await ensureBucket(CONTRACTS_BUCKET, {
    fileSizeLimit: 25 * 1024 * 1024,
    isPublic: false,
  });
  const safe = fileName.replace(/[^\w.\-]/g, "_");
  // Random slug instead of timestamp → no enumeration even if projectId leaks
  const path = `${projectId}/${randomSlug()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(CONTRACTS_BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabaseAdmin.storage.from(CONTRACTS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function uploadTaskFile(
  file: Blob,
  fileName: string,
  taskId: string,
): Promise<{ url: string; size: number; name: string }> {
  await ensureBucket(TASK_FILES_BUCKET, {
    fileSizeLimit: 20 * 1024 * 1024,
    isPublic: false,
  });
  const safe = fileName.replace(/[^\w.\-]/g, "_");
  const path = `${taskId}/${randomSlug()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(TASK_FILES_BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabaseAdmin.storage.from(TASK_FILES_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, size: file.size, name: fileName };
}

void objectPathFromUrl; // exported helper kept for future migration to /api/files proxy

/**
 * Upload an organization brand asset (logo, light-logo, etc.).
 * Public-read with random-slug path. Used by /admin/organization.
 */
export async function uploadOrgAsset(
  file: Blob,
  fileName: string,
  kind: "logo" | "logo-light"
): Promise<{ url: string; path: string }> {
  await ensureBucket(ORG_ASSETS_BUCKET, {
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
    isPublic: true,
  });
  const safe = fileName.replace(/[^\w.\-]/g, "_");
  const path = `${kind}-${randomSlug()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(ORG_ASSETS_BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabaseAdmin.storage.from(ORG_ASSETS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function uploadPptImage(
  file: Blob,
  fileName: string,
  projectId: string,
): Promise<{ url: string; size: number; name: string }> {
  await ensureBucket(PPT_IMAGES_BUCKET, {
    fileSizeLimit: 15 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    // Public-read with unguessable random-slug paths. PPT images are intended
    // for end-client decks (rendered by trusted server fetch in pptx.ts); the
    // SSRF allowlist in pptx.ts requires *.supabase.co. Browser <img> tags in
    // the manager UI also need direct access. Acceptable risk: leaked URL
    // exposes a single render, not a project export.
    isPublic: true,
  });
  const safe = fileName.replace(/[^\w.\-]/g, "_");
  const path = `${projectId}/${randomSlug()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(PPT_IMAGES_BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabaseAdmin.storage.from(PPT_IMAGES_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, size: file.size, name: fileName };
}

export async function deleteFromBucket(bucket: string, path: string) {
  if (!path) return;
  // path may be a full URL — extract path after `/object/public/{bucket}/`
  const marker = `/object/public/${bucket}/`;
  const idx = path.indexOf(marker);
  const objectPath = idx >= 0 ? path.slice(idx + marker.length) : path;
  await supabaseAdmin.storage.from(bucket).remove([objectPath]);
}
