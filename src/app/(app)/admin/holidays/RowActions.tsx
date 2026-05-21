"use client";
import { useTransition } from "react";
import { deleteHolidayAction } from "./actions";

export default function RowActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm("Устгах уу?") && start(() => deleteHolidayAction(id))}
      className="text-[12px] text-white/45 hover:text-white transition"
    >
      Устгах
    </button>
  );
}
