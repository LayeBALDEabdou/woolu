"use client"

import { useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Check, Copy, Loader2, TimerOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/use-now"
import { formatCountdown } from "@/lib/formatters/date"
import { formatMoney, formatSats } from "@/lib/formatters/money"
import type { PaymentAttempt } from "../types"

interface InvoiceDisplayProps {
  attempt: PaymentAttempt
  /** Appelé lorsque l'échéance locale est atteinte, pour relire l'état sur le serveur. */
  onLocalExpiry: () => void
}

/**
 * Affiche la facture Lightning fournie par le backend. Aucune conversion ni validation
 * de paiement n'est faite ici : seul le serveur fait foi.
 */
export function InvoiceDisplay({ attempt, onLocalExpiry }: InvoiceDisplayProps) {
  const now = useNow()
  const [copied, setCopied] = useState(false)
  const expiryNotified = useRef(false)
  const invoice = attempt.invoice
  const remainingMs = invoice ? new Date(invoice.expiresAt).getTime() - now : 0
  const locallyExpired = remainingMs <= 0

  useEffect(() => {
    if (locallyExpired && !expiryNotified.current) {
      expiryNotified.current = true
      onLocalExpiry()
    }
  }, [locallyExpired, onLocalExpiry])

  if (!invoice) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Le serveur prépare la facture…
      </p>
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invoice.paymentRequest)
      setCopied(true)
      toast.success("Facture copiée.")
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Copie impossible. Sélectionnez le texte manuellement.")
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
      <div className="relative mx-auto w-fit rounded-xl border bg-white p-3">
        <QRCodeSVG
          value={invoice.paymentRequest}
          size={196}
          level="M"
          className={locallyExpired || attempt.isSimulated ? "opacity-25" : undefined}
          aria-label="QR code de la facture de paiement"
          role="img"
        />
        {attempt.isSimulated ? (
          <span className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm font-bold text-warning-foreground uppercase">
            Facture fictive
            <br />
            ne pas payer
          </span>
        ) : locallyExpired ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-sm font-semibold text-muted-foreground">
            <TimerOff className="size-6" aria-hidden />
            Expirée
          </span>
        ) : null}
      </div>

      <div className="min-w-0 space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Montant</dt>
            <dd className="tabular font-semibold text-foreground">{formatMoney(attempt.amount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Équivalent facturé</dt>
            <dd className="tabular font-semibold text-foreground">{formatSats(invoice.amountSats)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Expire dans</dt>
            <dd className={locallyExpired ? "font-semibold text-destructive" : "tabular text-lg font-semibold text-foreground"}>
              {locallyExpired ? "Délai écoulé — vérification auprès du serveur…" : formatCountdown(remainingMs)}
            </dd>
          </div>
        </dl>

        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground" id="invoice-label">
            Facture Lightning
          </p>
          <div className="flex gap-2">
            <code
              aria-labelledby="invoice-label"
              className="min-w-0 flex-1 truncate rounded-lg border bg-muted/60 px-3 py-2.5 font-mono text-xs"
              title={invoice.paymentRequest}
            >
              {invoice.paymentRequest}
            </code>
            <Button type="button" variant="outline" onClick={copy} disabled={locallyExpired} aria-label="Copier la facture">
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            </Button>
          </div>
        </div>
        {attempt.isSimulated ? (
          <p className="rounded-lg bg-warning-surface p-3 text-xs text-warning-foreground">
            Cette facture est générée par le mode démonstration. Elle n&apos;est pas valide et ne doit être payée
            avec aucun portefeuille. Le montant en sats repose sur un taux fictif.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Scannez le QR code avec un portefeuille compatible Lightning ou copiez la facture. Le montant en sats
            est fixé par le serveur au moment de l&apos;émission.
          </p>
        )}
      </div>
    </div>
  )
}
