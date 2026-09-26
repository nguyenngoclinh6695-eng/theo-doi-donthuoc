"use client";

import { Icon } from "@/components/icons";
import { secondaryButtonClass } from "@/components/ui/form-field";

// Trang lỗi chung của khu làm việc. Ở production Next.js ẩn nội dung lỗi phía máy chủ,
// nên chỉ hiện mã tham chiếu (digest) để đối chiếu với log, không lộ chi tiết kỹ thuật.
export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger-ink">
        <Icon name="alert" className="size-7" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-primary-strong">Không thực hiện được thao tác</h1>
      <p className="mt-2 text-ink-muted">{process.env.NODE_ENV === "development" ? error.message : "Đã có lỗi xảy ra. Thử lại, nếu vẫn lỗi hãy báo quản trị."}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-ink-muted">Mã lỗi: {error.digest}</p>}
      <button type="button" onClick={reset} className={`${secondaryButtonClass} mt-8`}>
        Thử lại
      </button>
    </div>
  );
}
