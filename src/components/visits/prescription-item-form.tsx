"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { searchDrugsForPrescribing, type RxState } from "@/app/actions/prescriptions";
import { Icon } from "@/components/icons";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";
import { drugControlLabels, drugDisplayName } from "@/domain/drug";
import type { DrugItem } from "@/lib/drugs";

/**
 * Thêm một dòng thuốc: bác sĩ gõ tìm và TỰ CHỌN thuốc trong danh mục (sắp A→Z, không gợi ý),
 * rồi ghi số lượng, cách dùng. Thuốc kiểm soát đặc biệt hiện ra nhưng không chọn được.
 */
export function PrescriptionItemForm({ action }: { action: (state: RxState, fd: FormData) => Promise<RxState> }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ q: string; items: DrugItem[] } | null>(null);
  const [selected, setSelected] = useState<DrugItem | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Thêm thành công thì dọn form để nhập dòng tiếp theo; lỗi thì giữ nguyên để sửa.
  const [state, formAction, pending] = useActionState(async (prev: RxState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result.ok) {
      setSelected(null);
      setQuery("");
      formRef.current?.reset();
    }
    return result;
  }, {});
  const latest = useRef(0);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2 || selected) return;
    const ticket = ++latest.current;
    const t = setTimeout(() => {
      searchDrugsForPrescribing(q).then((items) => {
        if (ticket === latest.current) setResults({ q, items });
      });
    }, 250);
    return () => clearTimeout(t);
  }, [q, selected]);

  const shown = results && results.q === q ? results.items : null;

  return (
    <form
      ref={formRef}
      className="space-y-3 rounded-lg border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <p className="text-sm font-semibold text-primary-strong">Thêm thuốc vào đơn</p>

      {selected ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2 text-sm">
          <span>
            <span className="font-medium">{drugDisplayName(selected)}</span> · {selected.dosageForm} · đơn vị: {selected.unit}
          </span>
          <button
            type="button"
            className="text-primary-ink underline-offset-4 hover:underline"
            onClick={() => {
              setSelected(null);
              setQuery("");
            }}
          >
            Chọn thuốc khác
          </button>
          <input type="hidden" name="drugId" value={selected.id} />
        </div>
      ) : (
        <div>
          <label htmlFor="rx-drug-search" className="block text-sm font-medium">
            Tìm thuốc trong danh mục
          </label>
          <input
            id="rx-drug-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gõ tên hoạt chất hoặc tên thương mại"
            autoComplete="off"
            className={inputClass}
          />
          {q.length >= 2 && (
            <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-line" aria-live="polite">
              {shown === null ? (
                <p className="px-3 py-2 text-sm text-ink-muted">Đang tìm…</p>
              ) : shown.length === 0 ? (
                <p className="px-3 py-2 text-sm text-ink-muted">Không có thuốc phù hợp trong danh mục.</p>
              ) : (
                <ul>
                  {shown.map((d) => {
                    const blocked = d.control !== "thuong";
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          disabled={blocked}
                          onClick={() => setSelected(d)}
                          className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent"
                        >
                          <span>
                            <span className="font-medium">{drugDisplayName(d)}</span> <span className="text-ink-muted">· {d.dosageForm}</span>
                          </span>
                          {blocked && (
                            <span className="inline-flex items-center gap-1 text-xs text-danger-ink">
                              <Icon name="lock" className="size-3.5" />
                              {drugControlLabels[d.control]} – cần mẫu đơn riêng
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cách dùng tách đủ các phần theo Điều 6 khoản 6 TT 26/2025; hệ thống không gợi ý liều. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="rx-qty" className="block text-sm font-medium">
            Số lượng{selected && <span className="font-normal text-ink-muted"> ({selected.unit})</span>}
          </label>
          <input id="rx-qty" name="quantity" inputMode="numeric" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="rx-route" className="block text-sm font-medium">
            Đường dùng
          </label>
          {/* key đổi theo thuốc để ô tự điền lại đường dùng khai báo trong danh mục (nếu có). */}
          <input key={selected?.id ?? "none"} id="rx-route" name="route" required maxLength={100} defaultValue={selected?.route ?? ""} placeholder="vd. Uống" className={inputClass} />
        </div>
        <div>
          <label htmlFor="rx-dose" className="block text-sm font-medium">
            Liều mỗi lần
          </label>
          <input id="rx-dose" name="dosePerTime" required maxLength={100} placeholder="vd. 1 viên" className={inputClass} />
        </div>
        <div>
          <label htmlFor="rx-times" className="block text-sm font-medium">
            Số lần/ngày
          </label>
          <input id="rx-times" name="timesPerDay" inputMode="numeric" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="rx-timing" className="block text-sm font-medium">
            Thời điểm dùng
          </label>
          <input id="rx-timing" name="timing" required maxLength={200} placeholder="vd. sau ăn sáng và tối" className={inputClass} />
        </div>
        <div>
          <label htmlFor="rx-days" className="block text-sm font-medium">
            Số ngày dùng
          </label>
          <input id="rx-days" name="durationDays" inputMode="numeric" required className={inputClass} />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="rx-note" className="block text-sm font-medium">
            Ghi chú thêm <span className="font-normal text-ink-muted">(không bắt buộc)</span>
          </label>
          <input id="rx-note" name="dosageInstruction" maxLength={500} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !selected} className={primaryButtonClass}>
          {pending ? "Đang thêm…" : "Thêm vào đơn"}
        </button>
        {!selected && <span className="text-xs text-ink-muted">Chọn thuốc trước.</span>}
        {selected && (
          <button type="button" className={secondaryButtonClass} onClick={() => setSelected(null)}>
            Bỏ chọn
          </button>
        )}
      </div>
      <div aria-live="polite">
        {state.error && <p className="text-sm text-danger-ink">{state.error}</p>}
        {state.errors?.map((e) => (
          <p key={e} className="text-sm text-danger-ink">
            {e}
          </p>
        ))}
        {state.ok && <p className="text-sm text-success-ink">{state.ok}</p>}
      </div>
    </form>
  );
}
