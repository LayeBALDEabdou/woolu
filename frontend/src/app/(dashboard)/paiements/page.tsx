import type { Metadata } from "next"
import { PaymentsHistoryView } from "@/features/payments/components/payments-history-view"

export const metadata: Metadata = { title: "Paiements" }

export default function PaymentsPage() {
  return <PaymentsHistoryView />
}
