import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import EmployeeForm from "@/components/EmployeeForm";
import { createEmployeeAction } from "../actions";

export default async function NewEmployeePage() {
  const s = await readSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "PM")) redirect("/admin/employees");
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-[24px] font-semibold tracking-tight mb-6">Шинэ ажилтан нэмэх</h1>
      <EmployeeForm mode="create" action={createEmployeeAction} cancelHref="/admin/employees" />
    </div>
  );
}
