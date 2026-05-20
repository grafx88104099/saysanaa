import Link from "next/link";
import { prisma } from "@/lib/db";
import { ROLE_LABEL, roleChip } from "@/lib/labels";

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
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-blue mb-1">
            Module · HR
          </div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Ажилтны бүртгэл</h1>
          <div className="text-sub text-[12px] mt-1">Нийт {employees.length} бичлэг</div>
        </div>
        <Link href="/employees/new" className="btn-primary">+ Ажилтан нэмэх</Link>
      </div>

      <form className="card p-3 mb-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Хайх</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="Нэр, и-мэйл, утас..."
            className="input"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="label">Эрх</label>
          <select name="role" defaultValue={role ?? "all"} className="input">
            <option value="all">Бүгд</option>
            {Object.entries(ROLE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="label">Статус</label>
          <select name="status" defaultValue={status} className="input">
            <option value="all">Бүгд</option>
            <option value="active">Идэвхтэй</option>
            <option value="inactive">Идэвхгүй</option>
          </select>
        </div>
        <button type="submit" className="btn-ghost">Шүүх</button>
      </form>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[2fr_1.4fr_1fr_1.4fr_0.8fr] text-[10px] font-bold uppercase tracking-wider text-sub bg-bg/40 border-b border-bd px-4 py-2.5">
          <div>Ажилтан</div>
          <div>И-мэйл</div>
          <div>Утас</div>
          <div>Эрх</div>
          <div className="text-right">Статус</div>
        </div>
        {employees.length === 0 && (
          <div className="px-4 py-10 text-center text-sub text-[12px]">
            Бичлэг олдсонгүй. Шинэ ажилтан нэмнэ үү.
          </div>
        )}
        {employees.map((e) => (
          <Link
            key={e.id}
            href={`/employees/${e.id}`}
            className="grid grid-cols-[2fr_1.4fr_1fr_1.4fr_0.8fr] items-center px-4 py-3 border-b border-bd last:border-b-0 hover:bg-surf2 transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              {e.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-bd" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue/15 border border-blue/30 flex items-center justify-center text-[11px] font-bold text-blue">
                  {(e.lastName[0] || "") + (e.firstName[0] || "")}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold truncate">
                  {e.lastName} {e.firstName}
                </div>
                <div className="text-[11px] text-sub truncate">{e.profession || "—"}</div>
              </div>
            </div>
            <div className="text-[12px] truncate">{e.user.email}</div>
            <div className="text-[12px] text-sub">{e.phone || "—"}</div>
            <div>
              <span className={roleChip(e.role)}>{ROLE_LABEL[e.role]}</span>
            </div>
            <div className="text-right">
              {e.active ? (
                <span className="chip-green">Идэвхтэй</span>
              ) : (
                <span className="chip-gray">Идэвхгүй</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
