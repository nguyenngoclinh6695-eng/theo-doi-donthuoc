import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addPrescriptionItem, cancelPrescription, createPrescription, finalizePrescription, removePrescriptionItem, savePrescriptionMeta } from "@/app/actions/prescriptions";
import { completeVisit, deleteMeasurement, recordMeasurement, saveVisitNotes } from "@/app/actions/visits";
import { Icon } from "@/components/icons";
import { sexLabels } from "@/components/patients/patient-table";
import { toneBadge } from "@/components/standards/bands-table";
import { dangerButtonClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";
import { ResultButton } from "@/components/ui/result-button";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CancelRxForm } from "@/components/visits/cancel-rx-form";
import { MeasurementForm } from "@/components/visits/measurement-form";
import { PrescriptionItemForm } from "@/components/visits/prescription-item-form";
import { PrescriptionMetaForm } from "@/components/visits/prescription-meta-form";
import { VisitNotesForm } from "@/components/visits/visit-notes-form";
import { ageOn, formatAge } from "@/domain/patient";
import { can } from "@/domain/permissions";
import { requirePermission } from "@/lib/auth/dal";
import { writeAudit } from "@/lib/audit";
import { formatDate, formatDateTimeFull } from "@/lib/format";
import { listMeasurementTypes } from "@/lib/standards";
import { addDays, clinicPeriods, clinicTime } from "@/lib/time";
import { getVisitWorkspace, type PrescriptionView } from "@/lib/visits";

