import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { approveSet, deleteDraftSet, newVersionFrom, retireSet } from "@/app/actions/standards";
import { BandsTable } from "@/components/standards/bands-table";
import { ResultButton } from "@/components/ui/result-button";
import { dangerButtonClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/domain/permissions";
import { describeScope } from "@/domain/standards";
import { requirePermission } from "@/lib/auth/dal";
import { formatDate, formatDateTimeFull } from "@/lib/format";
import { getSetDetail } from "@/lib/standards";

export const metadata: Metadata = { title: "Bộ ngưỡng" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statusBadge = {
  DRAFT: { tone: "neutral", icon: "prescription", label: "Bản nháp – chưa dùng để phân loại" },
  ACTIVE: { tone: "success", icon: "check", label: "Đang áp dụng" },
  RETIRED: { tone: "neutral", icon: "close", label: "Đã ngừng áp dụng" },
} as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export default async function SetDetailPage(props: PageProps<"/thu-vien-chuan/bo-nguong/[id]">) {
  const user = await requirePermission("standards.view");
  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();
  const s = await getSetDetail(id);
  if (!s) notFound();

  const canManage = can(user.role, "standards.manage");
  const canApprove = can(user.role, "standards.approve");
  const isAuthor = s.createdById === user.id;

  return (
    <div className="space-y-6">
      <Link href="/thu-vien-chuan" className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline">
        ← Thư viện chuẩn
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-strong">
            {s.measurementType.name} – phiên bản {s.version}
          </h1>
          <div className="mt-2">
            <StatusBadge {...statusBadge[s.status]} />
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {s.status === "DRAFT" && canManage && (
            <>
              <Link href={`/thu-vien-chuan/bo-nguong/${s.id}/sua`} className={secondaryButtonClass}>
                Sửa bản nháp
              </Link>
              <form action={deleteDraftSet.bind(null, s.id)}>
                <button type="submit" className={dangerButtonClass}>
                  Xoá bản nháp
                </button>
              </form>
            </>
          )}
          {s.status === "DRAFT" && canApprove && !isAuthor && (
            <ResultButton
              action={approveSet.bind(null, s.id)}
              label="Duyệt và áp dụng"
              pendingLabel="Đang duyệt…"
              className={primaryButtonClass}
              confirmText="Xác nhận đã đối chiếu từng khoảng với văn bản nguồn và duyệt bộ ngưỡng này?"
            />
          )}
          {s.status === "ACTIVE" && canApprove && (
            <ResultButton
              action={retireSet.bind(null, s.id)}
              label="Ngừng áp dụng"
              pendingLabel="Đang xử lý…"
              className={dangerButtonClass}
              confirmText="Ngừng áp dụng bộ ngưỡng này? Chỉ số sẽ hiện “Chưa có căn cứ” cho tới khi có bộ mới được duyệt."
            />
          )}
          {s.status !== "DRAFT" && canManage && (
            <form action={newVersionFrom.bind(null, s.id)}>
              <button type="submit" className={secondaryButtonClass}>
                Tạo phiên bản mới từ bộ này
              </button>
            </form>
          )}
        </div>
      </header>

      {s.status === "DRAFT" && canApprove && isAuthor && (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          Bạn là người soạn bản nháp này nên không thể tự duyệt. Cần một bác sĩ khác đối chiếu với văn bản nguồn và duyệt.
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <SectionCard id="can-cu" title="Căn cứ">
          <dl className="space-y-3 p-5">
            <Row label="Văn bản nguồn">
              {s.source.title}
              {s.source.url && (
                <>
                  {" "}
                  <a href={s.source.url} target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">
                    (mở)
                  </a>
                </>
              )}
            </Row>
            <Row label="Số hiệu · cơ quan">{[s.source.documentNumber, s.source.issuer].filter(Boolean).join(" · ") || "Chưa ghi"}</Row>
            <Row label="Mục / bảng / trang">{s.sourceSection ?? "Chưa ghi"}</Row>
            <Row label="Áp dụng từ">{formatDate(`${s.effectiveFrom}T00:00:00Z`)}</Row>
            <Row label="Phạm vi">{describeScope(s)}</Row>
            <Row label="Người soạn">
              {s.createdBy} · {formatDateTimeFull(s.createdAt)}
            </Row>
            <Row label="Người duyệt">{s.approvedBy ? `${s.approvedBy} · ${formatDateTimeFull(s.approvedAt!)}` : "Chưa duyệt"}</Row>
            {s.retiredAt && <Row label="Ngừng áp dụng lúc">{formatDateTimeFull(s.retiredAt)}</Row>}
            {s.note && <Row label="Ghi chú">{s.note}</Row>}
          </dl>
        </SectionCard>

        <SectionCard id="khoang" title="Các khoảng giá trị" description={`Đơn vị: ${s.measurementType.unit}`}>
          <div className="overflow-x-auto py-2">
            <BandsTable bands={s.bands} unit={s.measurementType.unit} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
