import { AwaitingScan } from "@/components/dashboard/awaiting-scan";
import { OperationsSummary } from "@/components/dashboard/operations-summary";
import { OverdueFollowUps } from "@/components/dashboard/overdue-follow-ups";
import { TodayAppointments } from "@/components/dashboard/today-appointments";
import { Icon } from "@/components/icons";
import {
  getCurrentUser,
  getMonthlySummary,
  getOverdueFollowUps,
  getPrescriptionsAwaitingScan,
  getTodayAppointments,
} from "@/lib/data";

export default async function DashboardPage() {
  const [user, appointments, overdue, awaitingScan, summary] = await Promise.all([
    getCurrentUser(),
    getTodayAppointments(),
    getOverdueFollowUps(),
    getPrescriptionsAwaitingScan(),
    getMonthlySummary(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary-strong">Tổng quan</h1>
          <p className="mt-1 text-ink-muted">Chào {user.fullName}, đây là những việc cần làm hôm nay.</p>
        </div>
        {/* Nhắc rõ đang xem dữ liệu giả, tránh nhầm với dữ liệu bệnh nhân thật. */}
        <p className="inline-flex items-center gap-1.5 rounded-full border border-attention/40 bg-attention-soft px-3 py-1 text-xs font-medium text-attention-ink">
          <Icon name="alert" className="size-3.5" />
          Đang hiển thị dữ liệu mẫu
        </p>
      </div>

      {/* Bố cục lệch: cột chính cho việc cần xử lý, cột phụ cho tóm tắt và việc giấy tờ. */}
      {/* minmax(0,1fr) để bảng rộng tự cuộn ngang bên trong khung thay vì đẩy cả trang tràn ra trên điện thoại. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <TodayAppointments appointments={appointments} />
          <OverdueFollowUps items={overdue} />
        </div>
        <div className="space-y-6">
          <OperationsSummary summary={summary} />
          <AwaitingScan items={awaitingScan} />
        </div>
      </div>
    </div>
  );
}
