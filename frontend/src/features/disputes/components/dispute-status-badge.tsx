import { StatusBadge } from "@/components/data-display/status-badge"
import { DISPUTE_STATUS_PRESENTATION } from "../presentation"
import type { DisputeStatus } from "../types"

export function DisputeStatusBadge({ status, className }: { status: DisputeStatus; className?: string }) {
  const presentation = DISPUTE_STATUS_PRESENTATION[status]
  return (
    <StatusBadge tone={presentation.tone} className={className}>
      {presentation.label}
    </StatusBadge>
  )
}
