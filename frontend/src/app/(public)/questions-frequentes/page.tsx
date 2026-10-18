import type { Metadata } from "next"
import Link from "next/link"
import { FaqList } from "@/components/marketing/faq-list"
import { PageHero } from "@/components/marketing/page-hero"

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description:
    "Fonctionnement de Wóolu, création d'une transaction, libération des fonds, litiges, moyens de paiement et tarifs.",
}

export default function FaqPage() {
  return (
    <>
      <PageHero
        title="Questions fréquentes"
        intro="Les réponses courtes aux questions que l'on nous pose le plus."
      />

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-16 sm:px-6">
        <FaqList />
        <p className="text-muted-foreground">
          Une question absente de la liste ? Les{" "}
          <Link href="/securite" className="font-medium text-brand-700 underline underline-offset-4">
            règles de sécurité
          </Link>{" "}
          détaillent chaque cas.
        </p>
      </div>
    </>
  )
}
