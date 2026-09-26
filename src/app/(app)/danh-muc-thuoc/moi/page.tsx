import type { Metadata } from "next";
import { createDrug } from "@/app/actions/drugs";
import { DrugForm } from "@/components/drugs/drug-form";
import { requirePermission } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Thêm thuốc" };

export default async function NewDrugPage() {
  await requirePermission("drugs.manage");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-primary-strong">Thêm thuốc vào danh mục</h1>
      <div className="rounded-xl border border-line bg-surface p-6">
        <DrugForm action={createDrug} initial={{ control: "thuong" }} submitLabel="Lưu thuốc" />
      </div>
    </div>
  );
}
