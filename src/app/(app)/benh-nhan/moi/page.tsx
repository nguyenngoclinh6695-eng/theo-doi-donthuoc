import type { Metadata } from "next";
import { createPatient } from "@/app/actions/patients";
import { PatientForm } from "@/components/patients/patient-form";
import { requirePermission } from "@/lib/auth/dal";
import { clinicPeriods } from "@/lib/time";

export const metadata: Metadata = { title: "Thêm bệnh nhân" };

export default async function NewPatientPage() {
  await requirePermission("patients.edit");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary-strong">Thêm bệnh nhân</h1>
        <p className="mt-1 text-ink-muted">Mã bệnh nhân được cấp tự động sau khi lưu.</p>
      </div>
      <div className="rounded-xl border border-line bg-surface p-6">
        <PatientForm action={createPatient} initial={{}} submitLabel="Lưu hồ sơ" cancelHref="/benh-nhan" todayKey={clinicPeriods().todayKey} />
      </div>
    </div>
  );
}
