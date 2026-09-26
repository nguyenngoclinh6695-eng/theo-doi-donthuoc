import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { startVisit } from "@/app/actions/visits";
import { secondaryButtonClass, primaryButtonClass } from "@/components/ui/form-field";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/domain/permissions";
import { requirePermission } from "@/lib/auth/dal";
import { getTodayBoard } from "@/lib/visits";
import { clinicTime } from "@/lib/time";

export const metadata: Metadata = { title: "Khám bệnh" };

export default async function VisitBoardPage() {
  await connection();
  const user = await requirePermission("visits.view");
  const canStart = can(user.role, "visits.record");
  const { appointments, walkIns } = await getTodayBoard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary-strong">Khám bệnh hôm nay</h1>
        <p className="mt-1 text-ink-muted">Khám không có hẹn: mở hồ sơ bệnh nhân (ô tìm ở trên cùng) rồi bấm “Bắt đầu lượt khám”.</p>
      </div>

      <SectionCard id="theo-hen" title="Theo lịch hẹn" description={`${appointments.length} lịch hẹn hôm nay`}>
        {appointments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">Hôm nay không có lịch hẹn.</p>
        ) : (
          <ul className="divide-y divide-line">
            {appointments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
                <span className="w-14 font-semibold tabular-nums text-primary-strong">{clinicTime(new Date(a.scheduledAt))}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/benh-nhan/${a.patientId}`} className="font-medium underline-offset-4 hover:text-primary-ink hover:underline">
                    {a.patientName}
                  </Link>
                  <p className="text-sm text-ink-muted">{a.reason}</p>
                </div>
                {a.visitId ? (
                  <Link href={`/kham-benh/${a.visitId}`} className={secondaryButtonClass}>
                    Mở lượt khám
                  </Link>
                ) : a.status === "NO_SHOW" ? (
                  <StatusBadge tone="attention" icon="xCircle" label="Vắng" />
                ) : canStart ? (
                  <form action={startVisit.bind(null, a.patientId, a.id)}>
                    <button type="submit" className={primaryButtonClass}>
                      Bắt đầu khám
                    </button>
                  </form>
                ) : (
                  <StatusBadge tone="neutral" icon="clock" label="Chờ khám" />
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard id="khong-hen" title="Khám không hẹn" description={`${walkIns.length} lượt hôm nay`}>
        {walkIns.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">Chưa có lượt khám không hẹn.</p>
        ) : (
          <ul className="divide-y divide-line">
            {walkIns.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
                <span className="w-14 font-semibold tabular-nums text-primary-strong">{clinicTime(new Date(v.visitedAt))}</span>
                <span className="min-w-0 flex-1 font-medium">{v.patientName}</span>
                <StatusBadge {...(v.status === "IN_PROGRESS" ? { tone: "neutral", icon: "stethoscope", label: "Đang khám" } : { tone: "success", icon: "check", label: "Đã xong" } as const)} />
                <Link href={`/kham-benh/${v.id}`} className={secondaryButtonClass}>
                  Mở lượt khám
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
