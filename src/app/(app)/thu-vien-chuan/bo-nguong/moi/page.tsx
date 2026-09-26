import type { Metadata } from "next";
import { saveDraftSet } from "@/app/actions/standards";
import { SetForm } from "@/components/standards/set-form";
import { requirePermission } from "@/lib/auth/dal";
import { listMeasurementTypes, listSources } from "@/lib/standards";
import { clinicPeriods } from "@/lib/time";

export const metadata: Metadata = { title: "Soạn bộ ngưỡng" };

export default async function NewSetPage(props: PageProps<"/thu-vien-chuan/bo-nguong/moi">) {
  await requirePermission("standards.manage");
  const { chiSo } = await props.searchParams;
  const [types, sources] = await Promise.all([listMeasurementTypes(), listSources()]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary-strong">Soạn bộ ngưỡng mới</h1>
        <p className="mt-1 text-ink-muted">Nhập đúng theo văn bản nguồn. Sau khi lưu, cần một bác sĩ khác duyệt thì bộ ngưỡng mới có hiệu lực.</p>
      </div>
      <div className="rounded-xl border border-line bg-surface p-6">
        <SetForm
          action={saveDraftSet.bind(null, null)}
          types={types.filter((t) => t.isActive)}
          sources={sources.map((s) => ({ id: s.id, title: s.title }))}
          cancelHref="/thu-vien-chuan"
          initial={{
            measurementTypeId: typeof chiSo === "string" && types.some((t) => t.id === chiSo) ? chiSo : "",
            sourceId: "",
            version: "",
            sourceSection: "",
            effectiveFrom: clinicPeriods().todayKey,
            sexScope: "",
            ageMinYears: "",
            ageMaxYears: "",
            note: "",
            bands: [],
          }}
        />
      </div>
    </div>
  );
}
