import { cn } from "@/lib/utils"

export type StatusTone = "neutral" | "muted" | "pending" | "info" | "success" | "warning" | "danger"

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-secondary text-secondary-foreground ring-border",
  muted: "bg-muted text-muted-foreground ring-border",
  pending: "bg-warning-surface text-warning-foreground ring-warning/25",
  info: "bg-brand-50 text-brand-700 ring-brand-500/30",
  success: "bg-brand-100 text-brand-900 ring-brand-600/30",
  warning: "bg-warning-surface text-warning-foreground ring-warning/40",
  danger: "bg-danger-surface text-destructive ring-destructive/30",
}

const DOT_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground",
  muted: "bg-muted-foreground/60",
  pending: "bg-warning",
  info: "bg-brand-600",
  success: "bg-brand-700",
  warning: "bg-warning",
  danger: "bg-destructive",
}

interface StatusBadgeProps {
  tone: StatusTone
  children: React.ReactNode
  className?: string
}

/** Badge de statut : la couleur n'est jamais le seul porteur d'information (libellé toujours présent). */
export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT_CLASSES[tone])} />
      {children}
    </span>
  )
}
