"use client";
import { useTransition } from "react";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL } from "@/lib/labels";
import { changeStatusAction } from "../actions";
import type { ProjectStatus } from "@prisma/client";

export default function StatusMenu({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="border border-white/10 rounded-lg p-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/45 mb-3">
        Статусыг өөрчлөх
      </div>
      <div className="flex flex-wrap gap-2">
        {PROJECT_STATUSES.map((s) => {
          const active = s === status;
          return (
            <button
              key={s}
              type="button"
              disabled={pending || active}
              onClick={() => start(() => changeStatusAction(projectId, s))}
              className={`px-3 py-1.5 rounded text-[12px] border transition
                ${
                  active
                    ? "bg-white text-black border-white cursor-default"
                    : "border-white/12 text-white/65 hover:text-white hover:border-white/30"
                }`}
            >
              {PROJECT_STATUS_LABEL[s]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
