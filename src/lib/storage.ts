import "server-only";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const AVATARS_BUCKET = "avatars";
export const CONTRACTS_BUCKET = "contracts";
export const TASK_FILES_BUCKET = "task-files";

if (!URL || !KEY) {
  console.warn("SUPABASE_URL эсвэл SUPABASE_SERVICE_ROLE_KEY тохируулагдаагүй.");
}

export const supabaseAdmin = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checked = new Set<string>();
async function ensureBucket(
  bucket: string,
  opts: { fileSizeLimit?: number; allowedMimeTypes?: string[] } = {},
) {
  if (checked.has(bucket)) return;
  const { data, error } = await supabaseAdmin.storage.getBucket(bucket);
  if (error || !data) {
    await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: opts.fileSizeLimit,
      allowedMimeTypes: opts.allowedMimeTypes,
    });
  }
  checked.add(bucket);
}

export async function uploadAvatar(
  file: Blob,
  ext: string,
): Promise<{ url: string; path: string }> {
  await ensureBucket(AVATARS_BUCKET, {
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
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
  await ensureBucket(CONTRACTS_BUCKET, {
    fileSizeLimit: 25 * 1024 * 1024,
  });
  const safe = fileName.replace(/[^\w.\-]/g, "_");
  const path = `${projectId}/${Date.now()}-${safe}`;
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
  });
  const safe = fileName.replace(/[^\w.\-]/g, "_");
  const path = `${taskId}/${Date.now()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(TASK_FILES_BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabaseAdmin.storage.from(TASK_FILES_BUCKET).getPublicUrl(path);
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
