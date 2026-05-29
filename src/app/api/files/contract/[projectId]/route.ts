import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import { signedUrl, CONTRACTS_BUCKET } from "@/lib/storage";

/**
 * Authenticated proxy for project contract downloads.
 *
 * - Verifies session role: ADMIN/PM, or any active employee assigned to the project.
 * - Resolves the stored URL (which may be a public-bucket URL or a raw object key)
 *   to a fresh 10-minute signed URL and redirects (302).
 * - Forces "attachment" via signed URL params so browsers download rather than
 *   render in-place (avoids leaving the file in browser history as a previewed
 *   URL).
 *
 * Replaces the previous pattern of placing the Supabase public URL straight
 * into <a href>, which made the contract publicly downloadable to anyone who
 * captured the URL.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      contractUrl: true,
      contractName: true,
      assignments: { select: { employeeId: true } },
    },
  });
  if (!project || !project.contractUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

  const url = await signedUrl(CONTRACTS_BUCKET, project.contractUrl, 60 * 10);
  if (!url) {
    return NextResponse.json({ error: "Signing failed" }, { status: 502 });
  }
  return NextResponse.redirect(url, { status: 302 });
}
