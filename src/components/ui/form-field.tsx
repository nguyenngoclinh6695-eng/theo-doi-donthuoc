import type { InputHTMLAttributes } from "react";

/** Ô nhập có nhãn luôn hiển thị phía trên (không dùng placeholder thay nhãn, để dễ đọc và dễ dùng với trình đọc màn hình). */
export function FormField({
  label,
  hint,
  id,
  ...input
}: { label: string; hint?: string; id: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-primary"
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-muted">
          {hint}
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
