"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { confirmSetup, type ConfirmState } from "./actions";

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full mt-2 h-11 rounded-md bg-white text-black text-[13px] font-semibold transition
                 hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed"
    >
      {pending ? "Шалгаж байна…" : "Идэвхжүүлэх"}
    </button>
  );
}

export default function ConfirmForm() {
  const [state, action] = useActionState<ConfirmState, FormData>(confirmSetup, undefined);
  const [code, setCode] = useState("");
  const canSubmit = /^\d{6}$/.test(code);

  return (
    <form action={action} className="space-y-3">
      <input
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        className="w-full h-12 bg-transparent border border-white/15 rounded-md px-3 text-[20px]
                   text-center tracking-[0.5em] tabular-nums
                   placeholder:text-white/20 focus:outline-none focus:border-white/50 transition"
      />
      {state?.error && (
        <div className="text-[12px] text-white/70 border border-white/20 rounded-md px-3 py-2">
          {state.error}
        </div>
      )}
      <SubmitBtn disabled={!canSubmit} />
    </form>
  );
}
