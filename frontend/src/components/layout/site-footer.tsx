import Link from "next/link"
import { LogoMark } from "@/components/brand/logo"

const FOOTER_SECTIONS = [
  {
    title: "Produit",
    links: [
      { href: "/fonctionnement", label: "Fonctionnement" },
      { href: "/securite", label: "Sécurité et règles" },
      { href: "/#faq", label: "Questions fréquentes" },
    ],
  },
  {
    title: "Compte",
    links: [
      { href: "/inscription", label: "Créer un compte" },
      { href: "/connexion", label: "Se connecter" },
      { href: "/mot-de-passe-oublie", label: "Mot de passe oublié" },
    ],
  },
] as const

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-brand-900 text-brand-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-heading text-lg font-bold text-white">
            <LogoMark className="size-7" />
            Wóolu
          </div>
          <p className="max-w-sm text-sm text-brand-100/80">
            « Wóolu » signifie confiance en wolof. Des transactions plus sûres entre clients, vendeurs et prestataires au Sénégal.
            Service en cours de développement.
          </p>
        </div>
        {FOOTER_SECTIONS.map((section) => (
          <nav key={section.title} aria-label={section.title}>
            <h2 className="mb-3 text-sm font-semibold text-white">{section.title}</h2>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-brand-100/80 hover:text-white focus-visible:underline focus-visible:outline-none"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-brand-100/70 sm:px-6">
          © 2026 Wóolu. Les montants sont exprimés en francs CFA (XOF).
        </p>
      </div>
    </footer>
  )
}
