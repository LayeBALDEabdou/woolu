import { formatDateTime } from "@/lib/formatters/date"
import { cn } from "@/lib/utils"
import { EVENT_LABELS } from "../domain/presentation"
import type { TransactionEvent } from "../types"

const ACTOR_LABELS = { merchant: "Vendeur", client: "Client", system: "Serveur Wóolu" } as const

/** Historique chronologique (du plus ancien au plus récent). */
export function TransactionTimeline({ events }: { events: TransactionEvent[] }) {
  const ordered = [...events].sort((a, b) => a.at.localeCompare(b.at))
  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {ordered.map((event, index) => {
        const isLast = index === ordered.length - 1
        return (
          <li key={event.id} className="relative">
            <span
              aria-hidden
              className={cn(
                "absolute top-1 -left-[1.6rem] size-3 rounded-full ring-4 ring-card",
                event.actor === "system" ? "bg-brand-700" : isLast ? "bg-brand-500" : "bg-border",
              )}
            />
            <p className="text-sm font-medium text-foreground">{EVENT_LABELS[event.type]}</p>
            <p className="text-xs text-muted-foreground">
              <time dateTime={event.at}>{formatDateTime(event.at)}</time> ·{" "}
              {event.actorName ?? ACTOR_LABELS[event.actor]}
            </p>
            {event.note ? <p className="mt-1 text-sm text-foreground/80">« {event.note} »</p> : null}
          </li>
        )
      })}
    </ol>
  )
}
