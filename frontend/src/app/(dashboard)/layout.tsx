import type { Metadata } from "next"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return <DashboardShell>{children}</DashboardShell>
}
