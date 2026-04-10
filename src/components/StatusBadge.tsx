import { cn } from "@/lib/utils";
import { Loader2, Check, Clock, AlertCircle } from "lucide-react";

type Status = "idle" | "processing" | "complete" | "error";

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

const statusConfig = {
  idle: {
    icon: Clock,
    className: "bg-muted text-muted-foreground border-border",
    defaultLabel: "STANDBY",
  },
  processing: {
    icon: Loader2,
    className: "bg-primary/10 text-primary border-primary/30",
    defaultLabel: "ACTIVE",
  },
  complete: {
    icon: Check,
    className: "bg-primary/20 text-primary border-primary/40",
    defaultLabel: "DONE",
  },
  error: {
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
    defaultLabel: "ERROR",
  },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border mono",
        config.className
      )}
    >
      <Icon
        className={cn(
          "w-3 h-3",
          status === "processing" && "animate-spin"
        )}
      />
      {label || config.defaultLabel}
    </span>
  );
}
