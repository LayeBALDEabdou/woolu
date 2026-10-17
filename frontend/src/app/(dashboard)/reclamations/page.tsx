import type { Metadata } from "next"
import { DisputesListView } from "@/features/disputes/components/disputes-list-view"

export const metadata: Metadata = { title: "Réclamations" }

export default function DisputesPage() {
  return <DisputesListView />
}
