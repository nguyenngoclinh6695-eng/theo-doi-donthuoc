import Link from "next/link";

const tabs = [
  { href: "/thu-vien-chuan", label: "Bộ ngưỡng theo chỉ số" },
  { href: "/thu-vien-chuan/nguon", label: "Văn bản nguồn" },
  { href: "/thu-vien-chuan/chi-so", label: "Loại chỉ số" },
];

export function LibraryTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Mục trong Thư viện chuẩn" className="flex flex-wrap gap-1 border-b border-line">
      {tabs.map((t) => {
        const active = t.href === current;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${active ? "border-primary font-semibold text-primary-strong" : "border-transparent text-ink-muted hover:text-primary-ink"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LibraryHeader({ current }: { current: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary-strong">Thư viện chuẩn</h1>
        <p className="mt-1 max-w-3xl text-ink-muted">
          Nơi duy nhất chứa ngưỡng phân loại chỉ số. Mỗi bộ ngưỡng phải có văn bản nguồn, phiên bản và được một bác sĩ khác người soạn duyệt.
          Chỉ số nào chưa có bộ ngưỡng đang áp dụng sẽ hiện “Chưa có căn cứ trong phác đồ để phân loại”.
        </p>
      </div>
      <LibraryTabs current={current} />
    </div>
  );
}
