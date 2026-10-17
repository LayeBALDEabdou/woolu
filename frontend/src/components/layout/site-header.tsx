import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { PublicMobileNav } from "@/components/navigation/public-mobile-nav"

export const PUBLIC_NAV = [
  { href: "/fonctionnement", label: "Fonctionnement" },
  { href: "/securite", label: "Sécurité et règles" },
  { href: "/#faq", label: "Questions fréquentes" },
] as const

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-900 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost">
            <Link href="/connexion">Se connecter</Link>
          </Button>
          <Button asChild>
            <Link href="/inscription">Créer un compte</Link>
          </Button>
        </div>
        <PublicMobileNav links={PUBLIC_NAV} />
      </div>
    </header>
  )
}
