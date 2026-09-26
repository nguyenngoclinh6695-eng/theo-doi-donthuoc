import type { PrescriptionAwaitingScan } from "@/domain/types";
import { Icon } from "@/components/icons";
import { SectionCard } from "@/components/ui/section-card";
import { formatDateTime } from "@/lib/format";

export function AwaitingScan({ items }: { items: PrescriptionAwaitingScan[] }) {
  return (
    <SectionCard
      id="cho-scan"
      title="Đơn chờ tải bản scan"
      description="Đơn đã chốt nhưng chưa có bản scan có chữ ký bác sĩ"
    >
      {items.length === 0 ? (
        <p className="flex items-center justify-center gap-2 px-5 py-6 text-sm text-success-ink">
          <Icon name="check" className="size-4" />
          Tất cả đơn đã chốt đều có bản scan.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((p) => (
            <li key={p.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{p.patientName}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    <span className="tabular-nums">{p.code}</span> · Chốt lúc {formatDateTime(p.finalizedAt)}
                  </p>
                  <p className="text-sm text-ink-muted">{p.doctorName}</p>
                </div>
                {/* Chức năng tải lên sẽ làm ở bước đơn thuốc; nút tạm vô hiệu và ghi rõ lý do. */}
                <button
                  type="button"
                  disabled
                  title="Sẽ có ở bước làm Đơn thuốc"
                  className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted"
                >
                  <Icon name="upload" className="size-4" />
                  Tải bản scan
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
