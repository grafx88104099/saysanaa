import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import OrganizationView from "./OrganizationView";

export default async function OrganizationPage() {
  const s = await readSession();
  if (!s) redirect("/login");
  if (s.role !== "ADMIN") redirect("/dashboard");

  const org = await prisma.organization.findUnique({ where: { id: "main" } });

  return (
    <OrganizationView
      initial={{
        name: org?.name ?? "SAYSANAA",
        legalName: org?.legalName ?? "",
        tagline: org?.tagline ?? "",
        description: org?.description ?? "",
        logoUrl: org?.logoUrl ?? null,
        logoLightUrl: org?.logoLightUrl ?? null,
        email: org?.email ?? "",
        phone: org?.phone ?? "",
        website: org?.website ?? "",
        address: org?.address ?? "",
        registerNumber: org?.registerNumber ?? "",
        foundedYear: org?.foundedYear ?? null,
        facebook: org?.facebook ?? "",
        instagram: org?.instagram ?? "",
        linkedin: org?.linkedin ?? "",
        updatedAt: org?.updatedAt?.toISOString() ?? null,
      }}
    />
  );
}
