import { BellRing, ChevronLeft, Lock, Refrigerator, ShieldCheck, Truck, Wifi } from "lucide-react"
import { cn } from "@/lib/utils"

/** Délais de la séquence d'ouverture (secondes) : une seule animation, jouée au chargement. */
const T = { merchant: 0.15, client: 0.35, lock: 1.6, held: 1.9, notify: 2.2 }

const delay = (seconds: number) => ({ "--d": `${seconds}s` }) as React.CSSProperties

/**
 * Un téléphone dessiné comme un appareil : cadre, boutons latéraux, Dynamic Island, barre d'état.
 * Toutes les mesures sont en `cqw` (largeur du conteneur) : l'appareil garde ses proportions à toutes les tailles.
 */
function Device({
  className,
  tilt,
  style,
  children,
}: {
  className?: string
  tilt: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div style={style} className={cn("pacte-rise @container absolute", className)}>
      <div className={cn("relative", tilt)}>
        {/* Boutons latéraux */}
        <span className="absolute top-[17%] -left-[1.1cqw] h-[4%] w-[1.4cqw] rounded-l-[0.6cqw] bg-[#a9bab1]" />
        <span className="absolute top-[24%] -left-[1.1cqw] h-[8%] w-[1.4cqw] rounded-l-[0.6cqw] bg-[#a9bab1]" />
        <span className="absolute top-[34%] -left-[1.1cqw] h-[8%] w-[1.4cqw] rounded-l-[0.6cqw] bg-[#a9bab1]" />
        <span className="absolute top-[28%] -right-[1.1cqw] h-[12%] w-[1.4cqw] rounded-r-[0.6cqw] bg-[#a9bab1]" />

        <div className="rounded-[15cqw] bg-[#cfdad4] p-[1.1cqw] shadow-[0_50px_90px_-40px_rgba(2,14,10,0.95)] ring-[0.5cqw] ring-[#a9bab1]">
          <div className="rounded-[14cqw] bg-brand-900 p-[1.8cqw]">
            <div className="relative flex aspect-[9/17.6] flex-col overflow-hidden rounded-[12cqw] bg-paper px-[5.5cqw] pt-[3.6cqw] pb-[6cqw] text-[4.5cqw] leading-tight text-foreground">
              <StatusBar />
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="relative mb-[1.1em] flex h-[1.9em] items-center justify-between px-[0.9em] text-[0.82em] font-semibold text-brand-900">
      <span className="tabular">9:41</span>
      <span className="absolute top-1/2 left-1/2 h-[1.85em] w-[6.4em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-900" />
      <span className="flex items-center gap-[0.3em]">
        <span className="flex items-end gap-[0.12em]">
          <span className="h-[0.35em] w-[0.2em] rounded-sm bg-brand-900" />
          <span className="h-[0.55em] w-[0.2em] rounded-sm bg-brand-900" />
          <span className="h-[0.75em] w-[0.2em] rounded-sm bg-brand-900" />
          <span className="h-[0.95em] w-[0.2em] rounded-sm bg-brand-900" />
        </span>
        <Wifi className="size-[1em]" strokeWidth={2.6} />
        <span className="h-[0.85em] w-[1.7em] rounded-[0.25em] border-[0.12em] border-brand-900 p-[0.1em]">
          <span className="block h-full w-4/5 rounded-[0.12em] bg-brand-900" />
        </span>
      </span>
    </div>
  )
}

/** Ligne « libellé / valeur » des écrans. */
function Row({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("py-[0.75em]", className)}>
      <p className="mb-[0.25em] text-[0.78em] text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-[2.3em] shrink-0 items-center justify-center rounded-full text-[0.8em] font-bold",
        className,
      )}
    >
      {initials}
    </span>
  )
}

/** Écran de la cliente : sa commande, les fonds bloqués, la livraison en cours. */
function ClientScreen() {
  return (
    <>
      <div className="flex items-center gap-[0.6em]">
        <span className="flex size-[2.1em] shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <ChevronLeft className="size-[1.2em]" strokeWidth={2.6} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[1.3em] font-bold text-brand-900">Ma commande</p>
          <p className="text-[0.75em] text-muted-foreground">WL-26-1045</p>
        </div>
        <Avatar initials="AD" className="bg-brand-100 text-brand-800" />
      </div>

      <div
        className="pacte-rise mt-[1em] flex items-center gap-[0.7em] rounded-[1em] bg-brand-800 p-[0.8em] text-brand-50"
        style={delay(T.held)}
      >
        <span className="flex size-[2.2em] shrink-0 items-center justify-center rounded-full bg-mint text-brand-900">
          <Lock className="size-[1.1em]" strokeWidth={2.6} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-mint">Fonds bloqués</p>
          <p className="text-[0.78em] text-brand-100/85">Gardés par Wóolu</p>
        </div>
      </div>

      <div className="mt-[0.9em] divide-y divide-border rounded-[1em] bg-card px-[0.9em] ring-1 ring-border">
        <Row label="Montant">
          <div className="flex items-center justify-between gap-[0.5em]">
            <p className="tabular font-heading text-[1.55em] font-bold text-brand-900">
              210 000 F CFA
            </p>
            <span className="flex size-[2.2em] shrink-0 items-center justify-center rounded-[0.6em] bg-brand-50 text-brand-700">
              <Refrigerator className="size-[1.2em]" />
            </span>
          </div>
          <p className="mt-[0.2em] text-[0.82em]">Réfrigérateur 2 portes</p>
        </Row>
        <Row label="Vendeur">
          <div className="flex items-center gap-[0.55em]">
            <Avatar initials="MN" className="bg-mint text-brand-900" />
            <div>
              <p className="font-semibold">Moussa Ndiaye</p>
              <p className="text-[0.75em] text-muted-foreground">Électroménager · Dakar</p>
            </div>
          </div>
        </Row>
        <Row label="Livraison">
          <div className="flex items-center justify-between">
            <p className="font-semibold">En cours</p>
            <p className="text-[0.78em] text-muted-foreground">avant le 24 oct.</p>
          </div>
          <div className="mt-[0.55em] grid grid-cols-4 gap-[0.25em]">
            <span className="h-[0.35em] rounded-full bg-brand-600" />
            <span className="h-[0.35em] rounded-full bg-brand-600" />
            <span className="h-[0.35em] rounded-full bg-brand-500/45" />
            <span className="h-[0.35em] rounded-full bg-muted" />
          </div>
        </Row>
      </div>

      <div className="mt-auto space-y-[0.7em]">
        <div className="rounded-full bg-brand-800 py-[0.85em] text-center font-semibold text-white">
          Confirmer la réception
        </div>
        <p className="flex items-center justify-center gap-[0.35em] text-[0.75em] text-muted-foreground">
          <ShieldCheck className="size-[1.1em]" /> Paiement vérifié par Wóolu
        </p>
      </div>
    </>
  )
}

