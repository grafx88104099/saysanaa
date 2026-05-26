import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await readSession();
  if (!s || s.pending2fa) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    include: { employee: true },
  });
  if (!user?.employee) redirect("/login");
  if (!user.twoFactorEnabled) redirect("/2fa/setup");

  const me = {
    uid: s.uid,
    employeeId: user.employee.id,
    email: user.email,
    role: user.employee.role,
    fullName: `${user.employee.lastName} ${user.employee.firstName}`.trim(),
    initials:
      (user.employee.lastName?.[0] ?? "") + (user.employee.firstName?.[0] ?? ""),
    photoUrl: user.employee.photoUrl,
  };

  return (
    <div className="min-h-screen flex bg-bg text-tx">
      <Sidebar role={user.employee.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar me={me} />
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
