"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full mt-2">
      {pending ? "Шалгаж байна…" : "Нэвтрэх"}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg bg-blue flex items-center justify-center font-extrabold text-white">
            S
          </div>
          <div>
            <div className="text-[16px] font-extrabold tracking-tight">SayaSanaa OS</div>
            <div className="text-[10px] text-sub font-mono uppercase tracking-widest">
              Interior Studio · Internal
            </div>
          </div>
        </div>

        <div className="card p-7">
          <h1 className="text-[18px] font-extrabold mb-1">Нэвтрэх</h1>
          <p className="text-sub text-[12px] mb-5">
            Системд хандахын тулд бүртгэлтэй и-мэйл, нууц үгээ оруулна уу.
          </p>

          <form action={action} className="space-y-3">
            <div>
              <label htmlFor="email" className="label">И-мэйл</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="name@saysanaa.mn"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">Нууц үг</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="input"
              />
            </div>

            {state?.error && (
              <div className="text-[12px] text-red bg-red/10 border border-red/25 rounded-md px-3 py-2">
                {state.error}
              </div>
            )}

            <SubmitBtn />
          </form>

          <div className="text-[11px] text-sub mt-5 text-center">
            Бүртгэл асуудалтай бол админд хандана уу.
          </div>
        </div>

        <div className="text-center text-[10px] text-sub/70 mt-6 font-mono uppercase tracking-widest">
          v0.1 · 2026
        </div>
      </div>
    </main>
  );
}
