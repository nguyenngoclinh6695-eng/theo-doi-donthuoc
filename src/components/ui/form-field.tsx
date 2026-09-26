import type { InputHTMLAttributes, ReactNode } from "react";

export const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-primary aria-[invalid=true]:border-danger";

/**
 * Ô nhập có nhãn luôn hiển thị phía trên (không dùng placeholder thay nhãn, để dễ đọc và dễ dùng với trình đọc màn hình).
 * Có thể truyền `children` để thay ô input bằng select/textarea mà vẫn giữ nhãn, gợi ý và thông báo lỗi.
 */
export function FormField({
  label,
  hint,
  error,
  id,
  optional,
  children,
  ...input
}: { label: string; hint?: string; error?: string; id: string; optional?: boolean; children?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-ink-muted"> (không bắt buộc)</span>}
      </label>
      {children ?? <input id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={inputClass} {...input} />}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger-ink">
      {message}
    </p>
  );
}

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary-ink px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong disabled:cursor-wait disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-primary-ink hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-danger/40 bg-surface px-3 py-1.5 text-sm font-medium text-danger-ink hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60";
