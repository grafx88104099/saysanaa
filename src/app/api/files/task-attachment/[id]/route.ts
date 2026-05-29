import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { signedUrl, TASK_FILES_BUCKET } from "@/lib/storage";

/**
 * Authenticated proxy for task attachment downloads.
 * - ADMIN/PM: any task attachment.
 * - Active employees assigned to the task's project: read their project's files.
 * - Anyone else: 403.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const att = await prisma.taskAttachment.findUnique({
    where: { id },
    select: {
      url: true,
      name: true,
      task: {
        select: {
          phase: {
            select: {
              project: {
                select: {
                  id: true,
                  assignments: { select: { employeeId: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!att || !att.url) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const project = att.task.phase.project;
  const isManager = s.role === "ADMIN" || s.role === "PM";
  if (!isManager) {
    const emp = await prisma.employee.findUnique({
      where: { userId: s.uid },
      select: { id: true, active: true },
    });
    if (!emp || !emp.active) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!project.assignments.some((a) => a.employeeId === emp.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const url = await signedUrl(TASK_FILES_BUCKET, att.url, 60 * 10);
  if (!url) {
    return NextResponse.json({ error: "Signing failed" }, { status: 502 });
  }
  return NextResponse.redirect(url, { status: 302 });
}
