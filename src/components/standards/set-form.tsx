"use client";

import Link from "next/link";
import { startTransition, useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/app/actions/standards";
import { Icon } from "@/components/icons";
import { FormField, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";
import { parseDecimal, toneLabels, validateBands, type BandDraft, type SexScope, type Tone } from "@/domain/standards";

export interface SetFormInitial {
  measurementTypeId: string;
  sourceId: string;
  version: string;
  sourceSection: string;
  effectiveFrom: string;
  sexScope: SexScope | "";
  ageMinYears: string;
  ageMaxYears: string;
  note: string;
  bands: BandDraft[];
}

const emptyBand = (): BandDraft => ({ label: "", lower: "", lowerInclusive: true, upper: "", upperInclusive: false, tone: "normal" });

export function SetForm({
  action,
  initial,
  types,
  sources,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial: SetFormInitial;
  types: { id: string; name: string; unit: string }[];
  sources: { id: string; title: string }[];
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [bands, setBands] = useState<BandDraft[]>(initial.bands.length ? initial.bands : [emptyBand()]);
  const [typeId, setTypeId] = useState(initial.measurementTypeId);
  const unit = types.find((t) => t.id === typeId)?.unit ?? "";

  // Kiểm tra ngay khi nhập bằng đúng hàm mà máy chủ dùng, để thấy chồng khoảng trước khi bấm lưu.
  const liveErrors = useMemo(
    () =>
      validateBands(
        bands.map((b) => ({ ...b, lower: parseDecimal(b.lower), upper: parseDecimal(b.upper) })),
      ),
    [bands],
  );

  const update = (i: number, patch: Partial<BandDraft>) => setBands((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const move = (i: number, d: -1 | 1) =>
    setBands((bs) => {
      const next = [...bs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  return (
    <form
      className="space-y-6"
      // Gửi thủ công thay vì action={...}: React tự xoá trắng form sau mỗi lần gửi bằng action,
      // làm mất phiên bản/nguồn đã nhập khi máy chủ báo lỗi. Cách này giữ nguyên mọi ô.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      {(state.error || state.errors?.length) && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-ink">
          <p className="font-medium">Chưa lưu được:</p>
          <ul className="mt-1 list-disc pl-5">
            {state.error && <li>{state.error}</li>}
            {state.errors?.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-primary-strong">Căn cứ</legend>
        <FormField id="measurementTypeId" label="Loại chỉ số">
          <select id="measurementTypeId" name="measurementTypeId" value={typeId} onChange={(e) => setTypeId(e.target.value)} required className={inputClass}>
            <option value="">— Chọn —</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.unit})
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="sourceId" label="Văn bản nguồn" hint="Chưa có văn bản? Thêm ở mục Văn bản nguồn trước.">
          <select id="sourceId" name="sourceId" defaultValue={initial.sourceId} required aria-describedby="sourceId-hint" className={inputClass}>
            <option value="">— Chọn —</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="version" name="version" label="Phiên bản" hint="Vd. số hiệu văn bản + năm" defaultValue={initial.version} required maxLength={50} />
        <FormField id="sourceSection" name="sourceSection" label="Mục / bảng / trang trong văn bản" optional defaultValue={initial.sourceSection} maxLength={200} />
        <FormField id="effectiveFrom" name="effectiveFrom" type="date" label="Áp dụng từ ngày" defaultValue={initial.effectiveFrom} required />
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-3">
        <legend className="mb-1 text-sm font-semibold text-primary-strong">Phạm vi áp dụng</legend>
        <p className="text-xs text-ink-muted sm:col-span-3">Để trống nếu văn bản áp dụng cho mọi đối tượng. Tuổi tính theo năm; “đến” là không gồm (vd. 18 = dưới 18 tuổi).</p>
        <FormField id="sexScope" label="Giới">
          <select id="sexScope" name="sexScope" defaultValue={initial.sexScope} className={inputClass}>
            <option value="">Mọi giới</option>
            <option value="nam">Nam</option>
            <option value="nu">Nữ</option>
            <option value="khac">Khác</option>
          </select>
        </FormField>
        <FormField id="ageMinYears" name="ageMinYears" label="Tuổi từ" optional inputMode="numeric" defaultValue={initial.ageMinYears} />
        <FormField id="ageMaxYears" name="ageMaxYears" label="Đến dưới" optional inputMode="numeric" defaultValue={initial.ageMaxYears} />
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-primary-strong">Các khoảng giá trị {unit && <span className="font-normal text-ink-muted">({unit})</span>}</legend>
        <p className="mb-3 text-xs text-ink-muted">Nhập đúng số và nhãn như văn bản nguồn. Để trống cận dưới/trên nghĩa là không giới hạn phía đó.</p>
        <input type="hidden" name="bands" value={JSON.stringify(bands)} />
        <ol className="space-y-3">
          {bands.map((b, i) => (
            <li key={i} className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Khoảng {i + 1}</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-2 py-1 text-xs text-primary-ink hover:bg-accent disabled:opacity-40" aria-label={`Đưa khoảng ${i + 1} lên`}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === bands.length - 1} className="rounded px-2 py-1 text-xs text-primary-ink hover:bg-accent disabled:opacity-40" aria-label={`Đưa khoảng ${i + 1} xuống`}>
                    ↓
                  </button>
                  <button type="button" onClick={() => setBands((bs) => bs.filter((_, j) => j !== i))} disabled={bands.length === 1} className="rounded px-2 py-1 text-xs text-danger-ink hover:bg-danger-soft disabled:opacity-40">
                    Xoá
                  </button>
                </div>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_10rem]">
                <div>
                  <label className="block text-xs font-medium" htmlFor={`b${i}-lower`}>Cận dưới</label>
                  <input id={`b${i}-lower`} inputMode="decimal" value={b.lower} onChange={(e) => update(i, { lower: e.target.value })} className={inputClass} />
                  <label className="mt-1 flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={b.lowerInclusive} onChange={(e) => update(i, { lowerInclusive: e.target.checked })} />
                    Gồm cận dưới (≥)
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium" htmlFor={`b${i}-upper`}>Cận trên</label>
                  <input id={`b${i}-upper`} inputMode="decimal" value={b.upper} onChange={(e) => update(i, { upper: e.target.value })} className={inputClass} />
                  <label className="mt-1 flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={b.upperInclusive} onChange={(e) => update(i, { upperInclusive: e.target.checked })} />
                    Gồm cận trên (≤)
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium" htmlFor={`b${i}-label`}>Nhãn theo văn bản</label>
                  <input id={`b${i}-label`} value={b.label} maxLength={200} onChange={(e) => update(i, { label: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium" htmlFor={`b${i}-tone`}>Mức hiển thị</label>
                  <select id={`b${i}-tone`} value={b.tone} onChange={(e) => update(i, { tone: e.target.value as Tone })} className={inputClass}>
                    {(Object.keys(toneLabels) as Tone[]).map((t) => (
                      <option key={t} value={t}>
                        {toneLabels[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setBands((bs) => [...bs, emptyBand()])} className={`${secondaryButtonClass} mt-3`}>
          + Thêm khoảng
        </button>
        {liveErrors.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-attention-ink" aria-live="polite">
            {liveErrors.map((e) => (
              <li key={e} className="flex gap-1.5">
                <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <FormField id="note" name="note" label="Ghi chú" optional defaultValue={initial.note} maxLength={1000} />

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Đang lưu…" : "Lưu bản nháp"}
        </button>
        <Link href={cancelHref} className={secondaryButtonClass}>
          Huỷ
        </Link>
        <p className="text-xs text-ink-muted">Bản nháp chưa được dùng để phân loại cho tới khi một bác sĩ khác duyệt.</p>
      </div>
    </form>
  );
}
