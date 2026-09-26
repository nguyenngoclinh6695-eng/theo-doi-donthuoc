"use client";

import { useState } from "react";
import type { OverdueFollowUp } from "@/domain/types";
import { Icon } from "@/components/icons";
import { SectionCard } from "@/components/ui/section-card";
import { formatDate, maskPhone } from "@/lib/format";

// Trạng thái "Đã gọi" hiện chỉ lưu tạm trên trình duyệt (mất khi tải lại trang).
// Bước có database sẽ ghi lại lượt gọi kèm người gọi và thời điểm vào nhật ký.
export function OverdueFollowUps({ items }: { items: OverdueFollowUp[] }) {
  const [called, setCalled] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setCalled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const remaining = items.filter((i) => !called.has(i.id)).length;

  return (
    <SectionCard
      id="tre-hen"
      title="Bệnh nhân trễ hẹn cần gọi nhắc"
      description={`Đã quá ngày hẹn tái khám mà chưa đến · còn ${remaining}/${items.length} người chưa gọi`}
    >
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-muted">Không có bệnh nhân trễ hẹn.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const isCalled = called.has(item.id);
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
                {/* Số ngày trễ đặt đầu dòng để quét mắt nhanh ai cần gọi trước. */}
                <div className="w-16 shrink-0 text-center">
                  <p className="text-xl font-semibold tabular-nums text-attention-ink">{item.daysOverdue}</p>
                  <p className="text-xs text-ink-muted">ngày trễ</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.patientName}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-ink-muted">
                    <span>Hẹn ngày {formatDate(item.missedDate)}</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Icon name="phone" className="size-3.5" />
                      <span className="sr-only">Số điện thoại (đã che bớt):</span>
                      {maskPhone(item.phone)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-pressed={isCalled}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isCalled
                      ? "border-success-soft bg-success-soft text-success-ink"
                      : "border-line bg-surface text-primary-ink hover:border-primary hover:bg-accent"
                  }`}
                >
                  <Icon name={isCalled ? "check" : "phone"} className="size-4" />
                  {isCalled ? "Đã gọi" : "Đánh dấu đã gọi"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
