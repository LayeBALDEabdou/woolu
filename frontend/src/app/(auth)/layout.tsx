import Link from "next/link"
import { Check } from "lucide-react"
import { Logo, LogoMark } from "@/components/brand/logo"

const PROMISES = [
  "Aucun paiement sans l'accord écrit des deux parties",
  "Paiement vérifié par nos serveurs, jamais déclaré",
  "Fonds libérés après confirmation, ou décision de Wóolu",
]

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] flex flex-1">
        <aside className="p-10 lg:flex xl:p-14 relative hidden flex-col justify-between overflow-hidden bg-brand-800 text-brand-50">
          <Link
            href="/"
            className="gap-2 text-xl font-bold text-white flex items-center font-heading"
            aria-label="Wóolu — accueil"
          >
            <LogoMark className="size-9" inverted />
            Wóolu
          </Link>
          <div className="space-y-8">
            <p className="type-poster max-w-md text-6xl font-bold text-white xl:text-7xl">
              Payez quand c&apos;est livré.
            </p>
            <ul className="space-y-3">
              {PROMISES.map((promise) => (
                <li key={promise} className="gap-3 flex items-start text-brand-100/90">
                  <span className="mt-0.5 size-5 flex shrink-0 items-center justify-center rounded-full bg-mint text-brand-900">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  {promise}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-brand-100/60">« Wóolu » signifie confiance en wolof.</p>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="px-4 py-5 sm:px-8 flex items-center justify-between">
            <div className="lg:invisible">
              <Logo />
            </div>
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Retour au site
            </Link>
          </header>
          <main
            id="contenu"
            className="px-4 pt-2 pb-16 sm:px-8 sm:pt-8 lg:items-center lg:pt-0 flex flex-1 items-start justify-center"
          >
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
