"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full mt-2 h-11 rounded-md text-white text-[13px] font-semibold transition
                 bg-brand hover:bg-brand/90 active:scale-[0.98]
                 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed"
    >
      {pending ? "Шалгаж байна…" : "Нэвтрэх"}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 text-white">
      <div className="w-full max-w-[360px] panel p-8 shadow-[0_0_60px_rgba(106,166,255,0.22)]">
        <div className="flex justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="SAYSANAA"
            className="logo-invert h-10 w-auto select-none pointer-events-none"
            draggable={false}
          />
        </div>
        <p className="text-[12px] text-center text-sub mb-6 uppercase tracking-[0.18em]">Нэвтрэх</p>

        <form action={action} className="space-y-3">
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="И-мэйл"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 bg-white/[0.02] border border-white/12 rounded-md px-3 text-[13px]
                       placeholder:text-white/40 focus:outline-none focus:border-brand
                       focus:shadow-[0_0_0_3px_rgba(106,166,255,0.18)] focus:bg-white/[0.04] transition"
          />
          <div className="relative">
            <input
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Нууц үг"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 bg-white/[0.02] border border-white/12 rounded-md pl-3 pr-11 text-[13px]
                         placeholder:text-white/40 focus:outline-none focus:border-brand
                         focus:shadow-[0_0_0_3px_rgba(106,166,255,0.18)] focus:bg-white/[0.04] transition"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
              aria-label={showPw ? "Нууц үг нуух" : "Нууц үг харах"}
              className="absolute right-1 top-1 bottom-1 w-9 flex items-center justify-center
                         text-white/40 hover:text-white transition rounded"
            >
              {showPw ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {state?.error && (
            <div className="text-[12px] text-danger border border-danger/40 bg-danger/10 rounded-md px-3 py-2">
              {state.error}
            </div>
          )}

          <SubmitBtn disabled={!canSubmit} />
        </form>
      </div>
    </main>
  );
}
