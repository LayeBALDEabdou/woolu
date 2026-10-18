import { ChevronDown } from "lucide-react"

const FAQ = [
  {
    q: "Qu'est-ce que Wóolu ?",
    a: "Une plateforme qui encadre une transaction entre un client et un vendeur ou prestataire : les conditions sont acceptées par les deux parties, le paiement est vérifié, et les fonds ne sont libérés qu'après confirmation de la livraison ou décision en cas de litige.",
  },
  {
    q: "Qui peut créer une transaction ?",
    a: "Les comptes vendeur et prestataire. Le client reçoit la proposition, la consulte, puis l'accepte ou la refuse.",
  },
  {
    q: "Quand le vendeur reçoit-il l'argent ?",
    a: "Lorsque le client confirme la réception, ou lorsque Wóolu tranche un litige en faveur du vendeur. Ces opérations sont exécutées et vérifiées par nos serveurs, jamais par l'application seule.",
  },
  {
    q: "Que se passe-t-il en cas de problème ?",
    a: "Le client ouvre une réclamation pendant le délai convenu. Les fonds restent bloqués, chaque partie peut s'exprimer, et l'équipe Wóolu rend une décision : libération au vendeur ou remboursement du client.",
  },
  {
    q: "Quels moyens de paiement sont acceptés ?",
    a: "Le paiement par Bitcoin Lightning via Bitnob est en cours d'intégration. Les paiements Mobile Money ne sont pas disponibles à ce jour.",
  },
  {
    q: "Combien coûte Wóolu ?",
    a: "La grille tarifaire n'est pas encore publiée. Elle sera affichée clairement avant tout paiement.",
  },
] as const

/** FAQ accessible sans JavaScript (éléments natifs details/summary). */
export function FaqList() {
  return (
    <div className="divide-y rounded-2xl border bg-card">
      {FAQ.map((item) => (
        <details key={item.q} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            {item.q}
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  )
}
