import type { Appointment, AppointmentStatus } from "@/domain/types";
import type { IconName } from "@/components/icons";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge, type Tone } from "@/components/ui/status-badge";

const statusDisplay: Record<AppointmentStatus, { label: string; tone: Tone; icon: IconName }> = {
  cho: { label: "Chờ", tone: "neutral", icon: "clock" },
  da_den: { label: "Đã đến", tone: "success", icon: "check" },
  vang: { label: "Vắng", tone: "attention", icon: "xCircle" },
};

export function TodayAppointments({ appointments }: { appointments: Appointment[] }) {
  const counts = appointments.reduce<Record<AppointmentStatus, number>>(
    (acc, a) => ({ ...acc, [a.status]: acc[a.status] + 1 }),
    { cho: 0, da_den: 0, vang: 0 },
  );

  return (
    <SectionCard
      id="lich-hen"
      title="Lịch hẹn hôm nay"
      description={`${appointments.length} lịch hẹn · ${counts.da_den} đã đến · ${counts.cho} đang chờ · ${counts.vang} vắng`}
    >
      {appointments.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-muted">Hôm nay không có lịch hẹn.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Danh sách lịch hẹn hôm nay, sắp theo giờ</caption>
            <thead className="text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Giờ</th>
                <th scope="col" className="px-3 py-3 font-medium">Bệnh nhân</th>
                <th scope="col" className="px-3 py-3 font-medium">Lý do tái khám</th>
                <th scope="col" className="px-5 py-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {appointments.map((a) => {
                const s = statusDisplay[a.status];
                return (
                  <tr key={a.id} className="hover:bg-page">
                    <td className="px-5 py-3.5 font-semibold tabular-nums text-primary-strong">{a.time}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 font-medium">{a.patientName}</td>
                    <td className="min-w-48 px-3 py-3.5 text-ink-muted">{a.reason}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge {...s} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
