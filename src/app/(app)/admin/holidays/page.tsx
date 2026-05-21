import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AddForm from "./AddForm";
import ImportButton from "./ImportButton";
import RowActions from "./RowActions";

export default async function HolidaysPage() {
  const s = await readSession();
  if (!s || s.role !== "ADMIN") redirect("/dashboard");

  const all = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
  const byYear = new Map<number, typeof all>();
  for (const h of all) {
    const y = h.date.getUTCFullYear();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(h);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => a - b);

  return (
    <div className="max-w-[860px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Амралтын өдрүүд</h1>
        <p className="text-white/45 text-[12px] mt-1">
          Төслийн дуусах огноо тооцоонд хасагдах баяр амралтыг бүртгэх
        </p>
      </div>

      <section className="mb-10 pb-10 border-b border-white/10">
        <h2 className="text-[14px] font-semibold tracking-tight mb-4">Шинэ өдөр нэмэх</h2>
        <AddForm />
        <div className="mt-5">
          <ImportButton />
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-semibold tracking-tight mb-4">
          Бүртгэгдсэн өдрүүд{" "}
          <span className="text-white/40 font-normal">· {all.length}</span>
        </h2>
        {years.length === 0 && (
          <div className="text-white/40 text-[12px] border border-dashed border-white/10 rounded-md p-8 text-center">
            Одоохондоо амралтын өдөр бүртгэгдээгүй байна
          </div>
        )}
        {years.map((y) => (
          <div key={y} className="mb-8">
            <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">{y}</div>
            <div className="border border-white/10 rounded-lg overflow-hidden">
              {byYear.get(y)!.map((h) => (
                <div
                  key={h.id}
                  className="grid grid-cols-[140px_1fr_auto] items-center px-4 py-2.5 border-b border-white/[0.06] last:border-b-0 text-[13px]"
                >
                  <div className="font-medium tabular-nums">
                    {h.date.toISOString().slice(0, 10)}
                  </div>
                  <div>{h.name}</div>
                  <RowActions id={h.id} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
