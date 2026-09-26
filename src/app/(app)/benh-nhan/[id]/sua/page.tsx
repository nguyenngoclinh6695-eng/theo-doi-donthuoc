import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updatePatient } from "@/app/actions/patients";
import { PatientForm } from "@/components/patients/patient-form";
import { requirePermission } from "@/lib/auth/dal";
import { getPatientDetail } from "@/lib/patients";
import { clinicPeriods } from "@/lib/time";

export const metadata: Metadata = { title: "Sửa hồ sơ bệnh nhân" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPatientPage(props: PageProps<"/benh-nhan/[id]/sua">) {
  await requirePermission("patients.edit");
  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();
  const p = await getPatientDetail(id, { includePrescriptions: false });
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary-strong">Sửa hồ sơ</h1>
        <p className="mt-1 text-ink-muted">
          {p.fullName} · {p.code}
        </p>
      </div>
      <div className="rounded-xl border border-line bg-surface p-6">
        <PatientForm
          action={updatePatient.bind(null, p.id)}
          initial={{
            fullName: p.fullName,
            dateOfBirth: p.dateOfBirth ?? "",
            sex: p.sex ?? "",
            phone: p.phone ?? "",
            address: p.address ?? "",
            idNumber: p.idNumber ?? "",
            insuranceNo: p.insuranceNo ?? "",
            guardianName: p.guardianName ?? "",
            allergyNote: p.allergyNote ?? "",
          }}
          submitLabel="Lưu thay đổi"
          cancelHref={`/benh-nhan/${p.id}`}
          todayKey={clinicPeriods().todayKey}
        />
      </div>
    </div>
  );
}
