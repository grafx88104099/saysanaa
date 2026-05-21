"use client";
import { useTransition } from "react";
import { revokeTokenAction, deleteTokenAction } from "./actions";
import { fmtAgoRelative, fmtDate } from "@/lib/format";

type T = {
  id: string;
  label: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

export default function TokenRow({ t }: { t: T }) {
  const [pending, start] = useTransition();
  const revoked = !!t.revokedAt;

  return (
    <div className="grid grid-cols-[2fr_1.4fr_1fr_0.8fr] items-center px-4 py-3 border-b border-white/[0.06] last:border-b-0 text-[13px]">
      <div>
        <div className="font-medium">{t.label}</div>
        <div className="text-[11px] text-white/40">
          Үүсгэсэн: {fmtDate(t.createdAt)}
        </div>
      </div>
      <div className="text-white/65">{fmtAgoRelative(t.lastSeenAt)}</div>
      <div>
        {revoked ? (
          <span className="chip-off">Цуцалсан</span>
        ) : (
          <span className="chip-on">Идэвхтэй</span>
        )}
      </div>
      <div className="text-right">
        {!revoked ? (
          <button
            onClick={() =>
              confirm(`"${t.label}" token-ийг цуцлах уу?`) &&
              start(() => revokeTokenAction(t.id))
            }
            disabled={pending}
            className="text-[12px] text-white/55 hover:text-white transition disabled:opacity-50"
          >
            Цуцлах
          </button>
        ) : (
          <button
            onClick={() =>
              confirm(`"${t.label}" token-ийг устгах уу?`) &&
              start(() => deleteTokenAction(t.id))
            }
            disabled={pending}
            className="text-[12px] text-white/55 hover:text-white transition disabled:opacity-50"
          >
            Устгах
          </button>
        )}
      </div>
    </div>
  );
}
