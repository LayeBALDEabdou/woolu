import type { Metadata } from "next"
import Link from "next/link"
import { FileSignature, Handshake, PackageCheck, Scale, ShieldCheck } from "lucide-react"
import { PageHero } from "@/components/marketing/page-hero"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/data-display/status-badge"
import { STATUS_PRESENTATION } from "@/features/transactions/domain/presentation"
import { TRANSACTION_STATUSES } from "@/features/transactions/types"

export const metadata: Metadata = {
  title: "Fonctionnement",
  description: "Les étapes d'une transaction Wóolu, de la proposition à la libération des fonds.",
}

const SECTIONS = [
  {
    id: "creation",
    icon: FileSignature,
    title: "Création de la transaction",
    who: "Vendeur ou prestataire",
    body: [
      "Le vendeur ou prestataire décrit le produit ou le service, fixe le montant en francs CFA, la date limite de livraison ou d'exécution, les conditions particulières et le délai de réclamation.",
      "Avant de valider, il relit un récapitulatif et confirme accepter lui-même ces conditions. Il envoie ensuite la proposition au client.",
    ],
  },
  {
    id: "accord",
    icon: Handshake,
    title: "Accord sur les conditions",
    who: "Client",
    body: [
      "Le client consulte la proposition complète. Il peut l'accepter, ou la refuser : la transaction est alors annulée.",
      "Aucun paiement n'est possible tant que les deux parties n'ont pas accepté les mêmes conditions.",
    ],
  },
  {
    id: "paiement",
    icon: ShieldCheck,
    title: "Paiement",
    who: "Client, puis vérification par le serveur",
    body: [
      "Le client demande une facture de paiement. Le serveur Wóolu la génère auprès du prestataire de paiement et l'affiche avec son montant et sa date d'expiration.",
      "Le paiement n'est considéré comme reçu qu'une fois confirmé par le serveur. Les fonds sont alors indiqués comme bloqués, et le vendeur est invité à livrer.",
    ],
  },
  {
    id: "livraison",
    icon: PackageCheck,
    title: "Livraison ou réalisation du service",
    who: "Vendeur ou prestataire",
    body: [
      "Le vendeur déclare l'expédition (mode de livraison, transporteur, numéro de suivi) ou le démarrage de la prestation, puis sa fin.",
      "Le client suit chaque étape depuis son tableau de bord et reçoit une notification à chaque changement.",
    ],
  },
  {
    id: "confirmation",
    icon: Scale,
    title: "Confirmation, réclamation et résolution",
    who: "Client, puis Wóolu en cas de litige",
    body: [
      "Si tout est conforme, le client confirme la réception après avoir relu un récapitulatif : la libération des fonds au vendeur est alors autorisée.",
      "En cas de problème, le client ouvre une réclamation en précisant le motif. Les fonds restent bloqués, les deux parties échangent sur le dossier, et l'équipe Wóolu décide : libération des fonds ou remboursement.",
    ],
  },
] as const

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title="Le parcours d'une transaction"
        intro="Chaque transaction suit les mêmes étapes, dans le même ordre. Les deux parties voient en permanence où elle en est et ce qui reste à faire."
      />

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <ol className="relative space-y-12 border-l-2 border-brand-100 pl-8 sm:pl-12">
          {SECTIONS.map((section, index) => (
            <li key={section.id} id={section.id} aria-labelledby={`${section.id}-titre`} className="relative scroll-mt-24">
              <span
                aria-hidden
                className="absolute top-0 -left-[3.44rem] flex size-11 items-center justify-center rounded-full bg-brand-800 font-heading text-lg font-bold text-mint ring-8 ring-background sm:-left-[4.44rem]"
              >
                {index + 1}
              </span>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2 id={`${section.id}-titre`} className="text-3xl font-bold text-brand-900">
                  {section.title}
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  <section.icon className="size-3.5" aria-hidden />
                  {section.who}
                </span>
              </div>
              <div className="max-w-2xl space-y-3 leading-relaxed text-foreground/90">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <section aria-labelledby="statuts" className="mt-20">
          <h2 id="statuts" className="mb-2 text-3xl font-bold text-brand-900">
            Les statuts d&apos;une transaction
          </h2>
          <p className="mb-6 max-w-2xl text-muted-foreground">
            Le statut indique précisément où en est la transaction. Il n&apos;évolue que dans un ordre cohérent, contrôlé
            par le serveur.
          </p>
          <ul className="divide-y rounded-2xl border bg-card">
            {TRANSACTION_STATUSES.map((status) => (
              <li key={status} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="sm:w-56 sm:shrink-0">
                  <StatusBadge tone={STATUS_PRESENTATION[status].tone}>{STATUS_PRESENTATION[status].label}</StatusBadge>
                </div>
                <p className="text-sm text-muted-foreground">{STATUS_PRESENTATION[status].description}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/inscription">Créer un compte</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/securite">Règles de sécurité</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
