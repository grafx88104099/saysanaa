"use client";
import { useState, useTransition } from "react";
import { resetPasswordAction } from "../actions";

export default function ResetPasswordForm({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await resetPasswordAction(id, fd);
          if (res && "error" in res) setMsg({ ok: false, text: res.error! });
          else setMsg({ ok: true, text: "Нууц үг шинэчлэгдсэн. Ажилтанд мэдэгдээрэй." });
        });
        (e.currentTarget as HTMLFormElement).reset();
      }}
      className="space-y-2"
    >
      <input
        name="newPassword"
        type="text"
        minLength={8}
        required
        placeholder="Шинэ түр нууц үг"
        className="input"
      />
      <button type="submit" disabled={pending} className="btn-ghost w-full">
        {pending ? "Шинэчилж байна…" : "Шинэчлэх"}
      </button>
      {msg && (
        <div
          className={`text-[11px] px-2 py-1.5 rounded border border-white/20 ${
            msg.ok ? "text-white" : "text-white/70"
          }`}
        >
          {msg.text}
        </div>
      )}
    </form>
  );
}
