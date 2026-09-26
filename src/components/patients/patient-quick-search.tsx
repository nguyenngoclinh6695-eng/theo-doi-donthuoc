"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { usePatientSearch } from "@/components/patients/use-patient-search";

/** Ô tìm nhanh trên thanh trên cùng: gõ tên/mã/SĐT, chọn kết quả để mở hồ sơ. */
export function PatientQuickSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { active, results, error } = usePatientSearch(query);
  const boxRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <div
      ref={boxRef}
      role="search"
      className="relative ml-auto w-full max-w-sm"
      // Đóng danh sách khi focus rời khỏi cả ô tìm lẫn các kết quả.
      onBlur={(e) => {
        if (!boxRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <label htmlFor="patient-search" className="sr-only">
        Tìm bệnh nhân
      </label>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          id="patient-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Tìm bệnh nhân theo tên, mã, SĐT…"
          autoComplete="off"
          aria-controls="patient-search-results"
          className="w-full rounded-lg border border-line bg-page py-2 pl-9 pr-3 text-sm placeholder:text-ink-muted focus:border-primary focus:bg-surface"
        />
      </div>

      {open && active && (
        <div
          id="patient-search-results"
          aria-live="polite"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-sm"
        >
          {error ? (
            <p className="px-3 py-2 text-sm text-danger-ink">Không tìm được – thử lại.</p>
          ) : results === null ? (
            <p className="px-3 py-2 text-sm text-ink-muted">Đang tìm…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink-muted">Không có bệnh nhân phù hợp.</p>
          ) : (
            <ul>
              {results.map((p) => (
                <li key={p.id}>
                  <Link href={`/benh-nhan/${p.id}`} onClick={close} className="block px-3 py-2 hover:bg-accent focus-visible:bg-accent">
                    <span className="block text-sm font-medium">{p.fullName}</span>
                    <span className="block text-xs tabular-nums text-ink-muted">
                      {p.code}
                      {p.phone && ` · ${p.phone}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
