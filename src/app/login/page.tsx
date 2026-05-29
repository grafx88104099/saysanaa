import { prisma } from "@/lib/db";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  // Load Organization branding for the login screen. Cached at the request
  // boundary so this is a single read; even if the singleton row is missing
  // we fall back to sane defaults.
  const org = await prisma.organization.findUnique({
    where: { id: "main" },
    select: { name: true, logoUrl: true, tagline: true },
  });

  return (
    <LoginForm
      orgName={org?.name ?? "SAYSANAA"}
      orgLogoUrl={org?.logoUrl ?? null}
      orgTagline={org?.tagline ?? null}
    />
  );
}
