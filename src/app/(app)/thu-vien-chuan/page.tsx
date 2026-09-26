import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { BandsTable } from "@/components/standards/bands-table";
import { LibraryHeader } from "@/components/standards/library-tabs";
import { secondaryButtonClass } from "@/components/ui/form-field";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/domain/permissions";
import { describeScope, NO_BASIS_MESSAGE } from "@/domain/standards";
import { requirePermission } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { listMeasurementTypesWithSets } from "@/lib/standards";

export const metadata: Metadata = { title: "Thư viện chuẩn" };

export default async function StandardsLibraryPage() {
  const user = await requirePermission("standards.view");
  const canManage = can(user.role, "standards.manage");
  const groups = await listMeasurementTypesWithSets();

  return (
    <div className="space-y-6">
      <LibraryHeader current="/thu-vien-chuan" />

      {groups.length === 0 && (
        <p className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-sm text-ink-muted">
          Chưa có loại chỉ số nào. {canManage && <Link href="/thu-vien-chuan/chi-so" className="text-primary-ink underline">Thêm loại chỉ số</Link>}
        </p>
      )}

      {groups.map(({ type, active, drafts, retired }) => (
        <SectionCard
          key={type.id}
          id={`cs-${type.code}`}
          title={`${type.name} (${type.unit})`}
          description={`${active.length} bộ đang áp dụng · ${drafts.length} bản nháp · ${retired.length} đã ngừng`}
          action={
            canManage ? (
              <Link href={`/thu-vien-chuan/bo-nguong/moi?chiSo=${type.id}`} className={secondaryButtonClass}>
                Soạn bộ ngưỡng
              </Link>
            ) : undefined
          }
        >
          {active.length === 0 ? (
            // Trạng thái fail-closed hiển thị rõ để ai cũng biết chỉ số này chưa được phân loại.
            <p className="flex items-center gap-2 px-5 py-4 text-sm text-attention-ink">
              <Icon name="alert" className="size-4 shrink-0" />
              {NO_BASIS_MESSAGE} – chưa có bộ ngưỡng nào được duyệt.
            </p>
          ) : (
            active.map((s) => (
              <div key={s.id} className="border-b border-line last:border-b-0">
                <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
                  <div className="text-sm">
                    <p className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone="success" icon="check" label="Đang áp dụng" />
                      <span className="font-medium">{describeScope(s)}</span>
                    </p>
                    <p className="mt-1 text-ink-muted">
                      Nguồn: {s.sourceTitle}
                      {s.sourceSection && ` – ${s.sourceSection}`} · Phiên bản {s.version} · Từ {formatDate(`${s.effectiveFrom}T00:00:00Z`)}
                    </p>
                    <p className="text-ink-muted">
                      Soạn: {s.createdBy} · Duyệt: {s.approvedBy ?? "—"}
                    </p>
                  </div>
                  <Link href={`/thu-vien-chuan/bo-nguong/${s.id}`} className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline">
                    Chi tiết
                  </Link>
                </div>
                <div className="overflow-x-auto py-2">
                  <BandsTable bands={s.bands} unit={type.unit} />
                </div>
              </div>
            ))
          )}

          {(drafts.length > 0 || retired.length > 0) && (
            <ul className="space-y-1 border-t border-line bg-page px-5 py-3 text-sm">
              {[...drafts, ...retired].map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="neutral" icon={s.status === "DRAFT" ? "prescription" : "close"} label={s.status === "DRAFT" ? "Bản nháp" : "Đã ngừng"} />
                  <Link href={`/thu-vien-chuan/bo-nguong/${s.id}`} className="text-primary-ink underline-offset-4 hover:underline">
                    Phiên bản {s.version}
                  </Link>
                  <span className="text-ink-muted">· {describeScope(s)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ))}
    </div>
  );
}
