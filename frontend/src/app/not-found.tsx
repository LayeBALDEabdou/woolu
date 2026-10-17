import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main id="contenu" className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Logo />
      <div className="space-y-2">
        <p className="tabular text-sm font-semibold text-brand-700">404</p>
        <h1 className="text-3xl font-semibold text-brand-900">Page introuvable</h1>
        <p className="text-muted-foreground">Cette page n&apos;existe pas ou a été déplacée.</p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Mon espace</Link>
        </Button>
      </div>
    </main>
  )
}
