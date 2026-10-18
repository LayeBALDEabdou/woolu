"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense } from "react"
import { Bell, CreditCard, LayoutDashboard, type LucideIcon, Scale, Settings, ArrowLeftRight } from "lucide-react"
import { useUnreadCount } from "@/features/notifications/hooks"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const DASHBOARD_NAV: readonly NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/paiements", label: "Paiements", icon: CreditCard },
  { href: "/reclamations", label: "Réclamations", icon: Scale },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/parametres", label: "Paramètres", icon: Settings },
]

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  const unread = useUnreadCount()
  return (
    <ul className="space-y-1">
      {DASHBOARD_NAV.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-mint/60 focus-visible:outline-none",
                active ? "bg-mint text-brand-900" : "text-brand-100/80 hover:bg-white/8 hover:text-white",
              )}
            >
              <item.icon className="size-4.5 shrink-0" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.href === "/notifications" && unread > 0 ? (
                <span
                  className={cn(
                    "tabular rounded-full px-1.5 text-xs font-semibold",
                    active ? "bg-brand-900 text-mint" : "bg-mint/15 text-mint",
                  )}
                >
                  {unread}
                  <span className="sr-only"> non lues</span>
                </span>
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function ActiveNavLinks(props: { onNavigate?: () => void }) {
  return <NavLinks pathname={usePathname()} {...props} />
}

/**
 * usePathname peut suspendre sur les routes dynamiques (cacheComponents) :
 * la navigation est rendue sans état actif en attendant.
 */
export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Espace personnel">
      <Suspense fallback={<NavLinks pathname={null} onNavigate={onNavigate} />}>
        <ActiveNavLinks onNavigate={onNavigate} />
      </Suspense>
    </nav>
  )
}
