"use client";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { reset2faAction } from "./actions";

export default function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function onReset() {
    start(async () => {
      await reset2faAction();
      router.push("/2fa/setup");
    });
  }

  if (!enabled) {
    return (
      <div className="flex items-center justify-between max-w-[560px]">
        <div className="text-[12px] text-white/70 leading-relaxed">
          2FA одоогоор идэвхгүй байна. Аюулгүй байдлын үүднээс заавал тохируулна уу.
        </div>
        <button onClick={() => router.push("/2fa/setup")} className="btn-primary ml-4">
          Тохируулах
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[560px]">
      <div className="flex items-center gap-3 mb-3">
        <span className="chip-on">Идэвхтэй</span>
        <span className="text-[12px] text-white/55">Authenticator апп холбогдсон</span>
      </div>
      <p className="text-[12px] text-white/55 leading-relaxed mb-4">
        2FA-г reset хийвэл одоогийн холболт цуцлагдаж, шинэ QR-аар дахин тохируулна. Утсаа сольсон, эсвэл
        Authenticator апп нь устсан үед ашиглана уу.
      </p>
      {confirm ? (
        <div className="flex items-center gap-2">
          <button onClick={onReset} disabled={pending} className="btn-danger">
            {pending ? "Reset хийж байна…" : "Тийм, reset хийх"}
          </button>
          <button onClick={() => setConfirm(false)} disabled={pending} className="btn-ghost">
            Цуцлах
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} className="btn-ghost">
          2FA reset хийх
        </button>
      )}
    </div>
  );
}
