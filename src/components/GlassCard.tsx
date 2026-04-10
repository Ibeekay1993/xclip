import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  neon?: boolean;
}

export function GlassCard({ children, className, gradient = false, neon = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-sm p-6",
        neon && "neon-border",
        gradient && "border-primary/20",
        className
      )}
    >
      {children}
    </div>
  );
}
