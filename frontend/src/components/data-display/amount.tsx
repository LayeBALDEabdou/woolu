import { formatMoney } from "@/lib/formatters/money"
import { cn } from "@/lib/utils"
import type { Money } from "@/types/common"

export function Amount({ value, className }: { value: Money; className?: string }) {
  return <span className={cn("tabular whitespace-nowrap", className)}>{formatMoney(value)}</span>
}
