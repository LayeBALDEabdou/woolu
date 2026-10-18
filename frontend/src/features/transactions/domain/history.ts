import type { TransactionEvent, TransactionEventType, TransactionStatus } from "../types"

/** Statut atteint lors de chaque événement du parcours nominal. */
const EVENT_TO_STATUS: Partial<Record<TransactionEventType, TransactionStatus>> = {
  created: "created",
  sent_to_client: "pending_acceptance",
  terms_accepted: "pending_payment",
  payment_confirmed: "payment_confirmed",
  delivery_started: "in_progress",
  delivery_completed: "awaiting_confirmation",
  receipt_confirmed: "completed",
}

export function statusesReachedFromEvents(events: TransactionEvent[]): TransactionStatus[] {
  return events.flatMap((event) => {
    const status = EVENT_TO_STATUS[event.type]
    return status ? [status] : []
  })
}
