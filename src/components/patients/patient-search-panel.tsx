"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { PatientTable } from "@/components/patients/patient-table";
import { usePatientSearch } from "@/components/patients/use-patient-search";
import { PATIENT_SEARCH_LIMIT } from "@/domain/patient";

/** Ô tìm trên trang Bệnh nhân: khi có từ khoá thì thay danh sách phân trang bằng kết quả tìm. */
export function PatientSearchPanel({ todayKey, children }: { todayKey: string; children: ReactNode }) {
  const [query, setQuery] = useState("");
  const { active, results, error } = usePatientSearch(query);

  return (
    <div>
      <div className="border-b border-line px-5 py-4">
        <label htmlFor="patient-list-search" className="block text-sm font-medium">
          Tìm bệnh nhân
        </label>
        <div className="relative mt-1.5 max-w-lg">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="patient-list-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Họ tên (gõ không dấu cũng được), mã BN, SĐT hoặc CCCD"
            autoComplete="off"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm focus:border-primary"
          />
        </div>
      </div>

      <div aria-live="polite">
        {!active ? (
          children
        ) : error ? (
          <p className="px-5 py-8 text-center text-sm text-danger-ink">Không tìm được – thử lại hoặc tải lại trang.</p>
        ) : results === null ? (
          <p className="px-5 py-8 text-center text-sm text-ink-muted">Đang tìm…</p>
        ) : results.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-muted">Không tìm thấy bệnh nhân phù hợp với “{query.trim()}”.</p>
        ) : (
          <>
            <p className="px-5 pt-4 text-sm text-ink-muted">
              {results.length} kết quả{results.length >= PATIENT_SEARCH_LIMIT ? ` (chỉ hiện ${PATIENT_SEARCH_LIMIT} kết quả đầu – hãy gõ cụ thể hơn)` : ""}
            </p>
            <PatientTable items={results} todayKey={todayKey} caption="Kết quả tìm bệnh nhân" />
          </>
        )}
      </div>
    </div>
  );
}
