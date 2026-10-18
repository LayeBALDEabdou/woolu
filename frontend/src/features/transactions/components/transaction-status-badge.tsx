import { StatusBadge } from "@/components/data-display/status-badge"
import { STATUS_PRESENTATION, getStatusLabel } from "../domain/presentation"
import type { TransactionKind, TransactionStatus } from "../types"

export function TransactionStatusBadge({
  status,
  kind,
  className,
}: {
  status: TransactionStatus
  kind?: TransactionKind
  className?: string
}) {
  return (
    <StatusBadge tone={STATUS_PRESENTATION[status].tone} className={className}>
      {getStatusLabel(status, kind)}
    </StatusBadge>
  )
}
