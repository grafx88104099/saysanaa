import Link from "next/link";
import { prisma } from "@/lib/db";
import { ROLE_LABEL, ROLES } from "@/lib/labels";
import Select from "@/components/Select";

export default async function EmployeesList({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const role = sp.role && sp.role !== "all" ? sp.role : undefined;
  const status = sp.status ?? "all";

  const employees = await prisma.employee.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
                { user: { email: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
        role ? { role: role as any } : {},
        status === "active" ? { active: true } : status === "inactive" ? { active: false } : {},
      ],
    },
    include: { user: true },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Ажилтны бүртгэл</h1>
          <div className="text-white/45 text-[12px] mt-1">Нийт {employees.length} бичлэг</div>
        </div>
        <Link href="/admin/employees/new" className="btn-primary">Ажилтан нэмэх</Link>
      </div>

      <form className="border border-white/10 rounded-lg p-3 mb-4 flex flex-wrap gap-2 items-end bg-black">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Хайх</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="Нэр, и-мэйл, утас..."
            className="input"
          />
        </div>
        <div className="min-w-[180px]">
          <label className="label">Эрх</label>
          <Select
            name="role"
            defaultValue={role ?? "all"}
            options={[
              { value: "all", label: "Бүгд" },
              ...ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
            ]}
          />
        </div>
        <div className="min-w-[150px]">
          <label className="label">Статус</label>
          <Select
            name="status"
            defaultValue={status}
            options={[
              { value: "all", label: "Бүгд" },
              { value: "active", label: "Идэвхтэй" },
              { value: "inactive", label: "Идэвхгүй" },
            ]}
          />
        </div>
        <button type="submit" className="btn-ghost">Шүүх</button>
      </form>

      <div className="border border-white/10 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2fr_1.4fr_1fr_1.4fr_0.8fr] text-[10px] font-medium uppercase tracking-wider text-white/45 border-b border-white/10 px-4 py-2.5">
          <div>Ажилтан</div>
          <div>И-мэйл</div>
          <div>Утас</div>
          <div>Эрх</div>
          <div className="text-right">Статус</div>
        </div>
        {employees.length === 0 && (
          <div className="px-4 py-12 text-center text-white/40 text-[12px]">
            Бичлэг олдсонгүй
          </div>
        )}
        {employees.map((e) => (
          <Link
            key={e.id}
            href={`/admin/employees/${e.id}`}
            className="grid grid-cols-[2fr_1.4fr_1fr_1.4fr_0.8fr] items-center px-4 py-3 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.02] transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              {e.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-white/15" />
              ) : (
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-[11px] font-medium text-white/70">
                  {(e.lastName[0] || "") + (e.firstName[0] || "")}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {e.lastName} {e.firstName}
                </div>
                <div className="text-[11px] text-white/40 truncate">{e.profession || "—"}</div>
              </div>
            </div>
            <div className="text-[12px] truncate text-white/80">{e.user.email}</div>
            <div className="text-[12px] text-white/55">{e.phone || "—"}</div>
            <div className="text-[12px] text-white/80">{ROLE_LABEL[e.role]}</div>
            <div className="text-right">
              {e.active ? (
                <span className="chip-on">Идэвхтэй</span>
              ) : (
                <span className="chip-off">Идэвхгүй</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
