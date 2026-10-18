"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Amount } from "@/components/data-display/amount"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/formatters/date"
import { KIND_LABELS, getActionLabel } from "../domain/presentation"
import { getAvailableActions } from "../domain/transitions"
import type { TransactionSummary } from "../types"
import { getCounterpart } from "./counterpart"
import { TransactionStatusBadge } from "./transaction-status-badge"

interface TransactionsTableProps {
  transactions: TransactionSummary[]
  viewerId: string
}

function primaryAction(transaction: TransactionSummary, viewerId: string) {
  return getAvailableActions(transaction, { userId: viewerId }).find((action) => action !== "cancel")
}

export function TransactionsTable({ transactions, viewerId }: TransactionsTableProps) {
  return (
    <>
      {/* Écrans larges : tableau */}
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="pl-4">Référence</TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead>Autre partie</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Créée le</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="pr-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const action = primaryAction(transaction, viewerId)
              return (
                <TableRow key={transaction.id}>
                  <TableCell className="tabular pl-4 text-xs font-medium text-muted-foreground">{transaction.reference}</TableCell>
                  <TableCell className="max-w-56">
                    <Link
                      href={`/transactions/${transaction.id}`}
                      className="block truncate font-medium text-foreground hover:text-brand-700 hover:underline"
                    >
                      {transaction.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">{KIND_LABELS[transaction.kind]}</span>
                  </TableCell>
                  <TableCell className="max-w-40 truncate">{getCounterpart(transaction, viewerId).fullName}</TableCell>
                  <TableCell className="text-right font-medium">
                    <Amount value={transaction.amount} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(transaction.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(transaction.deadline)}</TableCell>
                  <TableCell>
                    <TransactionStatusBadge status={transaction.status} kind={transaction.kind} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button asChild size="sm" variant={action ? "default" : "outline"}>
                      <Link href={`/transactions/${transaction.id}`}>
                        {action ? getActionLabel(action, transaction.kind) : "Voir"}
                        <span className="sr-only"> — {transaction.reference}</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile : cartes */}
      <ul className="space-y-3 md:hidden">
        {transactions.map((transaction) => {
          const action = primaryAction(transaction, viewerId)
          return (
            <li key={transaction.id}>
              <Link
                href={`/transactions/${transaction.id}`}
                className="block rounded-xl border bg-card p-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{transaction.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.reference} · {getCounterpart(transaction, viewerId).fullName}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <TransactionStatusBadge status={transaction.status} kind={transaction.kind} />
                  <Amount value={transaction.amount} className="font-semibold text-brand-900" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Échéance {formatDate(transaction.deadline)}</span>
                  {action ? <span className="font-medium text-brand-700">{getActionLabel(action, transaction.kind)}</span> : null}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
