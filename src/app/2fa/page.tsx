"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { verify2faAction, logoutAction, type VerifyState } from "./actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full mt-2">
      {pending ? "Шалгаж байна…" : "Баталгаажуулах"}
    </button>
  );
}

export default function TwoFAPage() {
  const [state, action] = useActionState<VerifyState, FormData>(verify2faAction, undefined);
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="card p-7">
          <div className="text-[10px] font-mono uppercase tracking-widest text-blue mb-2">
            Two-Factor Authentication
          </div>
          <h1 className="text-[18px] font-extrabold mb-1">Баталгаажуулах код</h1>
          <p className="text-sub text-[12px] mb-5">
            Authenticator апп-аас 6 оронтой кодоо оруулна уу.
          </p>

          <form action={action} className="space-y-3">
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              placeholder="000000"
              className="input text-center text-[22px] tracking-[0.6em] font-mono"
            />
            {state?.error && (
              <div className="text-[12px] text-red bg-red/10 border border-red/25 rounded-md px-3 py-2">
                {state.error}
              </div>
            )}
            <SubmitBtn />
          </form>

          <form action={logoutAction} className="mt-4">
            <button type="submit" className="text-[11px] text-sub hover:text-tx transition">
              ← Буцах (нэвтрэлт цуцлах)
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
