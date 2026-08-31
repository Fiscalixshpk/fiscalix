import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md";
}

const STATUS_MAP: Record<
  string,
  { label: string; labelSq: string; className: string }
> = {
  paid: {
    label: "Paid",
    labelSq: "Paguar",
    className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  pending: {
    label: "Pending",
    labelSq: "Në pritje",
    className: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  overdue: {
    label: "Overdue",
    labelSq: "Vonuar",
    className: "text-red-400 bg-red-400/10 border-red-400/20",
  },
  draft: {
    label: "Draft",
    labelSq: "Draft",
    className: "bg-zinc-400/10 border-zinc-400/20",
  },
  cancelled: {
    label: "Cancelled",
    labelSq: "Anuluar",
    className: "text-[var(--text-3)] bg-zinc-500/10 border-zinc-500/20",
  },
  active: {
    label: "Active",
    labelSq: "Aktiv",
    className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  expired: {
    label: "Expired",
    labelSq: "Skaduar",
    className: "text-red-400 bg-red-400/10 border-red-400/20",
  },
  trial: {
    label: "Trial",
    labelSq: "Provë",
    className: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  confirmed: {
    label: "Confirmed",
    labelSq: "Konfirmuar",
    className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  rejected: {
    label: "Rejected",
    labelSq: "Refuzuar",
    className: "text-red-400 bg-red-400/10 border-red-400/20",
  },
  processing: {
    label: "Processing",
    labelSq: "Duke procesuar",
    className: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  paused: {
    label: "Paused",
    labelSq: "Pezulluar",
    className: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  },
};

export function StatusBadge({ status, className, size = "sm" }: StatusBadgeProps) {
  const config = STATUS_MAP[status.toLowerCase()] || {
    label: status,
    labelSq: status,
    className: "bg-zinc-400/10 border-zinc-400/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium capitalize",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.className,
        className
      )}
    >
      <span
        className={cn(
          "mr-1.5 rounded-full",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          status === "paid" || status === "active" || status === "confirmed"
            ? "bg-emerald-400"
            : status === "pending" || status === "processing"
            ? "bg-amber-400"
            : status === "overdue" || status === "expired" || status === "rejected"
            ? "bg-red-400"
            : status === "trial"
            ? "bg-blue-400"
            : "bg-zinc-400"
        )}
      />
      {config.labelSq}
    </span>
  );
}

export default StatusBadge
