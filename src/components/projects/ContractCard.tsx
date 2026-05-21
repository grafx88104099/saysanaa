"use client";
import { useRef, useState, useTransition } from "react";
import { removeContractAction, setContractAction } from "@/app/(app)/admin/projects/actions";
import { fmtDateTime } from "@/lib/format";

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "📄";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["xls", "xlsx"].includes(ext)) return "📊";
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "🖼";
  return "📎";
}

export default function ContractCard({
  projectId,
  contract,
  canManage,
}: {
  projectId: string;
  contract: { url: string; name: string; at: string } | null;
  canManage: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", projectId);
      const res = await fetch("/api/upload/contract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const r = await setContractAction(projectId, data.url, data.name);
      if ("error" in r) throw new Error(r.error);
    } catch (e: any) {
      setErr(e.message || "Алдаа гарлаа");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onRemove() {
    if (!confirm("Гэрээг устгах уу?")) return;
    start(() => removeContractAction(projectId));
  }

  return (
    <div className="border border-white/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-white/45">
            Гэрээ
          </div>
          <div className="text-[12px] text-white/55 mt-0.5">
            PDF, DOC, XLS, эсвэл скан · 25MB-аас бага
          </div>
        </div>
        {canManage && (
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,image/webp"
            onChange={onPick}
            disabled={busy || pending}
            className="hidden"
            id={`contract-upload-${projectId}`}
          />
        )}
        {canManage && (
          <label
            htmlFor={`contract-upload-${projectId}`}
            className={`btn-ghost cursor-pointer ${
              busy || pending ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {busy
              ? "Илгээж байна…"
              : contract
              ? "Дахин upload"
              : "Гэрээ оруулах"}
          </label>
        )}
      </div>

      {contract ? (
        <div className="border border-white/12 rounded-md p-4 flex items-center gap-4">
          <div className="text-[28px] leading-none">{iconFor(contract.name)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate" title={contract.name}>
              {contract.name}
            </div>
            <div className="text-[11px] text-white/45 mt-0.5">
              Оруулсан: {fmtDateTime(contract.at)}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={contract.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Татах
            </a>
            {canManage && (
              <button
                type="button"
                onClick={onRemove}
                disabled={pending}
                className="text-[12px] text-white/45 hover:text-white transition disabled:opacity-50"
              >
                Устгах
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-white/10 rounded-md p-6 text-center">
          <div className="text-[13px] text-white/40">Гэрээ оруулаагүй байна</div>
          {!canManage && (
            <div className="text-[11px] text-white/30 mt-1">
              Зөвхөн ADMIN/PM гэрээ нэмж чадна
            </div>
          )}
        </div>
      )}

      {err && (
        <div className="text-[12px] text-white/80 border border-white/25 rounded-md px-3 py-2 mt-3">
          {err}
        </div>
      )}
    </div>
  );
}