/** Écran du vendeur : le paiement est vérifié, il peut livrer. */
function MerchantScreen() {
  return (
    <>
      <div className="flex items-center gap-[0.6em]">
        <Avatar initials="MN" className="bg-mint text-brand-900" />
        <div className="min-w-0">
          <p className="font-heading text-[1.3em] font-bold text-brand-900">Mes ventes</p>
          <p className="text-[0.75em] text-muted-foreground">Moussa Ndiaye · vendeur</p>
        </div>
      </div>

      <div
        className="pacte-rise mt-[1em] flex items-start gap-[0.6em] rounded-[1em] bg-brand-800 p-[0.8em] text-brand-50"
        style={delay(T.notify)}
      >
        <BellRing className="mt-[0.1em] size-[1.2em] shrink-0 text-mint" />
        <div>
          <p className="font-semibold text-mint">Paiement vérifié</p>
          <p className="text-[0.82em]">Aïssatou a payé. Vous pouvez livrer.</p>
        </div>
      </div>

      <div className="mt-[0.9em] divide-y divide-border rounded-[1em] bg-card px-[0.9em] ring-1 ring-border">
        <Row label="Vous recevrez">
          <p className="tabular font-heading text-[1.55em] font-bold text-brand-900">
            210 000 F CFA
          </p>
          <p className="mt-[0.25em] flex items-center gap-[0.3em] text-[0.78em] font-medium text-brand-700">
            <Lock className="size-[1em]" /> après confirmation de la cliente
          </p>
        </Row>
        <Row label="Cliente">
          <div className="flex items-center gap-[0.55em]">
            <Avatar initials="AD" className="bg-brand-100 text-brand-800" />
            <p className="font-semibold">Aïssatou Diop</p>
          </div>
        </Row>
        <Row label="À livrer avant le">
          <p className="font-semibold">24 octobre</p>
        </Row>
      </div>

      <div className="mt-auto flex items-center justify-center gap-[0.45em] rounded-full bg-brand-800 py-[0.85em] font-semibold text-white">
        <Truck className="size-[1.15em]" /> Déclarer l&apos;expédition
      </div>
    </>
  )
}

/**
 * Le pacte : la cliente et le vendeur, reliés par Wóolu.
 * Illustration d'une transaction type — aucune donnée réelle.
 */
export function PacteVisual() {
  return (
    <figure className="@container relative mx-auto aspect-[1/1.08] w-full max-w-[34rem]">
      <div aria-hidden className="absolute inset-0">
        <Device
          className="top-[2%] right-[1%] w-[46%]"
          tilt="rotate-[5deg]"
          style={delay(T.merchant)}
        >
          <MerchantScreen />
        </Device>

        <Device
          className="top-[5%] left-[5%] z-10 w-[51%]"
          tilt="-rotate-[4deg]"
          style={delay(T.client)}
        >
          <ClientScreen />
        </Device>

        {/* Le sceau Wóolu, entre les deux parties */}
        <div className="absolute top-[71%] left-[53%] z-20 -translate-x-1/2 -translate-y-1/2">
          <div
            className="pacte-pulse relative size-[clamp(4rem,17cqw,6rem)] rounded-full shadow-[0_18px_40px_-18px_rgba(2,14,10,0.9)]"
            style={delay(T.lock)}
          >
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
              <circle cx="50" cy="50" r="49" fill="var(--mint)" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--brand-800)"
                strokeOpacity=".25"
              />
              <defs>
                <path id="sceau" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" />
              </defs>
              <text fontSize="9.2" fontWeight="700" letterSpacing="2.4" fill="var(--brand-800)">
                <textPath href="#sceau">WÓOLU · CONFIANCE · WÓOLU · CONFIANCE ·</textPath>
              </text>
            </svg>
            <svg
              viewBox="0 0 24 24"
              className="absolute top-1/2 left-1/2 size-[34%] -translate-x-1/2 -translate-y-1/2"
              fill="none"
              stroke="var(--brand-800)"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M7 11V8a5 5 0 0 1 10 0v3" className="pacte-lock" style={delay(T.lock)} />
              <rect x="4.5" y="11" width="15" height="10" rx="2.5" fill="var(--brand-800)" />
            </svg>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        Illustration : le téléphone de la cliente montre ses fonds bloqués par Wóolu et la livraison
        en cours ; celui du vendeur indique que le paiement est vérifié et qu&apos;il peut expédier.
      </figcaption>
    </figure>
  )
}