export const metadata: Metadata = { title: "Lượt khám" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fmt = (value: number, decimals: number) => value.toLocaleString("vi-VN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

function RxItemsTable({ rx, editable }: { rx: PrescriptionView; editable: boolean }) {
  if (rx.items.length === 0) return <p className="text-sm text-ink-muted">Đơn chưa có thuốc.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">#</th>
            <th scope="col" className="py-2 pr-3 font-medium">Thuốc</th>
            <th scope="col" className="py-2 pr-3 font-medium">Số lượng</th>
            <th scope="col" className="py-2 pr-3 font-medium">Cách dùng</th>
            {editable && <th scope="col"><span className="sr-only">Thao tác</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rx.items.map((i, idx) => (
            <tr key={i.id} className="align-top">
              <td className="py-2 pr-3 tabular-nums text-ink-muted">{idx + 1}</td>
              <td className="py-2 pr-3">
                <span className="font-medium">{i.drugName}</span>
                <span className="block text-xs text-ink-muted">{i.drugDosageForm}</span>
              </td>
              <td className="whitespace-nowrap py-2 pr-3 tabular-nums">
                {i.quantity} {i.unit}
              </td>
              <td className="py-2 pr-3">
                {i.dosageInstruction}
                {i.durationDays && <span className="block text-xs text-ink-muted">Dùng {i.durationDays} ngày</span>}
              </td>
              {editable && (
                <td className="py-2 text-right">
                  <form action={removePrescriptionItem.bind(null, i.id)}>
                    <button type="submit" className="text-sm text-danger-ink underline-offset-4 hover:underline">
                      Bỏ
                    </button>
                  </form>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function VisitWorkspacePage(props: PageProps<"/kham-benh/[id]">) {
  const user = await requirePermission("visits.view");
  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();
  const [v, types] = await Promise.all([getVisitWorkspace(id), listMeasurementTypes()]);
  if (!v) notFound();
  await writeAudit({ actorId: user.id, action: "patient.view", entityType: "Patient", entityId: v.patient.id, details: { via: "visit", visitId: v.id } });

  const open = v.status === "IN_PROGRESS";
  const may = {
    record: can(user.role, "visits.record") && open,
    diagnose: can(user.role, "visits.diagnose"),
    rxView: can(user.role, "prescriptions.view"),
    rxWrite: can(user.role, "prescriptions.write"),
  };
  const { todayKey } = clinicPeriods();
  const p = v.patient;
  const hasDraft = v.prescriptions.some((r) => r.status === "DRAFT");

  return (
    <div className="space-y-6">
      <Link href="/kham-benh" className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline">
        ← Khám bệnh hôm nay
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-strong">
            <Link href={`/benh-nhan/${p.id}`} className="underline-offset-4 hover:underline">
              {p.fullName}
            </Link>
          </h1>
          <p className="mt-1 text-ink-muted">
            {p.code}
            {p.dateOfBirth && ` · ${formatAge(ageOn(p.dateOfBirth, todayKey))}`}
            {p.sex && ` · ${sexLabels[p.sex]}`} · Bắt đầu {formatDateTimeFull(v.visitedAt)} · Bác sĩ: {v.doctorName ?? "chưa nhận"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {open ? <StatusBadge tone="neutral" icon="stethoscope" label="Đang khám" /> : <StatusBadge tone="success" icon="check" label="Đã kết thúc" />}
            {p.isSample && <StatusBadge tone="attention" icon="alert" label="Hồ sơ mẫu" />}
          </div>
        </div>
        {open && may.diagnose && (
          <ResultButton
            action={completeVisit.bind(null, v.id)}
            label="Kết thúc lượt khám"
            pendingLabel="Đang xử lý…"
            className={secondaryButtonClass}
            confirmText="Kết thúc lượt khám? Sau đó không ghi thêm chỉ số hay kê đơn trong lượt này nữa."
          />
        )}
      </header>

      {p.allergyNote && (
        <section aria-labelledby="di-ung" className="flex gap-3 rounded-xl border border-danger/40 bg-danger-soft px-5 py-4">
          <Icon name="alert" className="mt-0.5 size-5 shrink-0 text-danger-ink" />
          <div>
            <h2 id="di-ung" className="text-sm font-semibold text-danger-ink">
              Dị ứng đã ghi nhận
            </h2>
            <p className="mt-1 whitespace-pre-line text-sm">{p.allergyNote}</p>
          </div>
        </section>
      )}

      <SectionCard
        id="chi-so"
        title="Chỉ số"
        description="Phân loại lấy từ Thư viện chuẩn tại thời điểm ghi; chỉ số chưa có bộ ngưỡng được duyệt sẽ không phân loại."
      >
        {v.measurements.length === 0 ? (
          <p className="px-5 py-4 text-sm text-ink-muted">Chưa ghi chỉ số nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-2 font-medium">Giờ</th>
                  <th scope="col" className="px-3 py-2 font-medium">Chỉ số</th>
                  <th scope="col" className="px-3 py-2 font-medium">Giá trị</th>
                  <th scope="col" className="px-3 py-2 font-medium">Lần trước</th>
                  <th scope="col" className="px-3 py-2 font-medium">Phân loại theo Thư viện chuẩn</th>
                  {may.record && <th scope="col"><span className="sr-only">Thao tác</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {v.measurements.map((m) => {
                  const prev = v.previous[m.typeId];
                  return (
                    <tr key={m.id} className="align-top">
                      <td className="px-5 py-2 tabular-nums text-ink-muted">{clinicTime(new Date(m.measuredAt))}</td>
                      <td className="px-3 py-2">
                        {m.typeName}
                        <span className="block text-xs text-ink-muted">Ghi bởi {m.recordedBy}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums">
                        {fmt(m.value, m.decimals)} <span className="font-normal text-ink-muted">{m.unit}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-muted">
                        {prev ? (
                          <>
                            {fmt(prev.value, m.decimals)}
                            <span className="block text-xs">{formatDate(prev.measuredAt)}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {m.classification ? (
                          <>
                            <StatusBadge {...toneBadge[m.classification.tone]} label={m.classification.label} />
                            <span className="mt-1 block text-xs text-ink-muted">
                              Căn cứ: {m.classification.sourceTitle} · phiên bản {m.classification.version}
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-start gap-1.5 text-attention-ink">
                            <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
                            {m.noBasisMessage}
                          </span>
                        )}
                      </td>
                      {may.record && (
                        <td className="px-5 py-2 text-right">
                          <form action={deleteMeasurement.bind(null, m.id)}>
                            <button type="submit" className="text-sm text-danger-ink underline-offset-4 hover:underline">
                              Xoá
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {may.record && (
          <div className="border-t border-line px-5 py-4">
            <MeasurementForm action={recordMeasurement.bind(null, v.id)} types={types.filter((t) => t.isActive)} />
          </div>
        )}
      </SectionCard>

      <SectionCard id="ghi-chep" title="Ghi chép của bác sĩ">
        <div className="p-5">
          {may.diagnose || v.diagnosisText || v.clinicalNote || v.reason ? (
            <VisitNotesForm
              action={saveVisitNotes.bind(null, v.id)}
              readOnly={!may.diagnose || !open}
              initial={{ reason: v.reason ?? "", diagnosisText: v.diagnosisText ?? "", clinicalNote: v.clinicalNote ?? "" }}
            />
          ) : (
            <p className="text-sm text-ink-muted">Bác sĩ chưa ghi chép.</p>
          )}
        </div>
      </SectionCard>

      {may.rxView && (
        <SectionCard
          id="don-thuoc"
          title="Đơn thuốc"
          description="Bác sĩ tự chọn thuốc; khi chốt, hệ thống chỉ kiểm tra đơn đã đủ thông tin hành chính."
          action={
            open && may.rxWrite && !hasDraft ? (
              <form action={createPrescription.bind(null, v.id)}>
                <button type="submit" className={primaryButtonClass}>
                  Kê đơn thuốc
                </button>
              </form>
            ) : undefined
          }
        >
          {v.prescriptions.length === 0 && <p className="px-5 py-4 text-sm text-ink-muted">Chưa có đơn thuốc trong lượt khám này.</p>}
          {v.prescriptions.map((rx) => {
            const editable = rx.status === "DRAFT" && may.rxWrite;
            return (
              <div key={rx.id} className="space-y-4 border-b border-line px-5 py-4 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    <span className="font-semibold tabular-nums">{rx.code}</span> · {rx.doctorName}
                    {rx.finalizedAt && ` · chốt ${formatDateTimeFull(rx.finalizedAt)}`}
                  </p>
                  {rx.status === "DRAFT" && <StatusBadge tone="neutral" icon="prescription" label="Bản nháp – chưa chốt" />}
                  {rx.status === "FINALIZED" && <StatusBadge tone="success" icon="lock" label="Đã chốt" />}
                  {rx.status === "CANCELLED" && <StatusBadge tone="danger" icon="close" label="Đã huỷ" />}
                </div>

                {rx.status !== "DRAFT" && (
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-ink-muted">Chẩn đoán trên đơn</dt>
                      <dd>{rx.diagnosisText ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-muted">Hẹn tái khám</dt>
                      <dd>{rx.followUpDate ? formatDate(`${rx.followUpDate}T00:00:00Z`) : "Không hẹn"}</dd>
                    </div>
                    {rx.advice && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-ink-muted">Lời dặn</dt>
                        <dd className="whitespace-pre-line">{rx.advice}</dd>
                      </div>
                    )}
                    {rx.cancelReason && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-ink-muted">Lý do huỷ</dt>
                        <dd className="text-danger-ink">{rx.cancelReason}</dd>
                      </div>
                    )}
                  </dl>
                )}

                <RxItemsTable rx={rx} editable={editable && open} />

                {editable && open && (
                  <>
                    <PrescriptionItemForm action={addPrescriptionItem.bind(null, rx.id)} />
                    <PrescriptionMetaForm
                      action={savePrescriptionMeta.bind(null, rx.id)}
                      minDate={addDays(todayKey, 1)}
                      initial={{ advice: rx.advice ?? "", followUpDate: rx.followUpDate ?? "" }}
                    />
                    <div className="flex flex-wrap items-start gap-3 border-t border-line pt-4">
                      <ResultButton
                        action={finalizePrescription.bind(null, rx.id)}
                        label="Chốt đơn"
                        pendingLabel="Đang kiểm tra…"
                        className={primaryButtonClass}
                        confirmText="Chốt đơn? Sau khi chốt, đơn không sửa được nữa (chỉ có thể huỷ kèm lý do)."
                      />
                      <ResultButton
                        action={cancelPrescription.bind(null, rx.id)}
                        label="Xoá bản nháp"
                        pendingLabel="Đang xoá…"
                        className={dangerButtonClass}
                        confirmText="Xoá bản nháp đơn thuốc này?"
                      />
                    </div>
                    <p className="text-xs text-ink-muted">Chẩn đoán in trên đơn lấy từ mục “Ghi chép của bác sĩ” ở trên – hãy lưu chẩn đoán trước khi chốt.</p>
                  </>
                )}

                {rx.status === "FINALIZED" && (
                  <div className="flex flex-wrap items-start gap-3 border-t border-line pt-4">
                    <button type="button" disabled title="Sẽ có ở bước in đơn (bước 6)" className={secondaryButtonClass}>
                      In đơn
                    </button>
                    {may.rxWrite && <CancelRxForm id={rx.id} action={cancelPrescription.bind(null, rx.id)} />}
                  </div>
                )}
              </div>
            );
          })}
        </SectionCard>
      )}
    </div>
  );
}
