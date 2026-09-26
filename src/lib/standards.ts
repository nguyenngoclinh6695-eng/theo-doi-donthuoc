// Truy vấn Thư viện chuẩn. Chuyển dữ liệu DB (Decimal, enum) sang kiểu thuần của src/domain/standards.ts.

import type { Band, Scope, SexScope, StandardSetInput, Tone } from "@/domain/standards";
import type { BandTone, StandardSetStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { dateKeyOf, sexFromDb, sexToDb } from "@/lib/patients";

export const toneFromDb: Record<BandTone, Tone> = { NORMAL: "normal", ATTENTION: "attention", ALERT: "alert" };
export const toneToDb: Record<Tone, BandTone> = { normal: "NORMAL", attention: "ATTENTION", alert: "ALERT" };
export { sexToDb };

const num = (d: { toString(): string } | null): number | null => (d === null ? null : Number(d.toString()));

type BandRow = {
  label: string;
  lowerBound: { toString(): string } | null;
  lowerInclusive: boolean;
  upperBound: { toString(): string } | null;
  upperInclusive: boolean;
  tone: BandTone;
};
export const toBand = (b: BandRow): Band => ({
  label: b.label,
  lower: num(b.lowerBound),
  lowerInclusive: b.lowerInclusive,
  upper: num(b.upperBound),
  upperInclusive: b.upperInclusive,
  tone: toneFromDb[b.tone],
});

export interface MeasurementTypeItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  decimals: number;
  isActive: boolean;
}

export interface SetSummary extends Scope {
  id: string;
  version: string;
  status: StandardSetStatus;
  effectiveFrom: string;
  sourceTitle: string;
  sourceSection: string | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  bands: Band[];
}

export interface SetDetail extends SetSummary {
  measurementType: MeasurementTypeItem;
  sourceId: string;
  source: { title: string; documentNumber: string | null; issuer: string | null; issuedDate: string | null; url: string | null };
  note: string | null;
  createdById: string;
  createdAt: string;
  retiredAt: string | null;
}

const setInclude = {
  source: true,
  createdBy: { select: { fullName: true } },
  approvedBy: { select: { fullName: true } },
  bands: { orderBy: { sortOrder: "asc" as const } },
};

type SetRow = Awaited<ReturnType<typeof loadSet>>;
function loadSet(id: string) {
  return prisma.standardSet.findUnique({ where: { id }, include: { ...setInclude, measurementType: true } });
}

function toSummary(s: NonNullable<SetRow> | Omit<NonNullable<SetRow>, "measurementType">): SetSummary {
  return {
    id: s.id,
    version: s.version,
    status: s.status,
    effectiveFrom: dateKeyOf(s.effectiveFrom),
    sourceTitle: s.source.title,
    sourceSection: s.sourceSection,
    sexScope: s.sexScope ? sexFromDb[s.sexScope] : null,
    ageMinYears: s.ageMinYears,
    ageMaxYears: s.ageMaxYears,
    createdBy: s.createdBy.fullName,
    approvedBy: s.approvedBy?.fullName ?? null,
    approvedAt: s.approvedAt?.toISOString() ?? null,
    bands: s.bands.map(toBand),
  };
}

export async function listMeasurementTypesWithSets() {
  const types = await prisma.measurementType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { standardSets: { orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: setInclude } },
  });
  return types.map((t) => ({
    type: { id: t.id, code: t.code, name: t.name, unit: t.unit, decimals: t.decimals, isActive: t.isActive } satisfies MeasurementTypeItem,
    active: t.standardSets.filter((s) => s.status === "ACTIVE").map(toSummary),
    drafts: t.standardSets.filter((s) => s.status === "DRAFT").map(toSummary),
    retired: t.standardSets.filter((s) => s.status === "RETIRED").map(toSummary),
  }));
}

export async function listMeasurementTypes(): Promise<MeasurementTypeItem[]> {
  const rows = await prisma.measurementType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return rows.map((t) => ({ id: t.id, code: t.code, name: t.name, unit: t.unit, decimals: t.decimals, isActive: t.isActive }));
}

export async function listSources() {
  return prisma.standardSource.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { fullName: true } }, _count: { select: { sets: true } } },
  });
}

export async function getSetDetail(id: string): Promise<SetDetail | null> {
  const s = await loadSet(id);
  if (!s) return null;
  const t = s.measurementType;
  return {
    ...toSummary(s),
    measurementType: { id: t.id, code: t.code, name: t.name, unit: t.unit, decimals: t.decimals, isActive: t.isActive },
    sourceId: s.sourceId,
    source: {
      title: s.source.title,
      documentNumber: s.source.documentNumber,
      issuer: s.source.issuer,
      issuedDate: s.source.issuedDate ? dateKeyOf(s.source.issuedDate) : null,
      url: s.source.url,
    },
    note: s.note,
    createdById: s.createdById,
    createdAt: s.createdAt.toISOString(),
    retiredAt: s.retiredAt?.toISOString() ?? null,
  };
}

/** Các bộ ngưỡng ĐANG ÁP DỤNG theo từng loại chỉ số, ở dạng đưa thẳng vào classify(). */
export async function getActiveSetsByType(typeIds: string[]): Promise<Map<string, StandardSetInput[]>> {
  const sets = await prisma.standardSet.findMany({
    where: { measurementTypeId: { in: typeIds }, status: "ACTIVE" },
    include: { source: { select: { title: true } }, bands: { orderBy: { sortOrder: "asc" } } },
  });
  const map = new Map<string, StandardSetInput[]>(typeIds.map((id) => [id, []]));
  for (const s of sets) {
    map.get(s.measurementTypeId)?.push({
      id: s.id,
      version: s.version,
      sourceTitle: s.source.title,
      sourceSection: s.sourceSection,
      effectiveFrom: dateKeyOf(s.effectiveFrom),
      sexScope: s.sexScope ? (sexFromDb[s.sexScope] as SexScope) : null,
      ageMinYears: s.ageMinYears,
      ageMaxYears: s.ageMaxYears,
      bands: s.bands.map(toBand),
    });
  }
  return map;
}
