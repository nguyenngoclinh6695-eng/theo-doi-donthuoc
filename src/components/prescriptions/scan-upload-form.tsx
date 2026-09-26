"use client";

import { useActionState, useRef } from "react";
import type { RxState } from "@/app/actions/prescriptions";
import { Icon } from "@/components/icons";
import { secondaryButtonClass } from "@/components/ui/form-field";

/** Chọn file bản scan đơn đã ký rồi tải lên. Kiểm tra dung lượng ngay trên trình duyệt để báo sớm; máy chủ kiểm tra lại đầy đủ. */
export function ScanUploadForm({
  action,
  id,
  replacing,
}: {
  action: (state: RxState, fd: FormData) => Promise<RxState>;
  id: string;
  replacing?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const f = inputRef.current?.files?.[0];
        if (f && f.size > 10 * 1024 * 1024) {
          e.preventDefault();
          alert("File quá lớn (tối đa 10 MB).");
        }
      }}
      className="space-y-1.5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`scan-${id}`} className="sr-only">
          Chọn file bản scan
        </label>
        <input
          ref={inputRef}
          id={`scan-${id}`}
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          required
          className="max-w-56 text-xs file:mr-2 file:rounded-md file:border file:border-line file:bg-surface file:px-2 file:py-1 file:text-xs file:text-primary-ink"
        />
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          <Icon name="upload" className="size-4" />
          {pending ? "Đang tải…" : replacing ? "Thay bản scan" : "Tải bản scan"}
        </button>
      </div>
      <p aria-live="polite" className="text-xs">
        {state.error && <span className="text-danger-ink">{state.error}</span>}
        {state.ok && <span className="text-success-ink">{state.ok}</span>}
        {!state.error && !state.ok && <span className="text-ink-muted">PDF, JPG hoặc PNG – tối đa 10 MB.</span>}
      </p>
    </form>
  );
}
