import { ArrowRight, Lock, Mic, Undo2 } from "lucide-react"

function EscrowDiagram() {
  return (
    <div aria-hidden className="gap-2 sm:gap-3 flex items-center">
      <div className="gap-1.5 flex flex-col items-center">
        <span className="size-12 font-bold flex items-center justify-center rounded-full bg-brand-50 font-heading text-brand-900">
          A
        </span>
        <span className="text-xs text-brand-100/80">Client</span>
      </div>
      <ArrowRight className="size-5 shrink-0 text-mint/70" />
      <div className="gap-1.5 flex flex-col items-center">
        <span className="size-16 flex items-center justify-center rounded-full bg-mint text-brand-900 ring-8 ring-mint/15">
          <Lock className="size-6" strokeWidth={2.4} />
        </span>
        <span className="text-xs font-semibold text-mint">Wóolu</span>
      </div>
      <ArrowRight className="size-5 shrink-0 text-mint/70" />
      <div className="gap-1.5 flex flex-col items-center">
        <span className="size-12 font-bold flex items-center justify-center rounded-full bg-brand-50 font-heading text-brand-900">
          M
        </span>
        <span className="text-xs text-brand-100/80">Vendeur</span>
      </div>
    </div>
  )
}

/** Garanties : tailles et traitements différents selon l'importance de chaque promesse. */
export function GuaranteesGrid() {
  return (
    <div className="gap-4 lg:grid-cols-6 grid">
      <article className="p-6 sm:p-8 lg:col-span-4 lg:row-span-2 relative overflow-hidden rounded-[1.75rem] bg-brand-800 text-brand-50">
        <div className="gap-8 flex h-full flex-col">
          <div className="max-w-md space-y-3">
            <h3 className="text-3xl font-bold text-white sm:text-4xl">
              L&apos;argent attend au milieu.
            </h3>
            <p className="text-brand-100/85">
              Le client paie Wóolu, pas directement le vendeur. Les fonds restent bloqués tant que
              la livraison n&apos;est pas confirmée, et l&apos;application ne les affiche comme
              bloqués que lorsque notre serveur l&apos;a vérifié.
            </p>
          </div>
          <EscrowDiagram />
          <dl className="gap-3 text-sm sm:grid-cols-3 mt-auto grid">
            {[
              ["Bloqués", "dès que le paiement est vérifié"],
              ["Libérés", "quand le client confirme la réception"],
              ["Remboursés", "si Wóolu tranche un litige en faveur du client"],
            ].map(([term, desc]) => (
              <div key={term} className="px-3 py-2.5 rounded-xl bg-brand-900/60">
                <dt className="font-semibold text-mint">{term}</dt>
                <dd className="text-brand-100/80">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>

      <article className="gap-4 p-6 lg:col-span-2 flex flex-col rounded-2xl border bg-card">
        <h3 className="text-xl font-bold">Un litige ? Rien ne bouge.</h3>
        <div aria-hidden className="space-y-2 text-sm">
          <p className="px-3 py-2 max-w-[85%] rounded-2xl rounded-bl-sm bg-muted">
            La pointure reçue est 39, pas 41.
          </p>
          <p className="px-3 py-2 text-white ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-800">
            Je vérifie avec l&apos;artisan.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Les deux parties s&apos;expliquent sur le dossier, l&apos;équipe Wóolu décide. Les fonds
          restent bloqués jusque-là.
        </p>
      </article>

      <article className="gap-4 p-6 lg:col-span-2 flex flex-col justify-between rounded-2xl bg-mint text-brand-900">
        <p aria-hidden className="type-poster tabular font-bold sm:text-5xl text-[2.6rem]">
          1 250 000
          <span className="text-2xl block">F CFA</span>
        </p>
        <div className="space-y-1">
          <h3 className="text-xl font-bold">Au franc près</h3>
          <p className="text-sm text-brand-900/80">
            Montants fixés en francs CFA, sans arrondi ni conversion cachée.
          </p>
        </div>
      </article>

      <article className="gap-3 p-6 lg:col-span-3 flex flex-col rounded-2xl border bg-card">
        <Undo2 className="size-6 text-brand-700" aria-hidden />
        <h3 className="text-xl font-bold">Annuler avant de payer, c&apos;est gratuit</h3>
        <p className="text-sm text-muted-foreground">
          Tant que le paiement n&apos;est pas confirmé, le client peut refuser la proposition et le
          vendeur peut l&apos;annuler. Aucun argent n&apos;a bougé.
        </p>
      </article>

      <article className="gap-3 p-6 lg:col-span-3 flex flex-col rounded-2xl border-2 border-dashed border-brand-600/40">
        <div className="flex items-center justify-between">
          <Mic className="size-6 text-brand-700" aria-hidden />
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-secondary text-secondary-foreground">
            Bientôt
          </span>
        </div>
        <h3 className="text-xl font-bold">Des alertes vocales, en wolof aussi</h3>
        <p className="text-sm text-muted-foreground">
          Pour suivre ses transactions sans lire l&apos;écran. Cette fonctionnalité n&apos;est pas
          encore disponible.
        </p>
        <div aria-hidden className="mt-1 h-8 gap-1 flex items-end">
          {[3, 6, 4, 8, 5, 9, 4, 7, 3, 6, 8, 4, 6, 3, 5, 7, 4].map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-brand-600/40"
              style={{ height: `${h * 10}%` }}
            />
          ))}
        </div>
      </article>
    </div>
  )
}
