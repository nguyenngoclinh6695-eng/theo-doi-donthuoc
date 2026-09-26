"use client";

import { useActionState, type ReactNode } from "react";

export interface ResultState {
  error?: string;
  errors?: string[];
  warnings?: string[];
  ok?: string;
}

/**
 * Nút thực hiện một thao tác có thể bị từ chối (duyệt, chốt đơn, kết thúc lượt khám...)
 * và hiện kết quả ngay bên dưới: lỗi chặn, lưu ý, hoặc thông báo thành công.
 */
export function ResultButton({
  action,
  label,
  pendingLabel,
  className,
  confirmText,
  children,
}: {
  action: (state: ResultState, formData: FormData) => Promise<ResultState>;
  label: string;
  pendingLabel: string;
  className: string;
  confirmText?: string;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = [...(state.error ? [state.error] : []), ...(state.errors ?? [])];
  return (
    <div className="space-y-2">
      <form
        action={formAction}
        onSubmit={(e) => {
          // Thao tác quan trọng – hỏi lại cho chắc.
          if (confirmText && !window.confirm(confirmText)) e.preventDefault();
        }}
      >
        {children}
        <button type="submit" disabled={pending} className={className}>
          {pending ? pendingLabel : label}
        </button>
      </form>
      {errors.length > 0 && (
        <ul role="alert" className="max-w-xl list-disc space-y-0.5 rounded-lg border border-danger/30 bg-danger-soft py-2 pl-8 pr-3 text-sm text-danger-ink">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {state.warnings && state.warnings.length > 0 && (
        <ul className="max-w-xl list-disc rounded-lg border border-attention/40 bg-attention-soft py-2 pl-8 pr-3 text-sm text-attention-ink">
          {state.warnings.map((w) => (
            <li key={w}>Lưu ý: {w}</li>
          ))}
        </ul>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-success-ink">
          {state.ok}
        </p>
      )}
    </div>
  );
}
