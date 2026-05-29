"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { fmtMoney } from "@/lib/format";
import {
  saveFinanceEntryAction,
  deleteFinanceEntryAction,
} from "./actions";
import type { FinanceKind } from "@prisma/client";

const MONTH_NAME = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

type Cat = { id: string; name: string; kind: FinanceKind; sortOrder: number };
type Entry = {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  categoryKind: FinanceKind;
  amount: number;
  projectId: string | null;
  projectLabel: string | null;
  note: string | null;
};
type Project = { id: string; code: string; name: string };

function monthShift(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function FinanceView({
  monthKey,
  year,
  month,
  categories,
  entries,
  projects,
  isAdmin,
}: {
  monthKey: string;
  year: number;
  month: number;
  categories: Cat[];
  entries: Entry[];
  projects: Project[];
  isAdmin: boolean;
}) {
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const e of entries) {
      if (e.categoryKind === "INCOME") income += e.amount;
      else expense += e.amount;
    }
    return { income, expense, net: income - expense };
  }, [entries]);

  const byCategory = useMemo(() => {
    const m = new Map<string, { name: string; kind: FinanceKind; sum: number; count: number }>();
    for (const e of entries) {
      const k = e.categoryId;
      if (!m.has(k))
        m.set(k, { name: e.categoryName, kind: e.categoryKind, sum: 0, count: 0 });
      const slot = m.get(k)!;
      slot.sum += e.amount;
      slot.count++;
    }
    return Array.from(m.values()).sort((a, b) => b.sum - a.sum);
  }, [entries]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-gradient">Санхүү</h1>
          <p className="text-sub text-[12px] mt-1">
            {year} оны {MONTH_NAME[month - 1]} ·{" "}
            {isAdmin ? "ADMIN засах эрхтэй" : "Нягтлан тоо оруулна"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/finance?month=${monthShift(monthKey, -1)}`} className="btn-ghost h-9">
            ←
          </Link>
          <Link href="/admin/finance" className="btn-ghost h-9 px-3">
            Энэ сар
          </Link>
          <Link href={`/admin/finance?month=${monthShift(monthKey, 1)}`} className="btn-ghost h-9">
            →
          </Link>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="btn-primary h-9 px-3 ml-2"
          >
            + Шинэ бичилт
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Tile label="Нийт орлого" value={fmtMoney(totals.income)} color="#22C55E" />
        <Tile label="Нийт зарлага" value={fmtMoney(totals.expense)} color="#EF4444" />
        <Tile
          label="Цэвэр ашиг"
          value={fmtMoney(totals.net)}
          color={totals.net >= 0 ? "#22C55E" : "#EF4444"}
        />
      </div>

      {(showForm || editing) && (
        <EntryForm
          categories={categories}
          projects={projects}
          editing={editing}
          monthKey={monthKey}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {/* By category */}
      {byCategory.length > 0 && (
        <section className="panel p-5 mb-6">
          <h2 className="text-[13px] font-semibold mb-3 text-tx">Категориор</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
            {byCategory.map((c) => {
              const color = c.kind === "INCOME" ? "#22C55E" : "#EF4444";
              const total = c.kind === "INCOME" ? totals.income : totals.expense;
              const pct = total > 0 ? (c.sum / total) * 100 : 0;
              return (
                <div key={c.name + c.kind} className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="flex-1 truncate text-tx">{c.name}</span>
                  <span className="text-sub text-[11px]">×{c.count}</span>
                  <span className="w-24 text-right tabular-nums font-semibold" style={{ color }}>
                    {fmtMoney(c.sum)}
                  </span>
                  <div className="w-16 h-1.5 rounded-full bg-bd overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Entries list */}
      <section>
        <h2 className="text-[13px] font-semibold mb-2 text-tx">
          Бичилтүүд <span className="text-sub font-normal">· {entries.length}</span>
        </h2>
        {entries.length === 0 ? (
          <div className="panel p-10 text-center text-sub text-[12px]">
            Бичилт алга — "+ Шинэ бичилт" дарж эхлүүлнэ
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="text-sub text-[10px] uppercase tracking-wider bg-white/[0.02]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Огноо</th>
                  <th className="text-left px-3 py-2 font-medium">Категори</th>
                  <th className="text-right px-3 py-2 font-medium">Дүн</th>
                  <th className="text-left px-3 py-2 font-medium">Төсөл / Тэмдэглэл</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const color = e.categoryKind === "INCOME" ? "#22C55E" : "#EF4444";
                  return (
                    <tr key={e.id} className="border-t border-bd/40 hover:bg-white/[0.02]">
                      <td className="px-3 py-2 tabular-nums text-sub">{e.date}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: color }}
                          />
                          {e.categoryName}
                        </span>
                      </td>
                      <td
                        className="px-3 py-2 text-right tabular-nums font-semibold"
                        style={{ color }}
                      >
                        {e.categoryKind === "EXPENSE" ? "−" : ""}
                        {fmtMoney(e.amount)}
                      </td>
                      <td className="px-3 py-2 text-sub truncate max-w-[260px]">
                        {e.projectLabel ?? "—"}
                        {e.note && <span className="ml-2 text-tx/60">«{e.note}»</span>}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setShowForm(false);
                            setEditing(e);
                          }}
                          className="text-[11px] text-sub hover:text-tx mr-2"
                        >
                          Засах
                        </button>
                        <DeleteEntry id={e.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DeleteEntry({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm("Энэ бичилтийг устгах уу?")) return;
        start(async () => {
          await deleteFinanceEntryAction(id);
        });
      }}
      disabled={pending}
      className="text-[11px] text-sub hover:text-dangerInk"
    >
      ✕
    </button>
  );
}

function EntryForm({
  categories,
  projects,
  editing,
  monthKey,
  onClose,
}: {
  categories: Cat[];
  projects: Project[];
  editing: Entry | null;
  monthKey: string;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const initialDate =
    editing?.date ||
    (today.startsWith(monthKey) ? today : `${monthKey}-15`);
  const [date, setDate] = useState(initialDate);
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [amount, setAmount] = useState<string>(
    editing?.amount?.toString() ?? ""
  );
  const [projectId, setProjectId] = useState<string>(editing?.projectId ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    setError(null);
    if (!categoryId) return setError("Категори сонгоно уу");
    const a = parseFloat(amount);
    if (!a || a <= 0) return setError("Дүн буруу");
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("date", date);
    fd.set("categoryId", categoryId);
    fd.set("amount", String(a));
    fd.set("projectId", projectId);
    fd.set("note", note);
    start(async () => {
      const r = await saveFinanceEntryAction(undefined, fd);
      if (r?.ok) onClose();
      else setError(r?.error ?? "Алдаа");
    });
  };

  return (
    <div className="panel p-4 mb-4 border-brand/30 bg-brand/[0.04]">
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
            Огноо
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input h-9 text-[12px] [color-scheme:dark]"
          />
        </div>
        <div className="col-span-4">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
            Категори
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input h-9 text-[12px]"
          >
            <option value="">— Сонгох —</option>
            <optgroup label="Орлого">
              {categories
                .filter((c) => c.kind === "INCOME")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Зарлага">
              {categories
                .filter((c) => c.kind === "EXPENSE")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
            Дүн (₮)
          </label>
          <input
            type="number"
            min={0}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input h-9 text-[12px] text-right tabular-nums"
            placeholder="0"
          />
        </div>
        <div className="col-span-4">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
            Төсөлтэй холбох (заавал биш)
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="input h-9 text-[12px]"
          >
            <option value="">— Сонгох —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-12">
          <label className="text-[10px] uppercase tracking-wider text-sub block mb-1">
            Тэмдэглэл
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Заавал биш"
            className="input h-9 text-[12px]"
          />
        </div>
      </div>
      {error && (
        <div className="mt-2 text-[11px] text-dangerInk bg-danger/10 border border-danger/30 rounded px-2 py-1">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2 mt-3">
        <button onClick={onClose} className="btn-ghost h-9 px-3">Цуцлах</button>
        <button onClick={submit} disabled={pending} className="btn-primary h-9 px-3">
          {pending ? "Хадгалж байна…" : editing ? "Засах" : "Бүртгэх"}
        </button>
      </div>
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="panel px-5 py-4"
      style={{
        background: `radial-gradient(140% 110% at 0% 0%, ${color}1F 0%, transparent 55%), linear-gradient(180deg, #121A33 0%, #18224A 100%)`,
      }}
    >
      <div className="text-[10px] uppercase tracking-wider text-sub font-medium mb-1">
        {label}
      </div>
      <div
        className="text-[20px] font-bold tabular-nums tracking-tight"
        style={{ color, textShadow: `0 0 14px ${color}55` }}
      >
        {value}
      </div>
    </div>
  );
}
