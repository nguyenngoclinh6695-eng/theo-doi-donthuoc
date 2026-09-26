import Link from "next/link";
import type { OverdueFollowUp } from "@/domain/types";
import { recordReminderCall } from "@/app/actions/reminder-calls";
import { Icon } from "@/components/icons";
import { ReminderCallButton } from "@/components/dashboard/reminder-call-button";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatDateTime, maskPhone } from "@/lib/format";

export function OverdueFollowUps({ items }: { items: OverdueFollowUp[] }) {
  const remaining = items.filter((i) => !i.lastCalledAt).length;

  return (
    <SectionCard
      id="tre-hen"
      title="Bệnh nhân trễ hẹn cần gọi nhắc"
      description={`Đã lỡ hẹn tái khám, chưa quay lại và chưa có lịch mới · còn ${remaining}/${items.length} người chưa gọi`}
    >
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-muted">Không có bệnh nhân trễ hẹn.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
              {/* Số ngày trễ đặt đầu dòng để quét mắt nhanh ai cần gọi trước. */}
              <div className="w-16 shrink-0 text-center">
                <p className="text-xl font-semibold tabular-nums text-attention-ink">{item.daysOverdue}</p>
                <p className="text-xs text-ink-muted">ngày trễ</p>
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/benh-nhan/${item.patientId}`} className="font-medium underline-offset-4 hover:text-primary-ink hover:underline">
                  {item.patientName}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-ink-muted">
                  <span>Hẹn ngày {formatDate(item.missedDate)}</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Icon name="phone" className="size-3.5" />
                    <span className="sr-only">Số điện thoại (đã che bớt):</span>
                    {item.phone ? maskPhone(item.phone) : "Chưa có SĐT"}
                  </span>
                </p>
              </div>
              {item.lastCalledAt ? (
                <StatusBadge tone="success" icon="check" label={`Đã gọi ${formatDateTime(item.lastCalledAt)}`} />
              ) : (
                <form action={recordReminderCall.bind(null, item.appointmentId)}>
                  <ReminderCallButton />
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
