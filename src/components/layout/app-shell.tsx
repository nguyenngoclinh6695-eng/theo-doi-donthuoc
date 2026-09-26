"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { SidebarNav } from "@/components/layout/sidebar-nav";

/**
 * Khung trang: thanh điều hướng trái cố định trên màn hình lớn,
 * thu thành ngăn kéo mở bằng nút "Menu" trên màn hình nhỏ.
 * Thanh trên cùng được truyền vào từ server component để lấy dữ liệu (ngày, người dùng) phía server.
 */
export function AppShell({ clinicName, topBar, children }: { clinicName: string; topBar: ReactNode; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const brand = (
    <div className="px-3 pb-6 pt-1">
      <p className="text-xs uppercase tracking-wider text-white/70">Nội bộ</p>
      <p className="mt-1 font-semibold leading-snug text-white">{clinicName}</p>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Thanh điều hướng – màn hình lớn */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto bg-primary-strong px-3 py-5 lg:block">
        {brand}
        <SidebarNav />
      </aside>

      {/* Ngăn kéo điều hướng – màn hình nhỏ */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Đóng menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[85vw] overflow-y-auto bg-primary-strong px-3 py-5">
            <div className="flex items-start justify-between">
              {brand}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-white hover:bg-white/10 focus-visible:outline-white"
                aria-label="Đóng menu"
              >
                <Icon name="close" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="-ml-2 flex items-center gap-1.5 rounded-lg p-2 text-sm font-medium text-primary-strong hover:bg-accent lg:hidden"
          aria-expanded={menuOpen}
        >
          <Icon name="menu" />
          Menu
        </button>
        <div className="min-w-0 flex-1">{topBar}</div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
