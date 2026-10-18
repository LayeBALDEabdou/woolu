import type { Metadata } from "next"
import { TransactionsListView } from "@/features/transactions/components/transactions-list-view"

export const metadata: Metadata = { title: "Transactions" }

export default function TransactionsPage() {
  return <TransactionsListView />
}
