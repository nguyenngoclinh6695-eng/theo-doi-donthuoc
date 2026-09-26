import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { saveDraftSet } from "@/app/actions/standards";
import { SetForm } from "@/components/standards/set-form";
import { requirePermission } from "@/lib/auth/dal";
import { getSetDetail, listMeasurementTypes, listSources } from "@/lib/standards";

export const metadata: Metadata = { title: "Sửa bản nháp bộ ngưỡng" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditSetPage(props: PageProps<"/thu-vien-chuan/bo-nguong/[id]/sua">) {
  await requirePermission("standards.manage");
  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();
  const [set, types, sources] = await Promise.all([getSetDetail(id), listMeasurementTypes(), listSources()]);
  if (!set) notFound();
  // Bộ đã duyệt/ngừng là hồ sơ căn cứ, không cho sửa.
  if (set.status !== "DRAFT") redirect(`/thu-vien-chuan/bo-nguong/${id}`);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-primary-strong">Sửa bản nháp – {set.measurementType.name}</h1>
      <div className="rounded-xl border border-line bg-surface p-6">
        <SetForm
          action={saveDraftSet.bind(null, id)}
          types={types}
          sources={sources.map((s) => ({ id: s.id, title: s.title }))}
          cancelHref={`/thu-vien-chuan/bo-nguong/${id}`}
          initial={{
            measurementTypeId: set.measurementType.id,
            sourceId: set.sourceId,
            version: set.version,
            sourceSection: set.sourceSection ?? "",
            effectiveFrom: set.effectiveFrom,
            sexScope: set.sexScope ?? "",
            ageMinYears: set.ageMinYears?.toString() ?? "",
            ageMaxYears: set.ageMaxYears?.toString() ?? "",
            note: set.note ?? "",
            bands: set.bands.map((b) => ({
              label: b.label,
              lower: b.lower?.toString() ?? "",
              lowerInclusive: b.lowerInclusive,
              upper: b.upper?.toString() ?? "",
              upperInclusive: b.upperInclusive,
              tone: b.tone,
            })),
          }}
        />
      </div>
    </div>
  );
}
