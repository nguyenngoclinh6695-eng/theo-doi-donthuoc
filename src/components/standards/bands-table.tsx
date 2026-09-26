import { StatusBadge, type Tone as BadgeTone } from "@/components/ui/status-badge";
import type { IconName } from "@/components/icons";
import { describeBand, toneLabels, type Band, type Tone } from "@/domain/standards";

export const toneBadge: Record<Tone, { tone: BadgeTone; icon: IconName }> = {
  normal: { tone: "success", icon: "check" },
  attention: { tone: "attention", icon: "alert" },
  alert: { tone: "danger", icon: "alert" },
};

/** Bảng các khoảng của một bộ ngưỡng: khoảng giá trị, nhãn (đúng văn bản nguồn), mức hiển thị. */
export function BandsTable({ bands, unit }: { bands: Band[]; unit: string }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs uppercase tracking-wide text-ink-muted">
        <tr>
          <th scope="col" className="px-5 py-2 font-medium">Khoảng giá trị</th>
          <th scope="col" className="px-3 py-2 font-medium">Nhãn theo văn bản</th>
          <th scope="col" className="px-5 py-2 font-medium">Mức hiển thị</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {bands.map((b, i) => (
          <tr key={i}>
            <td className="whitespace-nowrap px-5 py-2 tabular-nums">{describeBand(b, unit)}</td>
            <td className="px-3 py-2 font-medium">{b.label}</td>
            <td className="px-5 py-2">
              <StatusBadge {...toneBadge[b.tone]} label={toneLabels[b.tone]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
