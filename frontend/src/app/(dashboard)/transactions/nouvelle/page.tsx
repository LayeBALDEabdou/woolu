import type { Metadata } from "next"
import { CreateTransactionView } from "@/features/transactions/components/create-transaction-view"

export const metadata: Metadata = { title: "Nouvelle transaction" }

export default function NewTransactionPage() {
  return <CreateTransactionView />
}
