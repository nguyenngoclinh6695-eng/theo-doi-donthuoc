"use client";

import { useState } from "react";
import { usePatientSearch } from "@/components/patients/use-patient-search";
import { inputClass } from "@/components/ui/form-field";

export interface PickedPatient {
  id: string;
  fullName: string;
  code: string;
}

/** Chọn bệnh nhân bằng cách gõ tìm (tên không dấu, mã, SĐT); giá trị gửi đi là mã hồ sơ trong ô ẩn "patientId". */
export function PatientPicker({ initial }: { initial: PickedPatient | null }) {
  const [picked, setPicked] = useState<PickedPatient | null>(initial);
  const [query, setQuery] = useState("");
  const { active, results } = usePatientSearch(picked ? "" : query);

  if (picked) {
    return (
      <div>
        <p className="block text-sm font-medium">Bệnh nhân</p>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2 text-sm">
          <span>
            <span className="font-medium">{picked.fullName}</span> · <span className="tabular-nums">{picked.code}</span>
          </span>
          <button type="button" onClick={() => setPicked(null)} className="text-primary-ink underline-offset-4 hover:underline">
            Chọn người khác
          </button>
        </div>
        <input type="hidden" name="patientId" value={picked.id} />
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="appt-patient" className="block text-sm font-medium">
        Bệnh nhân
      </label>
      <input
        id="appt-patient"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Gõ tên, mã BN hoặc SĐT"
        autoComplete="off"
        className={inputClass}
      />
      {active && (
        <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-line" aria-live="polite">
          {results === null ? (
            <p className="px-3 py-2 text-sm text-ink-muted">Đang tìm…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink-muted">Không tìm thấy – thêm hồ sơ ở trang Bệnh nhân trước.</p>
          ) : (
            <ul>
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPicked({ id: p.id, fullName: p.fullName, code: p.code })}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-medium">{p.fullName}</span>
                    <span className="block text-xs tabular-nums text-ink-muted">
                      {p.code}
                      {p.phone && ` · ${p.phone}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <input type="hidden" name="patientId" value="" />
    </div>
  );
}
