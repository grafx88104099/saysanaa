import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import EmployeeForm from "@/components/EmployeeForm";
import { createEmployeeAction } from "../actions";

export default async function NewEmployeePage() {
  const s = await readSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "PM")) redirect("/employees");
  return (
    <div className="max-w-[900px] mx-auto">
      <div className="text-[10px] font-mono uppercase tracking-widest text-blue mb-1">
        HR · New record
      </div>
      <h1 className="text-[22px] font-extrabold tracking-tight mb-5">Шинэ ажилтан нэмэх</h1>
      <EmployeeForm mode="create" action={createEmployeeAction} cancelHref="/employees" />
    </div>
  );
}
