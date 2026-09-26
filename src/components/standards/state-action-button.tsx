"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/standards";

/** Nút thực hiện một thao tác có thể bị từ chối (duyệt, ngừng áp dụng) và hiện kết quả ngay bên dưới. */
export function StateActionButton({
  action,
  label,
  pendingLabel,
  className,
  confirmText,
}: {
  action: (state: ActionState) => Promise<ActionState>;
  label: string;
  pendingLabel: string;
  className: string;
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div className="space-y-2">
      <form
        action={formAction}
        onSubmit={(e) => {
          // Thao tác thay đổi căn cứ phân loại – hỏi lại cho chắc.
          if (confirmText && !window.confirm(confirmText)) e.preventDefault();
        }}
      >
        <button type="submit" disabled={pending} className={className}>
          {pending ? pendingLabel : label}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="max-w-md text-sm text-danger-ink">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="max-w-md text-sm text-success-ink">
          {state.ok}
        </p>
      )}
    </div>
  );
}
