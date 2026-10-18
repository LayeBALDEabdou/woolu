"use client"

import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/formatters/money"
import type { PaymentAttempt } from "../types"

export function DepositDisplay({ attempt }: { attempt: PaymentAttempt }) {
  const [copied, setCopied] = useState(false)
  const deposit = attempt.deposit

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(deposit.address)
      setCopied(true)
      toast.success("Adresse de dépôt copiée.")
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Copie impossible. Sélectionnez l’adresse manuellement.")
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
      <div className="relative mx-auto w-fit rounded-xl border bg-white p-3">
        <QRCodeSVG
          value={deposit.address}
          size={196}
          level="M"
          className={attempt.isSimulated ? "opacity-25" : undefined}
          aria-label="QR code de l’adresse de paiement USDC"
          role="img"
        />
        {attempt.isSimulated ? (
          <span className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm font-bold text-warning-foreground uppercase">
            Adresse fictive
            <br />
            ne pas payer
          </span>
        ) : null}
      </div>

      <div className="min-w-0 space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Montant de la transaction</dt>
            <dd className="tabular font-semibold text-foreground">{formatMoney(attempt.amount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Montant exact à envoyer</dt>
            <dd className="tabular font-semibold text-foreground">{deposit.amountUsdc} USDC</dd>
          </div>
          {deposit.receivedUsdc !== "0.000000" ? (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Montant déjà reçu</dt>
              <dd className="tabular font-semibold text-foreground">{deposit.receivedUsdc} USDC</dd>
            </div>
          ) : null}
        </dl>

        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground" id="deposit-address-label">
            Adresse USDC · Solana
          </p>
          <div className="flex gap-2">
            <code
              aria-labelledby="deposit-address-label"
              className="min-w-0 flex-1 truncate rounded-lg border bg-muted/60 px-3 py-2.5 font-mono text-xs"
              title={deposit.address}
            >
              {deposit.address}
            </code>
            <Button
              type="button"
              variant="outline"
              onClick={copyAddress}
              disabled={attempt.isSimulated}
              aria-label="Copier l’adresse de dépôt"
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            </Button>
          </div>
        </div>

        {attempt.isSimulated ? (
          <p className="rounded-lg bg-warning-surface p-3 text-xs text-warning-foreground">
            Cette adresse est fictive et ne doit pas être utilisée pour un vrai transfert.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Depuis votre portefeuille, envoyez exactement le montant indiqué en USDC sur Solana. Le séquestre ne sera
            activé qu&apos;après confirmation du dépôt par Bitnob.
          </p>
        )}
      </div>
    </div>
  )
}
