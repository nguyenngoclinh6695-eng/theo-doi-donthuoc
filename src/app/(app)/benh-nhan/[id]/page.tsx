import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { sexLabels } from "@/components/patients/patient-table";
import { startVisit } from "@/app/actions/visits";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge, type Tone } from "@/components/ui/status-badge";
import { ageOn, formatAge } from "@/domain/patient";
import { can } from "@/domain/permissions";
import type { AppointmentStatus, PrescriptionStatus } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/dal";
import { writeAudit } from "@/lib/audit";
import { formatDate, formatDateTimeFull } from "@/lib/format";
import { getPatientDetail } from "@/lib/patients";
import { clinicPeriods } from "@/lib/time";

export const metadata: Metadata = { title: "Hồ sơ bệnh nhân" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const appointmentStatus: Record<AppointmentStatus, { label: string; tone: Tone; icon: IconName }> = {
  SCHEDULED: { label: "Đã hẹn", tone: "neutral", icon: "clock" },
  ARRIVED: { label: "Đã đến", tone: "success", icon: "check" },
  NO_SHOW: { label: "Vắng", tone: "attention", icon: "xCircle" },
  CANCELLED: { label: "Đã huỷ", tone: "neutral", icon: "close" },
};

const prescriptionStatus: Record<PrescriptionStatus, { label: string; tone: Tone; icon: IconName }> = {
  DRAFT: { label: "Đang kê", tone: "neutral", icon: "prescription" },
  FINALIZED: { label: "Đã chốt", tone: "success", icon: "check" },
  CANCELLED: { label: "Đã huỷ", tone: "neutral", icon: "close" },
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{value ?? <span className="text-ink-muted">Chưa ghi</span>}</dd>
    </div>
  );
}

