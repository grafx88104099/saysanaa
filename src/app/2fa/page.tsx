"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { verify2faAction, logoutAction, type VerifyState } from "./actions";

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full mt-2 h-11 rounded-md bg-white text-black text-[13px] font-semibold transition
                 hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed"
    >
      {pending ? "Шалгаж байна…" : "Баталгаажуулах"}
    </button>
  );
}

export default function TwoFAPage() {
  const [state, action] = useActionState<VerifyState, FormData>(verify2faAction, undefined);
  const [code, setCode] = useState("");
  const canSubmit = /^\d{6}$/.test(code);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-black text-white">
      <div className="w-full max-w-[340px]">
        <h1 className="text-[15px] font-medium text-center mb-2 tracking-tight">
          Баталгаажуулах код
        </h1>
        <p className="text-center text-white/50 text-[12px] mb-8">
          Authenticator апп-аас 6 оронтой код
        </p>

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

        <form action={logoutAction} className="mt-6 text-center">
          <button type="submit" className="text-[12px] text-white/40 hover:text-white transition">
            Буцах
          </button>
        </form>
      </div>
    </main>
  );
}
