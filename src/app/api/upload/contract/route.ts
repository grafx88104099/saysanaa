import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { uploadContract } from "@/lib/storage";
import { prisma } from "@/lib/db";

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const s = await readSession();
  if (!s || s.pending2fa) {
    return NextResponse.json({ error: "Нэвтрэх шаардлагатай" }, { status: 401 });
  }
  if (s.role !== "ADMIN" && s.role !== "PM") {
    return NextResponse.json({ error: "Эрх дутуу байна" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const projectId = String(form.get("projectId") || "").trim();
  if (!projectId) {
    return NextResponse.json({ error: "projectId шаардлагатай" }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Файл олдсонгүй" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Зөвхөн PDF, DOC(X), XLS(X), PNG/JPEG зөвшөөрөгдсөн" },
      { status: 400 },
    );
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "Хэт том файл (25MB-аас дээш)" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Төсөл олдсонгүй" }, { status: 404 });
  }

  const filename = (file as File).name || "contract";
  try {
    const { url } = await uploadContract(file, filename, projectId);
    return NextResponse.json({ url, name: filename });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Алдаа" }, { status: 500 });
  }
}
