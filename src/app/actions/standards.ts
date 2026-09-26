"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseSetForm, scopesEqual, scopesIntersect, describeScope, type Scope } from "@/domain/standards";
import { requirePermission } from "@/lib/auth/dal";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { sexFromDb, sexToDb } from "@/lib/patients";
import { toneToDb } from "@/lib/standards";

export interface ActionState {
  error?: string;
  errors?: string[];
  ok?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (fd: FormData, n: string, max = 300) => {
  const v = fd.get(n);
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
};

function revalidateLibrary() {
  revalidatePath("/thu-vien-chuan", "layout");
}

// ───────────── Văn bản nguồn ─────────────

export async function createSource(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requirePermission("standards.manage");
  const title = text(fd, "title", 300);
  const issuedDate = text(fd, "issuedDate", 10);
  const url = text(fd, "url", 500);
  const errors: string[] = [];
  if (title.length < 5) errors.push("Nhập tên văn bản (ít nhất 5 ký tự).");
  if (issuedDate && !/^\d{4}-\d{2}-\d{2}$/.test(issuedDate)) errors.push("Ngày ban hành không hợp lệ.");
  if (url && !/^https?:\/\//i.test(url)) errors.push("Đường dẫn phải bắt đầu bằng http:// hoặc https://.");
  if (errors.length) return { errors };

  const s = await prisma.standardSource.create({
    data: {
      title,
      documentNumber: text(fd, "documentNumber", 100) || null,
      issuer: text(fd, "issuer", 200) || null,
      issuedDate: issuedDate ? new Date(`${issuedDate}T00:00:00Z`) : null,
      url: url || null,
      note: text(fd, "note", 1000) || null,
      createdById: user.id,
    },
  });
  await writeAudit({ actorId: user.id, action: "standard.source.create", entityType: "StandardSource", entityId: s.id, details: { title } });
  revalidateLibrary();
  return { ok: `Đã thêm văn bản “${title}”.` };
}

// ───────────── Loại chỉ số ─────────────

export async function createMeasurementType(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requirePermission("standards.manage");
  const name = text(fd, "name", 100);
  const unit = text(fd, "unit", 30);
  const code = text(fd, "code", 40).toUpperCase();
  const decimals = Number(text(fd, "decimals", 1) || "0");
  const errors: string[] = [];
  if (name.length < 2) errors.push("Nhập tên chỉ số.");
  if (!unit) errors.push("Nhập đơn vị (vd. mmHg).");
  if (!/^[A-Z0-9_]{2,40}$/.test(code)) errors.push("Mã chỉ số gồm chữ in hoa không dấu, số, gạch dưới (vd. HA_TAM_THU).");
  if (![0, 1, 2, 3].includes(decimals)) errors.push("Số chữ số thập phân từ 0 đến 3.");
  if (!errors.length && (await prisma.measurementType.findUnique({ where: { code } }))) errors.push(`Mã ${code} đã tồn tại.`);
  if (errors.length) return { errors };

  const count = await prisma.measurementType.count();
  const t = await prisma.measurementType.create({ data: { name, unit, code, decimals, sortOrder: count + 1 } });
  await writeAudit({ actorId: user.id, action: "standard.type.create", entityType: "MeasurementType", entityId: t.id, details: { code, name, unit } });
  revalidateLibrary();
  return { ok: `Đã thêm chỉ số “${name}”.` };
}

// ───────────── Bộ ngưỡng ─────────────

/** Lưu bản nháp (tạo mới khi setId = null). Chỉ sửa được khi còn là bản nháp. */
export async function saveDraftSet(setId: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requirePermission("standards.manage");
  const { data, errors } = parseSetForm((n) => fd.get(n));
  if (!UUID_RE.test(data.measurementTypeId) || !UUID_RE.test(data.sourceId)) errors.push("Loại chỉ số hoặc văn bản nguồn không hợp lệ.");
  if (errors.length) return { errors };

  const [type, source] = await Promise.all([
    prisma.measurementType.findUnique({ where: { id: data.measurementTypeId } }),
    prisma.standardSource.findUnique({ where: { id: data.sourceId } }),
  ]);
  if (!type || !source) return { errors: ["Không tìm thấy loại chỉ số hoặc văn bản nguồn."] };

  const fields = {
    measurementTypeId: data.measurementTypeId,
    sourceId: data.sourceId,
    version: data.version,
    sourceSection: data.sourceSection,
    effectiveFrom: new Date(`${data.effectiveFrom}T00:00:00Z`),
    sexScope: data.sexScope ? sexToDb[data.sexScope] : null,
    ageMinYears: data.ageMinYears,
    ageMaxYears: data.ageMaxYears,
    note: data.note,
  };
  const bandRows = data.bands.map((b, i) => ({
    label: b.label,
    lowerBound: b.lower === null ? null : b.lower.toString(),
    lowerInclusive: b.lowerInclusive,
    upperBound: b.upper === null ? null : b.upper.toString(),
    upperInclusive: b.upperInclusive,
    tone: toneToDb[b.tone],
    sortOrder: i,
  }));

  let id = setId;
  if (setId === null) {
    const created = await prisma.standardSet.create({ data: { ...fields, createdById: user.id, bands: { create: bandRows } } });
    id = created.id;
    await writeAudit({ actorId: user.id, action: "standard.set.create", entityType: "StandardSet", entityId: id, details: { type: type.code, version: data.version } });
  } else {
    if (!UUID_RE.test(setId)) return { error: "Mã bộ ngưỡng không hợp lệ." };
    const existing = await prisma.standardSet.findUnique({ where: { id: setId } });
    if (!existing) return { error: "Không tìm thấy bộ ngưỡng." };
    if (existing.status !== "DRAFT") return { error: "Bộ ngưỡng đã duyệt không sửa được. Hãy tạo phiên bản mới." };
    await prisma.$transaction([
      prisma.standardBand.deleteMany({ where: { setId } }),
      prisma.standardSet.update({ where: { id: setId }, data: { ...fields, bands: { create: bandRows } } }),
    ]);
    await writeAudit({ actorId: user.id, action: "standard.set.update", entityType: "StandardSet", entityId: setId, details: { type: type.code, version: data.version } });
  }
  revalidateLibrary();
  redirect(`/thu-vien-chuan/bo-nguong/${id}`);
}

/**
 * Duyệt bản nháp để có hiệu lực. Nguyên tắc hai người: người duyệt phải là bác sĩ KHÁC người soạn.
 * Bộ đang áp dụng có CÙNG phạm vi sẽ tự chuyển sang "ngừng áp dụng" (phiên bản mới thay thế);
 * nếu phạm vi chỉ trùng một phần thì không duyệt, để tránh hai bộ cùng áp dụng cho một bệnh nhân.
 */
export async function approveSet(setId: string): Promise<ActionState> {
  const user = await requirePermission("standards.approve");
  if (!UUID_RE.test(setId)) return { error: "Mã bộ ngưỡng không hợp lệ." };
  const set = await prisma.standardSet.findUnique({ where: { id: setId }, include: { bands: true } });
  if (!set) return { error: "Không tìm thấy bộ ngưỡng." };
  if (set.status !== "DRAFT") return { error: "Chỉ duyệt được bản nháp." };
  if (set.createdById === user.id) return { error: "Không tự duyệt bộ ngưỡng do chính mình soạn – cần một bác sĩ khác duyệt." };
  if (set.bands.length === 0) return { error: "Bộ ngưỡng chưa có khoảng nào." };

  const scopeOf = (s: typeof set): Scope => ({
    sexScope: s.sexScope ? sexFromDb[s.sexScope] : null,
    ageMinYears: s.ageMinYears,
    ageMaxYears: s.ageMaxYears,
  });
  const actives = await prisma.standardSet.findMany({ where: { measurementTypeId: set.measurementTypeId, status: "ACTIVE" } });
  const replaced = actives.filter((a) => scopesEqual(scopeOf(a as typeof set), scopeOf(set)));
  const conflicting = actives.filter((a) => !replaced.includes(a) && scopesIntersect(scopeOf(a as typeof set), scopeOf(set)));
  if (conflicting.length) {
    return {
      error: `Phạm vi áp dụng trùng một phần với bộ đang dùng (${conflicting
        .map((c) => `phiên bản ${c.version}: ${describeScope(scopeOf(c as typeof set))}`)
        .join("; ")}). Hãy ngừng áp dụng bộ đó trước, hoặc sửa phạm vi cho không chồng nhau.`,
    };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.standardSet.updateMany({ where: { id: { in: replaced.map((r) => r.id) } }, data: { status: "RETIRED", retiredAt: now } }),
    prisma.standardSet.update({ where: { id: setId }, data: { status: "ACTIVE", approvedById: user.id, approvedAt: now } }),
  ]);
  await writeAudit({
    actorId: user.id,
    action: "standard.set.approve",
    entityType: "StandardSet",
    entityId: setId,
    details: { version: set.version, replaced: replaced.map((r) => r.id) },
  });
  revalidateLibrary();
  return { ok: replaced.length ? `Đã duyệt. ${replaced.length} phiên bản cũ cùng phạm vi đã chuyển sang ngừng áp dụng.` : "Đã duyệt – bộ ngưỡng bắt đầu được dùng để phân loại." };
}

export async function retireSet(setId: string): Promise<ActionState> {
  const user = await requirePermission("standards.approve");
  if (!UUID_RE.test(setId)) return { error: "Mã bộ ngưỡng không hợp lệ." };
  const set = await prisma.standardSet.findUnique({ where: { id: setId } });
  if (!set || set.status !== "ACTIVE") return { error: "Chỉ ngừng áp dụng được bộ đang áp dụng." };
  await prisma.standardSet.update({ where: { id: setId }, data: { status: "RETIRED", retiredAt: new Date() } });
  await writeAudit({ actorId: user.id, action: "standard.set.retire", entityType: "StandardSet", entityId: setId, details: { version: set.version } });
  revalidateLibrary();
  return { ok: "Đã ngừng áp dụng. Chỉ số này sẽ hiện “Chưa có căn cứ” cho tới khi có bộ mới được duyệt." };
}

/** Tạo bản nháp mới sao chép từ một bộ đã có (để cập nhật theo văn bản mới). */
export async function newVersionFrom(setId: string): Promise<void> {
  const user = await requirePermission("standards.manage");
  if (!UUID_RE.test(setId)) throw new Error("Mã bộ ngưỡng không hợp lệ.");
  const src = await prisma.standardSet.findUniqueOrThrow({ where: { id: setId }, include: { bands: true } });
  const copy = await prisma.standardSet.create({
    data: {
      measurementTypeId: src.measurementTypeId,
      sourceId: src.sourceId,
      version: `${src.version} (bản sửa)`,
      sourceSection: src.sourceSection,
      effectiveFrom: src.effectiveFrom,
      sexScope: src.sexScope,
      ageMinYears: src.ageMinYears,
      ageMaxYears: src.ageMaxYears,
      note: src.note,
      createdById: user.id,
      bands: {
        create: src.bands.map(({ label, lowerBound, lowerInclusive, upperBound, upperInclusive, tone, sortOrder }) => ({
          label,
          lowerBound,
          lowerInclusive,
          upperBound,
          upperInclusive,
          tone,
          sortOrder,
        })),
      },
    },
  });
  await writeAudit({ actorId: user.id, action: "standard.set.create", entityType: "StandardSet", entityId: copy.id, details: { copiedFrom: setId } });
  revalidateLibrary();
  redirect(`/thu-vien-chuan/bo-nguong/${copy.id}/sua`);
}

export async function deleteDraftSet(setId: string): Promise<void> {
  const user = await requirePermission("standards.manage");
  if (!UUID_RE.test(setId)) throw new Error("Mã bộ ngưỡng không hợp lệ.");
  const set = await prisma.standardSet.findUnique({ where: { id: setId } });
  if (!set || set.status !== "DRAFT") throw new Error("Chỉ xoá được bản nháp.");
  await prisma.standardSet.delete({ where: { id: setId } });
  await writeAudit({ actorId: user.id, action: "standard.set.delete", entityType: "StandardSet", entityId: setId, details: { version: set.version } });
  revalidateLibrary();
  redirect("/thu-vien-chuan");
}
