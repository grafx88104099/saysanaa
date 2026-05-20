import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";
import EmployeeForm from "@/components/EmployeeForm";
import { updateEmployeeAction } from "../../actions";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await readSession();
  if (!me) redirect("/login");
  if (me.role !== "ADMIN" && me.role !== "PM") redirect(`/employees/${id}`);

  const emp = await prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!emp) notFound();

  const action = updateEmployeeAction.bind(null, emp.id);

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center gap-2 text-[11px] text-sub mb-2">
        <Link href="/employees" className="hover:text-tx">Ажилтан</Link>
        <span>/</span>
        <Link href={`/employees/${emp.id}`} className="hover:text-tx">
          {emp.lastName} {emp.firstName}
        </Link>
        <span>/</span>
        <span className="text-tx">Засах</span>
      </div>
      <h1 className="text-[22px] font-extrabold tracking-tight mb-5">Ажилтны мэдээлэл засах</h1>
      <EmployeeForm
        mode="edit"
        action={action}
        cancelHref={`/employees/${emp.id}`}
        initial={{
          email: emp.user.email,
          firstName: emp.firstName,
          lastName: emp.lastName,
          phone: emp.phone,
          registerNumber: emp.registerNumber,
          photoUrl: emp.photoUrl,
          role: emp.role,
          profession: emp.profession,
          autocadLevel: emp.autocadLevel,
          sketchupLevel: emp.sketchupLevel,
          languages: emp.languages,
        }}
      />
    </div>
  );
}
