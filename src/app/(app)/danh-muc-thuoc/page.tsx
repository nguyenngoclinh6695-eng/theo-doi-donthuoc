import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { drugControlLabels } from "@/domain/drug";
import { can } from "@/domain/permissions";
import { requirePermission } from "@/lib/auth/dal";
import { listDrugs } from "@/lib/drugs";

export const metadata: Metadata = { title: "Danh mục thuốc" };

export default async function DrugsPage(props: PageProps<"/danh-muc-thuoc">) {
  const user = await requirePermission("drugs.view");
  const sp = await props.searchParams;
  // Tên thuốc không phải thông tin bệnh nhân nên có thể để trên URL (tiện chia sẻ/đánh dấu).
  const query = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const showInactive = sp.ngung === "1";
  const canManage = can(user.role, "drugs.manage");
  const drugs = await listDrugs({ query, includeInactive: showInactive });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary-strong">Danh mục thuốc</h1>
          <p className="mt-1 text-ink-muted">Sắp theo tên hoạt chất A→Z. Danh mục chỉ để tra cứu và chọn khi kê, không gợi ý thuốc.</p>
        </div>
        {canManage && (
          <Link href="/danh-muc-thuoc/moi" className={primaryButtonClass}>
            <Icon name="pill" className="size-4" />
            Thêm thuốc
          </Link>
        )}
      </div>

      <section aria-label="Danh sách thuốc" className="rounded-xl border border-line bg-surface">
        <form role="search" className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-4">
          <div className="min-w-60 flex-1">
            <label htmlFor="drug-q" className="block text-sm font-medium">
              Tìm thuốc
            </label>
            <input
              id="drug-q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Tên hoạt chất hoặc tên thương mại"
              className="mt-1.5 w-full max-w-md rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-primary"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="ngung" value="1" defaultChecked={showInactive} className="size-4" />
            Hiện cả thuốc đã ngừng dùng
          </label>
          <button type="submit" className={secondaryButtonClass}>
            Tìm
          </button>
        </form>

        {drugs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-muted">{query ? "Không có thuốc phù hợp." : "Danh mục đang trống."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh mục thuốc</caption>
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Hoạt chất · hàm lượng</th>
                  <th scope="col" className="px-3 py-3 font-medium">Tên thương mại</th>
                  <th scope="col" className="px-3 py-3 font-medium">Dạng bào chế</th>
                  <th scope="col" className="px-3 py-3 font-medium">Đơn vị</th>
                  <th scope="col" className="px-3 py-3 font-medium">Trạng thái</th>
                  {canManage && <th scope="col" className="px-5 py-3"><span className="sr-only">Thao tác</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {drugs.map((d) => (
                  <tr key={d.id} className={d.isActive ? "" : "bg-page text-ink-muted"}>
                    <td className="px-5 py-3 font-medium">
                      {d.activeIngredient} <span className="font-normal">{d.strength}</span>
                    </td>
                    <td className="px-3 py-3">{d.brandName ?? "—"}</td>
                    <td className="px-3 py-3">{d.dosageForm}</td>
                    <td className="px-3 py-3">{d.unit}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {!d.isActive && <StatusBadge tone="neutral" icon="close" label="Ngừng dùng" />}
                        {d.control !== "thuong" && <StatusBadge tone="danger" icon="lock" label={drugControlLabels[d.control]} />}
                        {d.isActive && d.control === "thuong" && <span className="text-ink-muted">Đang dùng</span>}
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3 text-right">
                        <Link href={`/danh-muc-thuoc/${d.id}/sua`} className="font-medium text-primary-ink underline-offset-4 hover:underline">
                          Sửa
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
