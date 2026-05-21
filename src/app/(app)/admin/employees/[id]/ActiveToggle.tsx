"use client";
import { useFormStatus } from "react-dom";
import { toggleActiveAction } from "../actions";

function Btn({ active }: { active: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={active ? "btn-danger" : "btn-primary"}
    >
      {pending ? "Шинэчилж байна…" : active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
    </button>
  );
}

export default function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  return (
    <form action={toggleActiveAction.bind(null, id)}>
      <Btn active={active} />
    </form>
  );
}
