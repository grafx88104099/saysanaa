"use client";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { addHolidayAction, type AddState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Нэмж байна…" : "Нэмэх"}
    </button>
  );
}

export default function AddForm() {
  const [state, action] = useActionState<AddState, FormData>(addHolidayAction, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={ref} action={action} className="flex items-end gap-3">
      <div className="w-[180px]">
        <label className="label">Огноо</label>
        <input
          name="date"
          type="date"
          required
          className="w-full h-11 bg-transparent border border-white/12 rounded-md px-3 text-[13px] [color-scheme:dark] focus:outline-none focus:border-white/45 transition"
        />
      </div>
      <div className="flex-1 max-w-[420px]">
        <label className="label">Нэр</label>
        <input
          name="name"
          required
          placeholder="Жш: Үндэсний их баяр наадам"
          className="input"
        />
      </div>
      <Submit />
      {state?.error && (
        <div className="text-[11px] text-white/70 border border-white/20 rounded-md px-3 py-1.5 ml-2">
          {state.error}
        </div>
      )}
    </form>
  );
}
