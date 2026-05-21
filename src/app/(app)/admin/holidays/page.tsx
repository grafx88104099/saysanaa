import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AddForm from "./AddForm";
import ImportButton from "./ImportButton";
import CalendarGrid from "./CalendarGrid";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const s = await readSession();
  if (!s || s.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const currentYear = new Date().getFullYear();
  const all = await prisma.holiday.findMany({ orderBy: { date: "asc" } });

  const yearsSet = new Set<number>([currentYear]);
  for (const h of all) yearsSet.add(h.date.getUTCFullYear());
  const years = Array.from(yearsSet).sort((a, b) => a - b);

  const selectedYear =
    sp.year && years.includes(parseInt(sp.year, 10))
      ? parseInt(sp.year, 10)
      : currentYear;

  const yearHolidays = all
    .filter((h) => h.date.getUTCFullYear() === selectedYear)
    .map((h) => ({
      id: h.id,
      date: h.date.toISOString(),
      name: h.name,
    }));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">
            Амралтын өдрүүд
          </h1>
          <p className="text-white/55 text-[12px] mt-1">
            Төслийн дуусах огноо тооцоонд хасагдах баяр амралтын календарь
          </p>
        </div>
        <div className="flex items-center gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`?year=${y}`}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition ${
                y === selectedYear
                  ? "bg-white text-black border-white"
                  : "border-white/12 text-white/65 hover:text-white hover:border-white/35"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-6">
        {yearHolidays.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-md p-10 text-center">
            <div className="text-white/55 text-[13px] mb-1">
              {selectedYear} онд амралтын өдөр бүртгэгдээгүй
            </div>
            <div className="text-white/35 text-[12px]">
              Доорхоос preset-ийг импорт хийх эсвэл өдрөө гараар нэмнэ үү
            </div>
          </div>
        ) : (
          <CalendarGrid
            year={selectedYear}
            holidays={yearHolidays}
            canManage={true}
          />
        )}
      </div>

      <div className="border border-white/10 rounded-md px-4 py-3 mb-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">
        <div className="text-white/45 font-medium uppercase tracking-wider text-[10px]">
          Тэмдэглэгээ:
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-white/[0.04] flex items-center justify-center text-[10px] text-white/35">
            1
          </span>
          <span className="text-white/55">Баяр амралт (идэвхгүй)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-white/25">
            1
          </span>
          <span className="text-white/55">Бямба/Ням</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded ring-1 ring-white/55 ring-inset flex items-center justify-center text-[10px]">
            1
          </span>
          <span className="text-white/55">Өнөөдөр</span>
        </div>
        <div className="flex items-center gap-2 text-white/35">
          <span>·</span>
          <span>Хоосон өдөр дээр товшиж нэмэх · Амралтын өдөр дээр товшиж устгах</span>
        </div>
      </div>

      <section className="border-t border-white/10 pt-8">
        <h2 className="text-[14px] font-semibold tracking-tight mb-4">
          Шинэ өдөр нэмэх
        </h2>
        <AddForm />
        <div className="mt-5">
          <ImportButton />
        </div>
      </section>
    </div>
  );
}
