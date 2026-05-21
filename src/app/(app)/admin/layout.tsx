import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await readSession();
  if (!s || s.pending2fa) redirect("/login");
  if (s.role !== "ADMIN" && s.role !== "PM") redirect("/dashboard");
  return <>{children}</>;
}
