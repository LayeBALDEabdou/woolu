"use client"

import { PackageCheck } from "lucide-react"
import { toast } from "sonner"
import { Amount } from "@/components/data-display/amount"
import { DetailList } from "@/components/data-display/detail-list"
import { ConfirmDialog } from "@/components/feedback/confirm-dialog"
import { Button } from "@/components/ui/button"
import { getActionLabel } from "@/features/transactions/domain/presentation"
import type { Transaction } from "@/features/transactions/types"
import { getErrorMessage } from "@/lib/api/errors"
import { useConfirmReceipt } from "../hooks"

/** Confirmation définitive de réception : récapitulatif + case d'acquiescement obligatoire. */
export function ConfirmReceiptDialog({ transaction }: { transaction: Transaction }) {
  const confirmReceipt = useConfirmReceipt(transaction.id)
  const label = getActionLabel("confirm_receipt", transaction.kind)
  const isService = transaction.kind === "service"

  return (
    <ConfirmDialog
      trigger={
        <Button size="lg">
          <PackageCheck aria-hidden />
          {label}
        </Button>
      }
      title={isService ? "Confirmer la bonne réalisation du service" : "Confirmer la réception"}
      description="Cette confirmation est définitive : elle autorise la libération des fonds au vendeur ou prestataire. Vous ne pourrez plus ouvrir de réclamation ensuite."
      confirmLabel="Je confirme"
      acknowledgement={
        isService
          ? "J'ai vérifié la prestation et elle est conforme aux conditions acceptées."
          : "J'ai reçu le produit, je l'ai vérifié et il est conforme aux conditions acceptées."
      }
      pending={confirmReceipt.isPending}
      onConfirm={() =>
        confirmReceipt.mutateAsync().then(
          () => toast.success("Réception confirmée. La libération des fonds est autorisée."),
          (error: unknown) => {
            toast.error(getErrorMessage(error))
            throw error
          },
        )
      }
    >
      <DetailList
        className="rounded-lg border p-3 sm:grid-cols-2"
        items={[
          { label: "Transaction", value: `${transaction.reference} · ${transaction.title}`, wide: true },
          { label: isService ? "Prestataire" : "Vendeur", value: transaction.merchant.fullName },
          { label: "Montant libéré", value: <Amount value={transaction.amount} className="font-semibold" /> },
        ]}
      />
    </ConfirmDialog>
  )
}
