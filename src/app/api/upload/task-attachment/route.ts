import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { uploadTaskFile } from "@/lib/storage";
import { prisma } from "@/lib/db";

const MAX = 20 * 1024 * 1024;

export async function POST(req: Request) {
  const s = await readSession();
  if (!s || s.pending2fa) {
    return NextResponse.json({ error: "Нэвтрэх шаардлагатай" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const taskId = String(form.get("taskId") || "").trim();
  if (!taskId) {
    return NextResponse.json({ error: "taskId шаардлагатай" }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Файл олдсонгүй" }, { status: 400 });
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "Хэт том файл (20MB-аас дээш)" }, { status: 400 });
  }

  // Permission: assigned to project
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { phase: true },
  });
  if (!task) return NextResponse.json({ error: "Task олдсонгүй" }, { status: 404 });

  if (s.role !== "ADMIN" && s.role !== "PM") {
    const myEmp = await prisma.employee.findUnique({ where: { userId: s.uid } });
    if (!myEmp) return NextResponse.json({ error: "Эрх дутуу" }, { status: 403 });
    const assn = await prisma.projectAssignment.findFirst({
      where: { projectId: task.phase.projectId, employeeId: myEmp.id },
    });
    if (!assn) return NextResponse.json({ error: "Эрх дутуу" }, { status: 403 });
  }

  const filename = (file as File).name || "file";
  try {
    const out = await uploadTaskFile(file, filename, taskId);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Алдаа" }, { status: 500 });
  }
}
