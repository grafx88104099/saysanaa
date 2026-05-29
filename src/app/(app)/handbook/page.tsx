import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import HandbookView from "./HandbookView";

export default async function HandbookPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const s = await readSession();
  if (!s) redirect("/login");

  const sections = await prisma.handbookSection.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  const sp = await searchParams;
  const activeSlug = sp.section || sections[0]?.slug || null;

  return (
    <HandbookView
      isAdmin={s.role === "ADMIN"}
      sections={sections.map((sec) => ({
        id: sec.id,
        slug: sec.slug,
        title: sec.title,
        body: sec.body,
        sortOrder: sec.sortOrder,
        updatedAt: sec.updatedAt.toISOString(),
      }))}
      activeSlug={activeSlug}
    />
  );
}
