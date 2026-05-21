import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { listKioskTokens } from "@/lib/kiosk";
import CreateForm from "./CreateForm";
import TokenRow from "./TokenRow";

export default async function AdminDisplayPage() {
  const s = await readSession();
  if (!s || s.role !== "ADMIN") redirect("/dashboard");
  const tokens = await listKioskTokens();

  return (
    <div className="max-w-[860px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Дэлгэц удирдлага</h1>
        <p className="text-white/45 text-[12px] mt-1">
          Ажлын зааланы wall display-уудад зориулсан kiosk token-уудыг үүсгэх, удирдах
        </p>
      </div>

      <section className="mb-10 pb-10 border-b border-white/10">
        <h2 className="text-[14px] font-semibold tracking-tight mb-4">Шинэ kiosk token</h2>
        <CreateForm />
      </section>

      <section>
        <h2 className="text-[14px] font-semibold tracking-tight mb-4">
          Бүртгэгдсэн token-ууд{" "}
          <span className="text-white/40 font-normal">· {tokens.length}</span>
        </h2>
        {tokens.length === 0 ? (
          <div className="text-white/40 text-[12px] border border-dashed border-white/10 rounded-md p-8 text-center">
            Одоохондоо kiosk token бүртгэгдээгүй байна
          </div>
        ) : (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[2fr_1.4fr_1fr_0.8fr] text-[10px] font-medium uppercase tracking-wider text-white/45 border-b border-white/10 px-4 py-2.5">
              <div>Нэр</div>
              <div>Сүүлийн идэвх</div>
              <div>Статус</div>
              <div className="text-right">Үйлдэл</div>
            </div>
            {tokens.map((t) => (
              <TokenRow key={t.id} t={JSON.parse(JSON.stringify(t))} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
