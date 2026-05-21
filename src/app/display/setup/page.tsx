export default function DisplaySetupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 text-center">
      <div className="max-w-[520px]">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/35 mb-4">
          Wall display · Setup required
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight mb-3">
          Kiosk token шаардлагатай
        </h1>
        <p className="text-white/55 text-[14px] leading-relaxed mb-8">
          Энэхүү дэлгэц нь идэвхжүүлсэн kiosk token шаардана. Админ хүн{" "}
          <span className="text-white">/admin/display</span> хэсгээс token үүсгээд URL-аа энэ
          browser-руу нэг удаа paste хийнэ.
        </p>
        <div className="border border-white/12 rounded-md p-5 text-left">
          <div className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-2">
            Жишээ
          </div>
          <code className="text-[12px] text-white/80 break-all">
            http://&lt;app-host&gt;/display?t=&lt;kiosk-token&gt;
          </code>
        </div>
      </div>
    </main>
  );
}
