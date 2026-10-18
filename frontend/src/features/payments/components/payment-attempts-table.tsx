import Link from "next/link"
import { Amount } from "@/components/data-display/amount"
import { StatusBadge } from "@/components/data-display/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime } from "@/lib/formatters/date"
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_PRESENTATION } from "../presentation"
import type { PaymentAttempt } from "../types"

interface PaymentAttemptsTableProps {
  attempts: PaymentAttempt[]
  /** Affiche la colonne transaction (vue historique globale). */
  showTransaction?: boolean
}

export function PaymentAttemptsTable({ attempts, showTransaction = false }: PaymentAttemptsTableProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="pl-4">Date</TableHead>
              {showTransaction ? <TableHead>Transaction</TableHead> : null}
              <TableHead>Méthode</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="pr-4">Détail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.map((attempt) => (
              <TableRow key={attempt.id}>
                <TableCell className="pl-4 text-muted-foreground">{formatDateTime(attempt.createdAt)}</TableCell>
                {showTransaction ? (
                  <TableCell className="max-w-56">
                    <Link
                      href={`/transactions/${attempt.transactionId}`}
                      className="block truncate font-medium hover:text-brand-700 hover:underline"
                    >
                      {attempt.transactionTitle}
                    </Link>
                    <span className="tabular text-xs text-muted-foreground">{attempt.transactionReference}</span>
                  </TableCell>
                ) : null}
                <TableCell>{PAYMENT_METHOD_LABELS[attempt.method]}</TableCell>
                <TableCell className="text-right font-medium">
                  <Amount value={attempt.amount} />
                </TableCell>
                <TableCell>
                  <StatusBadge tone={PAYMENT_STATUS_PRESENTATION[attempt.status].tone}>
                    {PAYMENT_STATUS_PRESENTATION[attempt.status].label}
                  </StatusBadge>
                  {attempt.isSimulated ? <span className="ml-2 text-xs text-warning-foreground">fictif</span> : null}
                </TableCell>
                <TableCell className="pr-4 text-xs text-muted-foreground">
                  {attempt.confirmedAt
                    ? `Confirmé le ${formatDateTime(attempt.confirmedAt)}`
                    : (attempt.failureReason ?? "—")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="space-y-3 md:hidden">
        {attempts.map((attempt) => (
          <li key={attempt.id} className="rounded-xl border bg-card p-4 text-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <StatusBadge tone={PAYMENT_STATUS_PRESENTATION[attempt.status].tone}>
                {PAYMENT_STATUS_PRESENTATION[attempt.status].label}
              </StatusBadge>
              <Amount value={attempt.amount} className="font-semibold" />
            </div>
            {showTransaction ? (
              <Link href={`/transactions/${attempt.transactionId}`} className="block font-medium hover:underline">
                {attempt.transactionTitle}
              </Link>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {formatDateTime(attempt.createdAt)} · {PAYMENT_METHOD_LABELS[attempt.method]}
              {attempt.isSimulated ? " · fictif" : ""}
            </p>
            {attempt.failureReason ? <p className="mt-1 text-xs text-destructive">{attempt.failureReason}</p> : null}
          </li>
        ))}
      </ul>
    </>
  )
}
