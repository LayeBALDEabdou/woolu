import type { Metadata } from "next"
import { SettingsView } from "@/features/account/components/settings-view"

export const metadata: Metadata = { title: "Paramètres" }

export default function SettingsPage() {
  return <SettingsView />
}
