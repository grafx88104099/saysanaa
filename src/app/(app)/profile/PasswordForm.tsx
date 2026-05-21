"use client";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { changePasswordAction, type PasswordState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Шинэчилж байна…" : "Нууц үг солих"}
    </button>
  );
}

export default function PasswordForm() {
  const [state, action] = useActionState<PasswordState, FormData>(changePasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form action={action} ref={formRef} className="space-y-3 max-w-[420px]">
      <div>
        <label className="label">Одоогийн нууц үг *</label>
        <input name="current" type="password" required className="input" />
      </div>
      <div>
        <label className="label">Шинэ нууц үг * (8+ тэмдэгт)</label>
        <input name="next" type="password" minLength={8} required className="input" />
      </div>
      <div>
        <label className="label">Шинэ нууц үг (давтах) *</label>
        <input name="confirm" type="password" required className="input" />
      </div>

      <div className="flex items-center justify-between pt-2">
        {state?.ok && <div className="text-[12px] text-white/80">✓ Нууц үг шинэчлэгдсэн</div>}
        {state?.error && (
          <div className="text-[12px] text-white/70 border border-white/20 rounded-md px-3 py-1.5">
            {state.error}
          </div>
        )}
        <div className="ml-auto">
          <Submit />
        </div>
      </div>
    </form>
  );
}
