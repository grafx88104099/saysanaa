import UserMenu from "@/components/UserMenu";
import type { Role } from "@prisma/client";

export default function Topbar({
  me,
}: {
  me: {
    email: string;
    role: Role;
    fullName: string;
    initials: string;
    photoUrl?: string | null;
  };
}) {
  return (
    <header className="h-14 bg-black border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0">
      <div className="text-[12px] text-white/45">Internal Operating System</div>
      <UserMenu me={me} />
    </header>
  );
}
