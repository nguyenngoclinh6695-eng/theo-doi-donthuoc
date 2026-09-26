import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setDrugActive, updateDrug } from "@/app/actions/drugs";
import { DrugForm } from "@/components/drugs/drug-form";
import { dangerButtonClass, secondaryButtonClass } from "@/components/ui/form-field";
import { requirePermission } from "@/lib/auth/dal";
import { getDrug } from "@/lib/drugs";

export const metadata: Metadata = { title: "Sửa thuốc" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditDrugPage(props: PageProps<"/danh-muc-thuoc/[id]/sua">) {
  await requirePermission("drugs.manage");
  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();
  const d = await getDrug(id);
  if (!d) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary-strong">Sửa thuốc</h1>
          <p className="mt-1 text-ink-muted">
            {d.activeIngredient} {d.strength} · {d.isActive ? "Đang dùng" : "Đã ngừng dùng"}
          </p>
        </div>
        {/* Ngừng dùng thay vì xoá: đơn thuốc cũ vẫn cần tra cứu được thuốc này. */}
        <form action={setDrugActive.bind(null, d.id, !d.isActive)}>
          <button type="submit" className={d.isActive ? dangerButtonClass : secondaryButtonClass}>
            {d.isActive ? "Ngừng dùng thuốc này" : "Cho dùng lại"}
          </button>
        </form>
      </div>
      <div className="rounded-xl border border-line bg-surface p-6">
        <DrugForm
          action={updateDrug.bind(null, d.id)}
          initial={{
            activeIngredient: d.activeIngredient,
            strength: d.strength,
            dosageForm: d.dosageForm,
            unit: d.unit,
            brandName: d.brandName ?? "",
            route: d.route ?? "",
            control: d.control,
            isCombination: d.isCombination ? "true" : "",
            note: d.note ?? "",
          }}
          submitLabel="Lưu thay đổi"
        />
      </div>
    </div>
  );
}
