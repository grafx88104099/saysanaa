export default function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full border border-white/10 rounded-lg flex flex-col overflow-hidden bg-white/[0.015]">
      <div className="px-5 pt-4 pb-3 flex items-baseline justify-between flex-shrink-0">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
          {title}
        </div>
        {hint && <div className="text-[10px] text-white/30">{hint}</div>}
      </div>
      <div className="flex-1 px-5 pb-5 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
