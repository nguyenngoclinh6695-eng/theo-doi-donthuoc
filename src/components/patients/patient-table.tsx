import Link from "next/link";
import { ageOn, formatAge, type Sex } from "@/domain/patient";
import { formatDate } from "@/lib/format";
import type { PatientListItem } from "@/lib/patients";

export const sexLabels: Record<Sex, string> = { nam: "Nam", nu: "Nữ", khac: "Khác" };

/** Bảng danh sách bệnh nhân; dùng chung cho danh sách phân trang (server) và kết quả tìm kiếm (client). */
export function PatientTable({ items, todayKey, caption }: { items: PatientListItem[]; todayKey: string; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium">Bệnh nhân</th>
            <th scope="col" className="px-3 py-3 font-medium">Mã</th>
            <th scope="col" className="px-3 py-3 font-medium">Tuổi · Giới</th>
            <th scope="col" className="px-3 py-3 font-medium">Điện thoại</th>
            <th scope="col" className="px-5 py-3 font-medium">Khám gần nhất</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-page">
              <td className="min-w-48 px-5 py-3">
                <Link href={`/benh-nhan/${p.id}`} className="font-medium text-primary-ink underline-offset-4 hover:underline">
                  {p.fullName}
                </Link>
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums text-ink-muted">{p.code}</td>
              <td className="whitespace-nowrap px-3 py-3">
                {p.dateOfBirth ? formatAge(ageOn(p.dateOfBirth, todayKey)) : "—"}
                {p.sex && ` · ${sexLabels[p.sex]}`}
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">{p.phone ?? "—"}</td>
              <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{p.lastVisitAt ? formatDate(p.lastVisitAt) : "Chưa khám"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
