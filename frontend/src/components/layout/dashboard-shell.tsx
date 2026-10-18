"use client"

import Link from "next/link"
import { useState } from "react"
import { Bell, Menu } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { DemoAccountSwitcher } from "@/components/demo/demo-account-switcher"
import { DashboardNav } from "@/components/navigation/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { useUnreadCount } from "@/features/notifications/hooks"
import { UserMenu } from "./user-menu"

function NotificationBell() {
  const unread = useUnreadCount()
  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link
        href="/notifications"
        aria-label={unread > 0 ? `Notifications, ${unread} non lues` : "Notifications"}
      >
        <Bell aria-hidden />
        {unread > 0 ? (
          <span
            aria-hidden
            className="tabular top-1.5 right-1.5 min-w-4 px-1 leading-4 font-semibold text-white absolute flex items-center justify-center rounded-full bg-destructive text-[10px]"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Link>
    </Button>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1">
        {/* La colonne porte le fond sur toute la hauteur ; le contenu de navigation reste collé en haut. */}
        <div className="w-64 lg:block hidden shrink-0 bg-brand-900">
          <aside className="top-0 px-4 py-6 sticky flex h-dvh flex-col">
            <div className="mb-10 px-2">
              <Logo href="/dashboard" tone="light" />
            </div>
            <DashboardNav />
            <p className="px-3 text-xs mt-auto text-brand-100/50">
              « Wóolu » signifie confiance en wolof.
            </p>
          </aside>
        </div>

        <div className="min-w-0 flex flex-1 flex-col">
          <header className="top-0 h-16 gap-2 px-4 backdrop-blur sm:px-6 sticky z-30 flex items-center border-b bg-background/90">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Ouvrir la navigation"
                >
                  <Menu aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 px-4 [&>button]:text-white border-0 bg-brand-900 text-brand-50"
              >
                <SheetHeader className="px-2">
                  <SheetTitle asChild>
                    <div>
                      <Logo href="/dashboard" tone="light" />
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <DashboardNav onNavigate={() => setMenuOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="lg:hidden">
              <Logo href="/dashboard" />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <DemoAccountSwitcher />
              <NotificationBell />
              <UserMenu />
            </div>
          </header>
          <main id="contenu" className="max-w-6xl px-4 py-6 sm:px-6 sm:py-8 mx-auto w-full flex-1">
            <AuthGuard>{children}</AuthGuard>
          </main>
        </div>
      </div>
    </div>
  )
}
