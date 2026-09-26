import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PatientSearchPanel } from "@/components/patients/patient-search-panel";
import { PatientTable } from "@/components/patients/patient-table";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";
import { can } from "@/domain/permissions";
import { requirePermission } from "@/lib/auth/dal";
import { listPatients, PATIENT_PAGE_SIZE } from "@/lib/patients";
import { clinicPeriods } from "@/lib/time";

export const metadata: Metadata = { title: "Bệnh nhân" };

export default async function PatientsPage(props: PageProps<"/benh-nhan">) {
  const user = await requirePermission("patients.view");
  const { trang } = await props.searchParams;
  const requested = Number(typeof trang === "string" ? trang : 1);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;

  const { items, total } = await listPatients(page);
  const pageCount = Math.max(1, Math.ceil(total / PATIENT_PAGE_SIZE));
  const { todayKey } = clinicPeriods();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary-strong">Bệnh nhân</h1>
          <p className="mt-1 text-ink-muted">{total} hồ sơ · sắp theo lần cập nhật gần nhất</p>
        </div>
        {can(user.role, "patients.edit") && (
          <Link href="/benh-nhan/moi" className={primaryButtonClass}>
            <Icon name="users" className="size-4" />
            Thêm bệnh nhân
          </Link>
        )}
      </div>

      <section aria-label="Danh sách bệnh nhân" className="rounded-xl border border-line bg-surface">
        <PatientSearchPanel todayKey={todayKey}>
          {items.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-muted">Chưa có hồ sơ nào.</p>
          ) : (
            <PatientTable items={items} todayKey={todayKey} caption={`Danh sách bệnh nhân, trang ${page}/${pageCount}`} />
          )}
          {pageCount > 1 && (
            <nav aria-label="Phân trang" className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
              <span className="text-ink-muted">
                Trang {page}/{pageCount}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`/benh-nhan?trang=${page - 1}`} className={secondaryButtonClass}>
                    ← Trang trước
                  </Link>
                )}
                {page < pageCount && (
                  <Link href={`/benh-nhan?trang=${page + 1}`} className={secondaryButtonClass}>
                    Trang sau →
                  </Link>
                )}
              </div>
            </nav>
          )}
        </PatientSearchPanel>
      </section>
    </div>
  );
}
