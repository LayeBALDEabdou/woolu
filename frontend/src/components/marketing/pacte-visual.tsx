import { Check, Lock, Truck } from "lucide-react"
import { cn } from "@/lib/utils"

/** Délais de la séquence d'ouverture (secondes) : une seule animation, jouée au chargement. */
const T = { client: 0.15, merchant: 0.35, accepted: 0.9, thread: 1.25, lock: 2.15, held: 2.45, notify: 2.75 }

const delay = (seconds: number) => ({ "--d": `${seconds}s` }) as React.CSSProperties

function Phone({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={cn(
        "@container absolute aspect-[9/15.5] w-[44%] rounded-[2.2rem] border-[5px] border-brand-900 bg-paper shadow-[0_30px_60px_-30px_rgba(4,20,15,0.8)]",
        className,
      )}
    >
      <div className="flex h-full flex-col gap-[0.7em] overflow-hidden rounded-[1.8rem] p-[0.95em] text-[5.2cqw] leading-tight text-foreground">
        <div className="mx-auto h-[0.55em] w-[3.6em] rounded-full bg-brand-900" />
        {children}
      </div>
    </div>
  )
}

function Step({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-[0.5em]">
      <span
        className={cn(
          "flex size-[1.3em] shrink-0 items-center justify-center rounded-full",
          done ? "bg-brand-600 text-white" : "border border-input",
        )}
      >
        {done ? <Check className="size-[0.85em]" strokeWidth={3} /> : null}
      </span>
      <span className={done ? "" : "text-muted-foreground"}>{children}</span>
    </li>
  )
}

/**
 * Le pacte : la cliente et le vendeur, reliés par Wóolu.
 * Illustration d'une transaction type — aucune donnée réelle.
 */
export function PacteVisual() {
  return (
    <figure className="@container relative mx-auto aspect-square w-full max-w-[33rem]">
      <div aria-hidden className="absolute inset-0">
        {/* Le fil entre les deux parties */}
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d="M 40 46 C 47 40, 53 60, 60 56"
            pathLength={1}
            fill="none"
            stroke="var(--mint)"
            strokeWidth="0.7"
            strokeLinecap="round"
            className="pacte-draw"
            style={delay(T.thread)}
          />
        </svg>

        <Phone className="top-0 left-0 -rotate-3 pacte-rise" style={delay(T.client)}>
          <p className="flex justify-between text-[0.8em] text-muted-foreground">
            <span>Ma commande</span>
            <span>WL-26-1045</span>
          </p>
          <div className="rounded-[1em] bg-card p-[0.8em] ring-1 ring-border">
            <p className="font-semibold">Réfrigérateur 2 portes</p>
            <p className="text-[0.85em] text-muted-foreground">Vendu par Moussa N.</p>
            <p className="tabular mt-[0.5em] font-heading text-[1.55em] font-bold text-brand-900">210 000 F CFA</p>
          </div>
          <p
            className="pacte-rise flex items-center gap-[0.4em] self-start rounded-full bg-brand-800 px-[0.75em] py-[0.35em] text-[0.85em] font-semibold text-mint"
            style={delay(T.held)}
          >
            <Lock className="size-[1em]" /> Fonds bloqués
          </p>
          <ol className="space-y-[0.45em] text-[0.9em]">
            <Step done>Conditions acceptées</Step>
            <Step done>Paiement vérifié</Step>
            <Step done={false}>Livraison</Step>
            <Step done={false}>Ma confirmation</Step>
          </ol>
          <div className="mt-auto rounded-full bg-muted py-[0.6em] text-center text-[0.85em] font-semibold text-muted-foreground">
            Confirmer la réception
          </div>
        </Phone>

        <Phone className="top-[13%] right-0 rotate-2 pacte-rise" style={delay(T.merchant)}>
          <p className="text-[0.8em] text-muted-foreground">Mes ventes</p>
          <div
            className="pacte-rise rounded-[1em] bg-brand-800 p-[0.8em] text-[0.9em] text-brand-50"
            style={delay(T.notify)}
          >
            <p className="font-semibold text-mint">Paiement vérifié</p>
            <p>Les fonds sont bloqués. Vous pouvez livrer.</p>
          </div>
          <div className="rounded-[1em] bg-card p-[0.8em] ring-1 ring-border">
            <p className="font-semibold">Réfrigérateur 2 portes</p>
            <p className="text-[0.85em] text-muted-foreground">Pour Aïssatou D. · avant le 24 oct.</p>
          </div>
          <div className="rounded-[1em] bg-card p-[0.8em] ring-1 ring-border">
            <p className="text-[0.85em] text-muted-foreground">Vous recevrez</p>
            <p className="tabular font-heading text-[1.3em] font-bold">210 000 F CFA</p>
            <p className="text-[0.8em] text-muted-foreground">après confirmation de la cliente</p>
          </div>
          <div className="mt-auto flex items-center justify-center gap-[0.4em] rounded-full bg-brand-800 py-[0.6em] text-[0.85em] font-semibold text-white">
            <Truck className="size-[1.1em]" /> Déclarer l&apos;expédition
          </div>
        </Phone>

        {/* Le sceau Wóolu, au milieu du fil */}
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="pacte-pulse relative size-[clamp(4.5rem,19cqw,6.5rem)] rounded-full" style={delay(T.lock)}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
              <circle cx="50" cy="50" r="49" fill="var(--mint)" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--brand-800)" strokeOpacity=".25" />
              <defs>
                <path id="sceau" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" />
              </defs>
              <text fontSize="9.2" fontWeight="700" letterSpacing="2.4" fill="var(--brand-800)">
                <textPath href="#sceau">WÓOLU · CONFIANCE · WÓOLU · CONFIANCE ·</textPath>
              </text>
            </svg>
            <svg viewBox="0 0 24 24" className="absolute top-1/2 left-1/2 size-[34%] -translate-x-1/2 -translate-y-1/2" fill="none" stroke="var(--brand-800)" strokeWidth="2.4" strokeLinecap="round">
              <path d="M7 11V8a5 5 0 0 1 10 0v3" className="pacte-lock" style={delay(T.lock)} />
              <rect x="4.5" y="11" width="15" height="10" rx="2.5" fill="var(--brand-800)" />
            </svg>
          </div>
        </div>

        <p
          className="pacte-rise absolute top-[4%] right-[2%] z-20 flex items-center gap-2 rounded-2xl bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg sm:text-sm"
          style={delay(T.accepted)}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          Conditions acceptées par les deux
        </p>
      </div>
      <figcaption className="sr-only">
        Illustration : une cliente et un vendeur reliés par Wóolu. Les conditions sont acceptées, le paiement est vérifié et
        les fonds restent bloqués jusqu&apos;à la confirmation de la livraison.
      </figcaption>
    </figure>
  )
}
