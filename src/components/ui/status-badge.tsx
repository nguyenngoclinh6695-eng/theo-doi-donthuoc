import { Icon, type IconName } from "@/components/icons";

export type Tone = "neutral" | "success" | "attention" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-accent text-primary-strong",
  success: "bg-success-soft text-success-ink",
  attention: "bg-attention-soft text-attention-ink",
  danger: "bg-danger-soft text-danger-ink",
};

/** Nhãn trạng thái: luôn có cả biểu tượng lẫn chữ, không truyền đạt chỉ bằng màu. */
export function StatusBadge({ tone, icon, label }: { tone: Tone; icon: IconName; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      <Icon name={icon} className="size-3.5" />
      {label}
    </span>
  );
}
