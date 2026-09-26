import type { Metadata } from "next";
import { createMeasurementType } from "@/app/actions/standards";
import { LibraryHeader } from "@/components/standards/library-tabs";
import { QuickCreateForm } from "@/components/standards/quick-create-form";
import { FormField, inputClass } from "@/components/ui/form-field";
import { SectionCard } from "@/components/ui/section-card";
import { can } from "@/domain/permissions";
import { requirePermission } from "@/lib/auth/dal";
import { listMeasurementTypes } from "@/lib/standards";

export const metadata: Metadata = { title: "Loại chỉ số – Thư viện chuẩn" };

export default async function MeasurementTypesPage() {
  const user = await requirePermission("standards.view");
  const types = await listMeasurementTypes();

  return (
    <div className="space-y-6">
      <LibraryHeader current="/thu-vien-chuan/chi-so" />

      {can(user.role, "standards.manage") && (
        <SectionCard id="them-chi-so" title="Thêm loại chỉ số" description="Chỉ khai báo tên và đơn vị; ngưỡng được soạn riêng theo văn bản nguồn.">
          <div className="p-5">
            <QuickCreateForm action={createMeasurementType} submitLabel="Thêm chỉ số">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <FormField id="name" name="name" label="Tên chỉ số" required maxLength={100} />
                </div>
                <FormField id="unit" name="unit" label="Đơn vị" required maxLength={30} />
                <FormField id="decimals" label="Số lẻ thập phân">
                  <select id="decimals" name="decimals" defaultValue="0" className={inputClass}>
                    {[0, 1, 2, 3].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="sm:col-span-2">
                  <FormField id="code" name="code" label="Mã chỉ số" hint="Chữ in hoa không dấu, vd. DUONG_HUYET_DOI" required maxLength={40} />
                </div>
              </div>
            </QuickCreateForm>
          </div>
        </SectionCard>
      )}

      <SectionCard id="ds-chi-so" title="Các loại chỉ số" description={`${types.length} chỉ số`}>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="px-5 py-2 font-medium">Tên</th>
              <th scope="col" className="px-3 py-2 font-medium">Đơn vị</th>
              <th scope="col" className="px-3 py-2 font-medium">Mã</th>
              <th scope="col" className="px-5 py-2 font-medium">Số lẻ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {types.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2">{t.unit}</td>
                <td className="px-3 py-2 font-mono text-xs text-ink-muted">{t.code}</td>
                <td className="px-5 py-2 tabular-nums">{t.decimals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
