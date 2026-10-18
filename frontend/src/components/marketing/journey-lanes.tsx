import { cn } from "@/lib/utils"

type Actor = "vendeur" | "client"

const STEPS: Array<{ actor: Actor; title: string; text: string; woolu?: string; col: string }> = [
  {
    actor: "vendeur",
    title: "Propose les conditions",
    text: "Prix, délai et description.",
    col: "lg:col-start-2",
  },
  {
    actor: "client",
    title: "Accepte les conditions",
    text: "Sans son accord, rien ne démarre.",
    col: "lg:col-start-3",
  },
  {
    actor: "client",
    title: "Paie",
    text: "Il règle la facture générée par Wóolu.",
    woolu: "Wóolu vérifie le paiement et bloque les fonds",
    col: "lg:col-start-4",
  },
  {
    actor: "vendeur",
    title: "Livre ou réalise",
    text: "Il sait que l'argent est là.",
    col: "lg:col-start-5",
  },
  {
    actor: "client",
    title: "Confirme ou signale",
    text: "Sinon, il ouvre une réclamation.",
    woolu: "Wóolu libère les fonds, ou tranche le litige",
    col: "lg:col-start-6",
  },
]

const ACTOR_LABEL: Record<Actor, string> = { vendeur: "Vendeur", client: "Client" }

/**
 * Parcours en couloirs : le vendeur en haut, le client en bas, Wóolu au milieu.
 * Sur mobile, une liste verticale où chaque étape indique qui agit.
 */
export function JourneyLanes() {
  return (
    <div className="relative grid gap-4 lg:grid-cols-[6.5rem_repeat(5,minmax(0,1fr))] lg:grid-rows-[auto_4.5rem_auto] lg:gap-x-3 lg:gap-y-0">
      {/* Intitulés des couloirs et ligne Wóolu (décoratifs sur grand écran) */}
      <p aria-hidden className="hidden self-end pb-3 text-sm font-semibold text-brand-700 lg:col-start-1 lg:row-start-1 lg:block">
        Vendeur
      </p>
      <div aria-hidden className="hidden items-center lg:col-start-1 lg:col-end-7 lg:row-start-2 lg:flex">
        <span className="w-26 shrink-0 text-sm font-semibold text-brand-900">Wóolu</span>
        <span className="h-0.75 flex-1 rounded-full bg-[repeating-linear-gradient(90deg,var(--brand-600)_0_14px,transparent_14px_22px)]" />
      </div>
      <p aria-hidden className="hidden self-start pt-3 text-sm font-semibold text-brand-700 lg:col-start-1 lg:row-start-3 lg:block">
        Client
      </p>

      <ol className="contents">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className={cn(
              "relative flex flex-col gap-2 rounded-2xl border bg-card p-4",
              step.col,
              step.actor === "vendeur" ? "lg:row-start-1 lg:mb-3" : "lg:row-start-3 lg:mt-3",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-800 font-heading text-sm font-bold text-white">
                {index + 1}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium lg:hidden",
                  step.actor === "vendeur" ? "bg-brand-100 text-brand-900" : "bg-secondary text-secondary-foreground",
                )}
              >
                {ACTOR_LABEL[step.actor]}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.text}</p>
            {step.woolu ? (
              <p className="mt-auto rounded-xl bg-brand-800 px-3 py-2 text-sm font-medium text-mint">{step.woolu}</p>
            ) : null}
            {/* Point d'ancrage sur la ligne Wóolu */}
            <span
              aria-hidden
              className={cn(
                "absolute left-1/2 hidden size-3 -translate-x-1/2 rounded-full border-2 border-brand-600 bg-paper lg:block",
                // Ligne Wóolu à 3rem du bord de la carte (marge 0,75rem + demi-rangée 2,25rem).
                step.actor === "vendeur" ? "-bottom-12 translate-y-1/2" : "-top-12 -translate-y-1/2",
                step.woolu && "size-4 border-0 bg-brand-600 ring-4 ring-brand-100",
              )}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}
