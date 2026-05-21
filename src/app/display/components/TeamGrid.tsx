import Panel from "./Panel";

type Member = {
  id: string;
  name: string;
  initials: string;
  role: string;
  photoUrl: string | null;
};

export default function TeamGrid({ team }: { team?: Member[] }) {
  return (
    <Panel title="Идэвхтэй баг" hint={team ? `${team.length} хүн` : ""}>
      <div className="h-full overflow-hidden">
        <div className="grid grid-cols-4 gap-3">
          {team?.slice(0, 12).map((m) => (
            <div key={m.id} className="flex flex-col items-center text-center">
              {m.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.photoUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-white/15"
                />
              ) : (
                <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-[12px] font-medium">
                  {m.initials || "?"}
                </div>
              )}
              <div className="text-[11px] mt-1.5 truncate w-full" title={m.name}>
                {m.name}
              </div>
              <div className="text-[9px] text-white/40 uppercase tracking-wider truncate w-full">
                {m.role}
              </div>
            </div>
          ))}
          {!team &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full border border-white/8" />
                <div className="text-[11px] text-white/15 mt-1.5">—</div>
              </div>
            ))}
        </div>
      </div>
    </Panel>
  );
}
