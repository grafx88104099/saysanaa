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
  if (me.role !== "ADMIN" && me.role !== "PM") redirect(`/admin/employees/${id}`);

  const emp = await prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!emp) notFound();

  const action = updateEmployeeAction.bind(null, emp.id);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-[12px] text-white/45 mb-5">
        <Link href="/admin/employees" className="hover:text-white transition">Ажилтан</Link>
        <span>/</span>
        <Link href={`/admin/employees/${emp.id}`} className="hover:text-white transition">
          {emp.lastName} {emp.firstName}
        </Link>
        <span>/</span>
        <span className="text-white/80">Засах</span>
      </div>
      <h1 className="text-[24px] font-semibold tracking-tight mb-6">Ажилтны мэдээлэл засах</h1>
      <EmployeeForm
        mode="edit"
        action={action}
        cancelHref={`/admin/employees/${emp.id}`}
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
