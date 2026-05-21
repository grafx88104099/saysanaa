"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createTokenAction, type CreateState } from "./actions";

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn-primary">
      {pending ? "Үүсгэж байна…" : "Token үүсгэх"}
    </button>
  );
}

export default function CreateForm() {
  const [state, action] = useActionState<CreateState, FormData>(createTokenAction, undefined);
  const [label, setLabel] = useState("");
  const [copied, setCopied] = useState(false);

  const url =
    state?.created &&
    `${typeof window !== "undefined" ? window.location.origin : ""}/api/display/activate?t=${state.created.token}`;

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <form action={action} className="flex items-end gap-3 mb-4">
        <div className="flex-1 max-w-[420px]">
          <label className="label">Нэр (хаана байх вэ)</label>
          <input
            name="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Жш: Хурлын танхим, Coffee corner"
            className="input"
          />
        </div>
        <Submit disabled={label.trim().length === 0} />
      </form>

      {state?.error && (
        <div className="text-[12px] text-white/70 border border-white/20 rounded-md px-3 py-2 mb-4">
          {state.error}
        </div>
      )}

      {state?.created && url && (
        <div className="border border-white/15 rounded-md p-4 bg-white/[0.03]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/45 mb-2">
            Шинэ token бэлэн — "{state.created.label}"
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[12px] text-white/85 break-all border border-white/10 rounded px-3 py-2 bg-black/40">
              {url}
            </code>
            <button onClick={copy} type="button" className="btn-ghost">
              {copied ? "Хууллаа" : "Хуулах"}
            </button>
          </div>
          <p className="text-[11px] text-white/45 mt-3 leading-relaxed">
            Энэхүү URL-ийг дэлгэцэн дээрх browser-руу нэг л удаа paste хийнэ үү. Token нь cookie-д
            хадгалагдаад дараа нь зүгээр <span className="text-white">/display</span> руу хандсан ч
            ажиллана.
          </p>
        </div>
      )}
    </>
  );
}
