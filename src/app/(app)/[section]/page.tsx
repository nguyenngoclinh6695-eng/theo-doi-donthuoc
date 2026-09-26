import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { requirePermission } from "@/lib/auth/dal";
import { navItems } from "@/lib/navigation";

// Tạm thời mọi mục chưa làm dùng chung một trang "Đang xây dựng".
// Khi làm mục nào, tạo thư mục riêng (vd. src/app/(app)/benh-nhan/) và đặt placeholder: false trong navigation.ts.
export const dynamicParams = false;

const placeholders = navItems.filter((i) => i.slug && i.placeholder);

export function generateStaticParams() {
  return placeholders.map((i) => ({ section: i.slug }));
}

export async function generateMetadata(props: PageProps<"/[section]">): Promise<Metadata> {
  const { section } = await props.params;
  const item = placeholders.find((i) => i.slug === section);
  return { title: item ? `${item.label} – Đang xây dựng` : undefined };
}

export default async function UnderConstructionPage(props: PageProps<"/[section]">) {
  const { section } = await props.params;
  const item = placeholders.find((i) => i.slug === section);
  if (!item) notFound();
  // Trang chưa có nội dung nhưng vẫn kiểm tra quyền, để khi thêm nội dung không bị quên.
  await requirePermission(item.permission);

  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent text-primary-strong">
        <Icon name={item.icon} className="size-7" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-primary-strong">{item.label}</h1>
      <p className="mt-2 text-ink-muted">{item.description}</p>
      <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm">
        <Icon name="tools" className="size-4 text-primary-ink" />
        Mục này đang được xây dựng
      </p>
      <div className="mt-8">
        <Link href="/" className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline">
          ← Về trang Tổng quan
        </Link>
      </div>
    </div>
  );
}
