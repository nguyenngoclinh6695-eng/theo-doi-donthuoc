"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icons";

/** Nút gửi của form ghi lượt gọi; tách riêng để hiện trạng thái "Đang lưu…" trong lúc chờ máy chủ. */
export function ReminderCallButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-primary-ink transition-colors hover:border-primary hover:bg-accent disabled:cursor-wait disabled:opacity-60"
    >
      <Icon name="phone" className="size-4" />
      {pending ? "Đang lưu…" : "Đánh dấu đã gọi"}
    </button>
  );
}
