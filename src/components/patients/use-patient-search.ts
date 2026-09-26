"use client";

import { useEffect, useRef, useState } from "react";
import { searchPatientsAction } from "@/app/actions/patients";
import type { PatientListItem } from "@/lib/patients";

/**
 * Tìm bệnh nhân khi gõ: chờ 300 ms sau phím cuối mới gửi.
 * Kết quả được gắn với đúng từ khoá đã gửi – chỉ hiển thị khi khớp từ khoá hiện tại,
 * nên không bao giờ hiện nhầm kết quả của lượt gõ trước.
 */
export function usePatientSearch(query: string) {
  const [response, setResponse] = useState<{ query: string; items: PatientListItem[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const latest = useRef(0);
  const trimmed = query.trim();
  const active = trimmed.length >= 2;

  useEffect(() => {
    if (!active) return;
    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      searchPatientsAction(trimmed)
        .then((items) => {
          if (ticket === latest.current) setResponse({ query: trimmed, items });
        })
        .catch(() => {
          if (ticket === latest.current) setFailed(trimmed);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [trimmed, active]);

  const results = active && response?.query === trimmed ? response.items : null;
  return { active, results, error: active && failed === trimmed };
}
