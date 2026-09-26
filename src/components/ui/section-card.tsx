import type { ReactNode } from "react";

/** Khung một khối nội dung: tiêu đề, dòng mô tả "khối này đo/hiển thị gì", và phần thân. */
export function SectionCard({
  id,
  title,
  description,
  action,
  children,
  className = "",
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className={`rounded-xl border border-line bg-surface ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 id={headingId} className="font-semibold text-primary-strong">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