export default async function PatientDetailPage(props: PageProps<"/benh-nhan/[id]">) {
  const user = await requirePermission("patients.view");
  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const canSeePrescriptions = can(user.role, "prescriptions.view");
  const p = await getPatientDetail(id, { includePrescriptions: canSeePrescriptions });
  if (!p) notFound();

  // Ghi nhận ai đã mở hồ sơ – yêu cầu cơ bản với dữ liệu sức khoẻ.
  await writeAudit({ actorId: user.id, action: "patient.view", entityType: "Patient", entityId: p.id });

  const { todayKey, todayStart } = clinicPeriods();
  const upcoming = p.appointments.filter((a) => new Date(a.scheduledAt) >= todayStart && a.status !== "CANCELLED").reverse();
  const past = p.appointments.filter((a) => !upcoming.includes(a));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/benh-nhan" className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline">
          ← Danh sách bệnh nhân
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-strong">{p.fullName}</h1>
          <p className="mt-1 text-ink-muted">
            <span className="tabular-nums">{p.code}</span>
            {p.dateOfBirth && ` · ${formatAge(ageOn(p.dateOfBirth, todayKey))}`}
            {p.sex && ` · ${sexLabels[p.sex]}`}
          </p>
          {p.isSample && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-attention/40 bg-attention-soft px-3 py-1 text-xs font-medium text-attention-ink">
              <Icon name="alert" className="size-3.5" />
              Hồ sơ mẫu
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {can(user.role, "visits.record") && (
            <form action={startVisit.bind(null, p.id, null)}>
              <button type="submit" className={primaryButtonClass}>
                Bắt đầu lượt khám
              </button>
            </form>
          )}
          {can(user.role, "patients.edit") && (
            <Link href={`/benh-nhan/${p.id}/sua`} className={secondaryButtonClass}>
              Sửa hồ sơ
            </Link>
          )}
        </div>
      </header>

      {/* Dị ứng đặt ở đầu, có biểu tượng và chữ, để không bị bỏ sót khi mở hồ sơ. Nội dung đúng như nhân viên đã ghi. */}
      {p.allergyNote && (
        <section aria-labelledby="di-ung-heading" className="flex gap-3 rounded-xl border border-danger/40 bg-danger-soft px-5 py-4">
          <Icon name="alert" className="mt-0.5 size-5 shrink-0 text-danger-ink" />
          <div>
            <h2 id="di-ung-heading" className="text-sm font-semibold text-danger-ink">
              Dị ứng đã ghi nhận
            </h2>
            <p className="mt-1 whitespace-pre-line text-sm">{p.allergyNote}</p>
          </div>
        </section>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <SectionCard id="hanh-chinh" title="Thông tin hành chính">
          <dl className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-1">
            <InfoRow label="Ngày sinh" value={p.dateOfBirth ? formatDate(`${p.dateOfBirth}T00:00:00Z`) : null} />
            <InfoRow label="Số điện thoại" value={p.phone} />
            <InfoRow label="Số CCCD / định danh" value={p.idNumber} />
            <InfoRow label="Mã thẻ BHYT" value={p.insuranceNo} />
            <InfoRow label="Cha/mẹ hoặc người giám hộ" value={p.guardianName} />
            <InfoRow label="Địa chỉ" value={p.address} />
            <InfoRow label="Cập nhật lần cuối" value={formatDateTimeFull(p.updatedAt)} />
          </dl>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard id="lich-hen" title="Lịch hẹn" description={`${upcoming.length} sắp tới · ${past.length} đã qua`}>
            {p.appointments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-muted">Chưa có lịch hẹn.</p>
            ) : (
              <ul className="divide-y divide-line">
                {[...upcoming, ...past].map((a) => {
                  const s = appointmentStatus[a.status];
                  return (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-sm font-medium tabular-nums">
                          {formatDateTimeFull(a.scheduledAt)}
                          {upcoming.includes(a) && <span className="ml-2 text-xs font-normal text-primary-ink">Sắp tới</span>}
                        </p>
                        <p className="text-sm text-ink-muted">{a.reason}</p>
                      </div>
                      <StatusBadge {...s} />
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard id="luot-kham" title="Lượt khám" description={`${p.visits.length} lượt gần nhất`}>
            {p.visits.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-muted">Chưa có lượt khám.</p>
            ) : (
              <ul className="divide-y divide-line">
                {p.visits.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    {can(user.role, "visits.view") ? (
                      <Link href={`/kham-benh/${v.id}`} className="font-medium tabular-nums text-primary-ink underline-offset-4 hover:underline">
                        {formatDateTimeFull(v.visitedAt)}
                      </Link>
                    ) : (
                      <span className="font-medium tabular-nums">{formatDateTimeFull(v.visitedAt)}</span>
                    )}
                    <span className="flex items-center gap-2 text-ink-muted">
                      {v.inProgress && <StatusBadge tone="neutral" icon="stethoscope" label="Đang khám" />}
                      {v.doctorName ?? "Chưa có bác sĩ nhận"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {canSeePrescriptions && (
            <SectionCard id="don-thuoc" title="Đơn thuốc">
              {p.prescriptions.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ink-muted">Chưa có đơn thuốc.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {p.prescriptions.map((r) => {
                    const s = prescriptionStatus[r.status];
                    return (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div className="text-sm">
                          <p className="font-medium tabular-nums">{r.code}</p>
                          <p className="text-ink-muted">
                            {r.doctorName}
                            {r.finalizedAt && ` · chốt ${formatDateTimeFull(r.finalizedAt)}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge {...s} />
                          {r.status === "FINALIZED" &&
                            (r.hasScan ? (
                              <StatusBadge tone="success" icon="upload" label="Đã có bản scan" />
                            ) : (
                              <StatusBadge tone="attention" icon="upload" label="Chưa có bản scan" />
                            ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          )}

          {p.reminderCalls.length > 0 && (
            <SectionCard id="goi-nhac" title="Lần gọi nhắc tái khám">
              <ul className="divide-y divide-line">
                {p.reminderCalls.map((c) => (
                  <li key={c.id} className="flex flex-wrap justify-between gap-3 px-5 py-3 text-sm">
                    <span className="tabular-nums">{formatDateTimeFull(c.calledAt)}</span>
                    <span className="text-ink-muted">{c.calledBy}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
