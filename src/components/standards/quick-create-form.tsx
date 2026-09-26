"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionState } from "@/app/actions/standards";
import { primaryButtonClass } from "@/components/ui/form-field";

/**
 * Form thêm nhanh (văn bản nguồn, loại chỉ số). Gửi thủ công để khi máy chủ báo lỗi, dữ liệu đã nhập vẫn còn;
 * chỉ xoá trắng form khi lưu thành công.
 */
export function QuickCreateForm({
  action,
  submitLabel,
  children,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      {children}
      {state.errors?.length ? (
        <ul role="alert" className="list-disc rounded-lg border border-danger/30 bg-danger-soft py-2 pl-8 pr-3 text-sm text-danger-ink">
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      {state.ok && (
        <p role="status" className="text-sm text-success-ink">
          {state.ok}
        </p>
      )}
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Đang lưu…" : submitLabel}
      </button>
    </form>
  );
}
