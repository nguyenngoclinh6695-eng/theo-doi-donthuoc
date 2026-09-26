import type { MonthlySummary } from "@/domain/types";
import { onTimeRate } from "@/domain/stats";

export function OperationsSummary({ summary }: { summary: MonthlySummary }) {
  const rate = onTimeRate(summary);
  const [year, month] = summary.month.split("-");

  return (
    <section aria-labelledby="tom-tat-heading" className="rounded-xl bg-primary-strong p-5 text-white">
      <h2 id="tom-tat-heading" className="text-sm font-medium text-white/80">
        Tóm tắt vận hành
      </h2>

      <dl className="mt-4 space-y-5">
        <div>
          <dt className="text-sm text-white/80">Tỷ lệ đến đúng hẹn – tháng {Number(month)}/{year}</dt>
          <dd className="mt-1">
            <span className="text-3xl font-semibold tabular-nums">{rate === null ? "—" : `${rate}%`}</span>
            <span className="mt-1 block text-sm text-white/80">
              {summary.appointmentsKept}/{summary.appointmentsDue} lịch hẹn (từ đầu tháng đến hết hôm qua) có bệnh nhân đến đúng ngày
            </span>
            {rate !== null && (
              // Thanh tiến độ chỉ minh hoạ; con số và câu chữ bên trên mới là thông tin chính.
              <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
                <span className="block h-full rounded-full bg-white" style={{ width: `${rate}%` }} />
              </span>
            )}
          </dd>
        </div>

        <div className="border-t border-white/15 pt-4">
          <dt className="text-sm text-white/80">Lượt khám tuần này</dt>
          <dd className="mt-1">
            <span className="text-3xl font-semibold tabular-nums">{summary.visitsThisWeek}</span>
            <span className="mt-1 block text-sm text-white/80">Tính từ thứ Hai đến hôm nay, gồm cả khám mới và tái khám</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
