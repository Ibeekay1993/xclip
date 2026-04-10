import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { LucideIcon } from "lucide-react";

type Status = "idle" | "processing" | "complete" | "error";

interface WorkflowStepProps {
  icon: LucideIcon;
  title: string;
  description: string;
  status: Status;
  isLast?: boolean;
}

export function WorkflowStep({
  icon: Icon,
  title,
  description,
  status,
  isLast = false,
}: WorkflowStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-10 h-10 rounded-sm flex items-center justify-center transition-all duration-500 border",
            status === "idle" && "bg-muted border-border text-muted-foreground",
            status === "processing" && "bg-primary/10 border-primary/50 text-primary animate-pulse-glow",
            status === "complete" && "bg-primary border-primary text-primary-foreground",
            status === "error" && "bg-destructive/10 border-destructive/50 text-destructive"
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-px h-12 mt-1 transition-all duration-500",
              status === "complete" ? "bg-primary" : "bg-border"
            )}
          />
        )}
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h3>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
