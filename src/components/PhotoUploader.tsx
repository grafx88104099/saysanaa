"use client";
import { useRef, useState } from "react";

export default function PhotoUploader({
  name,
  initialUrl,
}: {
  name: string;
  initialUrl?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUrl(data.url);
    } catch (err: any) {
      setError(err.message || "Алдаа гарлаа");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name={name} value={url ?? ""} />

      <div className="w-20 h-20 rounded-full border border-white/15 overflow-hidden flex items-center justify-center bg-white/[0.02] flex-shrink-0">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-white/30"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </svg>
        )}
      </div>

      <div className="flex-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onPick}
          className="hidden"
          id={`upload-${name}`}
        />
        <div className="flex items-center gap-2">
          <label
            htmlFor={`upload-${name}`}
            className={`btn-ghost cursor-pointer ${busy ? "opacity-50 pointer-events-none" : ""}`}
          >
            {busy ? "Илгээж байна…" : url ? "Зураг солих" : "Зураг сонгох"}
          </label>
          {url && !busy && (
            <button
              type="button"
              onClick={() => setUrl(null)}
              className="text-[12px] text-white/45 hover:text-white transition"
            >
              Хасах
            </button>
          )}
        </div>
        <div className="text-[11px] text-white/40 mt-1.5">
          PNG, JPEG, WEBP · max 5MB
        </div>
        {error && (
          <div className="text-[11px] text-white/70 mt-1.5 border border-white/20 rounded px-2 py-1">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
