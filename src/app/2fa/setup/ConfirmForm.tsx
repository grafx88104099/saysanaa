"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { confirmSetup, type ConfirmState } from "./actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full mt-2">
      {pending ? "Шалгаж байна…" : "Идэвхжүүлэх"}
    </button>
  );
}

export default function ConfirmForm() {
  const [state, action] = useActionState<ConfirmState, FormData>(confirmSetup, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="label">Апп-аас гарч буй код</label>
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
  );
}
