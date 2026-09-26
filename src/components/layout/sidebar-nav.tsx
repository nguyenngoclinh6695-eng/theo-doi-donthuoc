"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { hrefOf, type NavLink } from "@/lib/navigation";

export function SidebarNav({ items, onNavigate }: { items: NavLink[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính">
      <ul className="space-y-1">
        {items.map((item) => {
          const href = hrefOf(item);
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={item.slug || "home"}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                // Mục đang mở: nền sáng + thanh dọc bên trái, để không chỉ dựa vào màu.
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-white ${
                  active
                    ? "bg-accent font-semibold text-primary-strong before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-primary"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
