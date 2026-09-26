import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createAppointment, rescheduleAppointment, setAppointmentStatus } from "@/app/actions/appointments";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { RescheduleForm } from "@/components/appointments/reschedule-form";
import type { IconName } from "@/components/icons";
import { secondaryButtonClass } from "@/components/ui/form-field";
import { ResultButton } from "@/components/ui/result-button";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge, type Tone } from "@/components/ui/status-badge";
import { canReschedule, canTransition, type ApptStatus } from "@/domain/appointment";
import { can } from "@/domain/permissions";
import { requirePermission } from "@/lib/auth/dal";
import { getPatientBrief, listAppointmentsOn, pendingFollowUps } from "@/lib/appointments";
import { formatLongDate } from "@/lib/format";
import { addDays, clinicPeriods } from "@/lib/time";

export const metadata: Metadata = { title: "Tiếp đón & lịch hẹn" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const statusView: Record<ApptStatus, { label: string; tone: Tone; icon: IconName }> = {
  SCHEDULED: { label: "Đã hẹn", tone: "neutral", icon: "clock" },
  ARRIVED: { label: "Đã đến", tone: "success", icon: "check" },
  NO_SHOW: { label: "Vắng", tone: "attention", icon: "xCircle" },
  CANCELLED: { label: "Đã huỷ", tone: "neutral", icon: "close" },
};

const actionLabels: Partial<Record<ApptStatus, string>> = {
  ARRIVED: "Đã đến",
  NO_SHOW: "Vắng",
  CANCELLED: "Huỷ hẹn",
  SCHEDULED: "Hoàn tác",
};

const smallBtn = "rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-primary-ink hover:border-primary hover:bg-accent disabled:opacity-60";
const ddmm = (key: string) => key.split("-").reverse().join("/");

export default async function ReceptionPage(props: PageProps<"/tiep-don">) {
  await connection();
  const user = await requirePermission("appointments.view");
  const canManage = can(user.role, "appointments.manage");
  const sp = await props.searchParams;
  const { todayKey } = clinicPeriods();
  const day = typeof sp.ngay === "string" && DATE_RE.test(sp.ngay) ? sp.ngay : todayKey;

  // Đặt lịch từ mục "tái khám theo đơn": điền sẵn bệnh nhân và ngày (không chứa thông tin nhận dạng trên URL, chỉ mã hồ sơ).
  const prefillPatientId = typeof sp.benhNhan === "string" && UUID_RE.test(sp.benhNhan) ? sp.benhNhan : null;
  const prefillDate = typeof sp.henNgay === "string" && DATE_RE.test(sp.henNgay) && sp.henNgay >= todayKey ? sp.henNgay : day >= todayKey ? day : todayKey;

  const [appointments, followUps, prefillPatient] = await Promise.all([
    listAppointmentsOn(day),
    canManage ? pendingFollowUps(todayKey) : Promise.resolve([]),
    prefillPatientId ? getPatientBrief(prefillPatientId) : Promise.resolve(null),
  ]);
  const active = appointments.filter((a) => a.status !== "CANCELLED");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary-strong">Tiếp đón & lịch hẹn</h1>
          <p className="mt-1 capitalize text-ink-muted">{formatLongDate(new Date(`${day}T12:00:00Z`))}</p>
        </div>
        <nav aria-label="Chọn ngày" className="flex flex-wrap items-end gap-2">
          <Link href={`/tiep-don?ngay=${addDays(day, -1)}`} className={secondaryButtonClass}>
            ← Hôm trước
          </Link>
          {day !== todayKey && (
            <Link href="/tiep-don" className={secondaryButtonClass}>
              Hôm nay
            </Link>
          )}
          <Link href={`/tiep-don?ngay=${addDays(day, 1)}`} className={secondaryButtonClass}>
            Hôm sau →
          </Link>
          <form className="flex items-end gap-2">
            <label htmlFor="pick-day" className="sr-only">
              Chọn ngày
            </label>
            <input id="pick-day" name="ngay" type="date" defaultValue={day} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm" />
            <button type="submit" className={secondaryButtonClass}>
              Xem
            </button>
          </form>
        </nav>
      </div>

      <div className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${canManage ? "xl:grid-cols-[minmax(0,1fr)_24rem]" : ""}`}>
        <SectionCard
          id="lich-ngay"
          title={day === todayKey ? "Lịch hẹn hôm nay" : `Lịch hẹn ngày ${ddmm(day)}`}
          description={`${active.length} lịch hẹn · ${active.filter((a) => a.status === "ARRIVED").length} đã đến · ${active.filter((a) => a.status === "NO_SHOW").length} vắng`}
        >
          {appointments.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted">Không có lịch hẹn.</p>
          ) : (
            <ul className="divide-y divide-line">
              {appointments.map((a) => {
                const hasVisit = a.visitId !== null;
                const targets = (["ARRIVED", "NO_SHOW", "CANCELLED", "SCHEDULED"] as ApptStatus[]).filter((t) => canTransition(a.status, t, hasVisit));
                return (
                  <li key={a.id} className={`flex flex-wrap items-start gap-x-5 gap-y-2 px-5 py-3 ${a.status === "CANCELLED" ? "bg-page text-ink-muted" : ""}`}>
                    <span className="w-14 pt-0.5 font-semibold tabular-nums text-primary-strong">{a.time}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/benh-nhan/${a.patientId}`} className="font-medium underline-offset-4 hover:text-primary-ink hover:underline">
                        {a.patientName}
                      </Link>
                      <span className="ml-2 text-xs tabular-nums text-ink-muted">{a.patientCode}</span>
                      <p className="text-sm text-ink-muted">
                        {a.reason}
                        {a.phone && <span className="tabular-nums"> · {a.phone}</span>}
                      </p>
                      {canManage && canReschedule(a.status, hasVisit) && (
                        <div className="mt-1">
                          <RescheduleForm id={a.id} action={rescheduleAppointment.bind(null, a.id)} dateKey={day} time={a.time} minDate={todayKey} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge {...statusView[a.status]} />
                      {hasVisit && (
                        <Link href={`/kham-benh/${a.visitId}`} className="text-xs font-medium text-primary-ink underline-offset-4 hover:underline">
                          Mở lượt khám
                        </Link>
                      )}
                      {canManage && targets.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {targets.map((t) => (
                            <ResultButton
                              key={t}
                              action={setAppointmentStatus.bind(null, a.id, t)}
                              label={actionLabels[t]!}
                              pendingLabel="…"
                              className={smallBtn}
                              confirmText={t === "CANCELLED" ? "Huỷ lịch hẹn này? Lịch đã huỷ không khôi phục được." : undefined}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {canManage && (
          <div className="space-y-6">
            <SectionCard id="dat-lich" title="Đặt lịch hẹn">
              <div className="p-5">
                <AppointmentForm
                  // key theo bệnh nhân điền sẵn để form làm mới khi bấm "Đặt lịch" ở mục tái khám.
                  key={`${prefillPatient?.id ?? "none"}-${prefillDate}`}
                  action={createAppointment}
                  initialPatient={prefillPatient ? { id: prefillPatient.id, fullName: prefillPatient.fullName, code: prefillPatient.code } : null}
                  initialDate={prefillDate}
                  initialReason={prefillPatient ? "Tái khám theo hẹn trên đơn thuốc" : ""}
                  minDate={todayKey}
                />
              </div>
            </SectionCard>

            <SectionCard id="tai-kham-theo-don" title="Cần đặt lịch tái khám theo đơn" description="Đơn đã chốt có ngày hẹn tái khám mà bệnh nhân chưa có lịch vào ngày đó.">
              {followUps.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-muted">Không có.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {followUps.map((f) => (
                    <li key={f.prescriptionId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                      <div>
                        <p className="font-medium">{f.patientName}</p>
                        <p className="text-ink-muted">
                          Hẹn ngày {ddmm(f.followUpDate)} · theo đơn <span className="tabular-nums">{f.code}</span>
                        </p>
                      </div>
                      <Link href={`/tiep-don?ngay=${f.followUpDate}&henNgay=${f.followUpDate}&benhNhan=${f.patientId}#dat-lich-heading`} className={secondaryButtonClass}>
                        Đặt lịch
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
