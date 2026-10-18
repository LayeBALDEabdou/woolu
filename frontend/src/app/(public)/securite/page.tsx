import type { Metadata } from "next"
import { Info } from "lucide-react"
import { PageHero } from "@/components/marketing/page-hero"
import { BUSINESS_RULES } from "@/lib/config/business-rules"

export const metadata: Metadata = {
  title: "Sécurité et règles",
  description:
    "Mécanisme de paiement, libération des fonds, délais de réclamation, gestion des litiges et remboursements sur Wóolu.",
}

const claimWindows = BUSINESS_RULES.claimWindowOptions.join(", ")

const RULES = [
  {
    id: "paiement",
    title: "Mécanisme de paiement",
    points: [
      "Le paiement n'est possible qu'après acceptation des conditions par le client et par le vendeur.",
      "La facture de paiement est générée par le serveur Wóolu auprès du prestataire de paiement (Bitnob, intégration en préparation). Elle a une durée de validité limitée : une facture expirée ne peut plus être payée et doit être régénérée.",
      "Un paiement n'est considéré comme reçu qu'après vérification par le serveur. L'application n'affiche jamais « fonds bloqués » avant cette confirmation.",
      "Aucune clé d'accès au prestataire de paiement ne transite par votre navigateur ou votre téléphone.",
    ],
  },
  {
    id: "liberation",
    title: "Conditions de libération des fonds",
    points: [
      "Les fonds sont libérés au vendeur lorsque le client confirme la réception du produit ou la bonne réalisation du service.",
      "En cas de litige, les fonds ne sont libérés qu'après décision de l'équipe Wóolu en faveur du vendeur.",
      "Une transaction faisant l'objet d'une réclamation active n'est jamais présentée comme terminée.",
    ],
  },
  {
    id: "reclamations",
    title: "Délais de réclamation",
    points: [
      `Le délai de réclamation est fixé à la création de la transaction (${claimWindows} jours après la livraison) et fait partie des conditions acceptées par le client.`,
      "Pendant ce délai, le client peut confirmer la réception ou signaler un problème : produit non reçu, non conforme, service non réalisé, retard important ou autre.",
      "Le respect des délais est contrôlé par le serveur.",
    ],
  },
  {
    id: "litiges",
    title: "Gestion des litiges",
    points: [
      "Le client décrit le problème et choisit un motif. Le vendeur est notifié et peut répondre sur le dossier.",
      "L'équipe Wóolu peut demander des précisions à l'une ou l'autre des parties, puis examine le dossier.",
      "La décision (libération au vendeur ou remboursement du client) est prise par Wóolu, jamais automatiquement par l'application.",
    ],
  },
  {
    id: "remboursement",
    title: "Conditions de remboursement",
    points: [
      "Avant tout paiement confirmé, une transaction peut être annulée sans frais : aucun remboursement n'est nécessaire.",
      "Après paiement, le remboursement du client intervient à l'issue d'un litige tranché en sa faveur.",
      "Les remboursements sont exécutés exclusivement par le serveur Wóolu, après vérification.",
    ],
  },
] as const

export default function SecurityPage() {
  return (
    <>
      <PageHero
        title="Les règles qui protègent chaque transaction"
        intro="Elles s'appliquent de la même façon au client et au vendeur ou prestataire."
      >
        <p className="flex max-w-2xl gap-3 rounded-2xl bg-brand-900/50 p-4 text-sm text-brand-100/90">
          <Info className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden />
          Ces règles décrivent le fonctionnement prévu de la plateforme. Elles peuvent encore évoluer avant
          l&apos;ouverture du service au public, notamment les délais et la grille tarifaire.
        </p>
      </PageHero>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="divide-y border-y">
          {RULES.map((rule) => (
            <section
              key={rule.id}
              id={rule.id}
              aria-labelledby={`${rule.id}-titre`}
              className="grid scroll-mt-24 gap-4 py-10 md:grid-cols-[16rem_1fr] md:gap-10"
            >
              <h2 id={`${rule.id}-titre`} className="text-2xl font-bold text-brand-900">
                {rule.title}
              </h2>
              <ul className="space-y-3">
                {rule.points.map((point) => (
                  <li key={point} className="flex gap-3 leading-relaxed text-foreground/90">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-600" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section aria-labelledby="vigilance" className="mt-12 rounded-[1.75rem] bg-brand-900 p-6 text-brand-100 sm:p-8">
          <h2 id="vigilance" className="mb-3 text-2xl font-bold text-white">
            Restez vigilant
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>Wóolu ne vous demandera jamais votre mot de passe par téléphone, SMS ou e-mail.</li>
            <li>Ne payez jamais en dehors de la page de paiement d&apos;une transaction Wóolu.</li>
            <li>Ne confirmez la réception qu&apos;après avoir vérifié le produit ou le service.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
