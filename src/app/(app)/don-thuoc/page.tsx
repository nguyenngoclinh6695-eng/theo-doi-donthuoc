import type { Metadata } from "next";
import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PrescriptionStatus } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/dal";
import { formatDateTimeFull } from "@/lib/format";
import { listPrescriptions } from "@/lib/visits";

export const metadata: Metadata = { title: "Đơn thuốc" };

const filters: { key: string; label: string; status: PrescriptionStatus | null }[] = [
  { key: "", label: "Tất cả", status: null },
  { key: "nhap", label: "Bản nháp", status: "DRAFT" },
  { key: "da-chot", label: "Đã chốt", status: "FINALIZED" },
  { key: "da-huy", label: "Đã huỷ", status: "CANCELLED" },
];

export default async function PrescriptionsPage(props: PageProps<"/don-thuoc">) {
  await requirePermission("prescriptions.view");
  const { loc } = await props.searchParams;
  const current = filters.find((f) => f.key === (typeof loc === "string" ? loc : "")) ?? filters[0];
  const rows = await listPrescriptions(current.status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary-strong">Đơn thuốc</h1>
        <p className="mt-1 text-ink-muted">Kê đơn trong màn hình Khám bệnh. Đơn đã chốt không sửa được; muốn đổi phải huỷ (ghi lý do) và kê đơn mới.</p>
      </div>

      <nav aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/don-thuoc?loc=${f.key}` : "/don-thuoc"}
            aria-current={f === current ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${f === current ? "border-primary bg-accent font-medium text-primary-strong" : "border-line bg-surface text-ink-muted hover:text-primary-ink"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <SectionCard id="ds-don" title={current.label} description={`${rows.length} đơn gần nhất`}>
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">Không có đơn.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-2 font-medium">Số đơn</th>
                  <th scope="col" className="px-3 py-2 font-medium">Bệnh nhân</th>
                  <th scope="col" className="px-3 py-2 font-medium">Bác sĩ</th>
                  <th scope="col" className="px-3 py-2 font-medium">Số thuốc</th>
                  <th scope="col" className="px-3 py-2 font-medium">Thời điểm</th>
                  <th scope="col" className="px-5 py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-5 py-2 font-medium tabular-nums">
                      {r.visitId ? (
                        <Link href={`/kham-benh/${r.visitId}`} className="text-primary-ink underline-offset-4 hover:underline">
                          {r.code}
                        </Link>
                      ) : (
                        r.code
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/benh-nhan/${r.patientId}`} className="underline-offset-4 hover:text-primary-ink hover:underline">
                        {r.patientName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{r.doctorName}</td>
                    <td className="px-3 py-2 tabular-nums">{r.itemCount}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-muted">{formatDateTimeFull(r.finalizedAt ?? r.createdAt)}</td>
                    <td className="px-5 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {r.status === "DRAFT" && <StatusBadge tone="neutral" icon="prescription" label="Bản nháp" />}
                        {r.status === "FINALIZED" && <StatusBadge tone="success" icon="lock" label="Đã chốt" />}
                        {r.status === "CANCELLED" && <StatusBadge tone="danger" icon="close" label="Đã huỷ" />}
                        {r.status === "FINALIZED" && !r.hasScan && <StatusBadge tone="attention" icon="upload" label="Chưa có bản scan" />}
                        {r.status === "FINALIZED" && (
                          <a href={`/don-thuoc/${r.id}/pdf`} target="_blank" rel="noopener" className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline">
                            In đơn
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
