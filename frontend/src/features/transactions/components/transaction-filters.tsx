"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PERIOD_LABELS, SORT_LABELS, STATUS_PRESENTATION } from "../domain/presentation"
import {
  TRANSACTION_PERIODS,
  TRANSACTION_SORTS,
  TRANSACTION_STATUSES,
  type TransactionPeriod,
  type TransactionSort,
  type TransactionStatus,
} from "../types"

export interface TransactionFiltersValue {
  search: string
  status: TransactionStatus | "all"
  period: TransactionPeriod
  sort: TransactionSort
}

interface TransactionFiltersProps {
  value: TransactionFiltersValue
  onChange: (next: TransactionFiltersValue) => void
}

export function TransactionFilters({ value, onChange }: TransactionFiltersProps) {
  const update = <K extends keyof TransactionFiltersValue>(key: K, next: TransactionFiltersValue[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="transaction-search">Rechercher</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="transaction-search"
            type="search"
            placeholder="Référence, titre, nom…"
            className="pl-9"
            value={value.search}
            onChange={(event) => update("search", event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="transaction-status">Statut</Label>
        <Select value={value.status} onValueChange={(next) => update("status", next as TransactionFiltersValue["status"])}>
          <SelectTrigger id="transaction-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {TRANSACTION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_PRESENTATION[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="transaction-period">Période</Label>
        <Select value={value.period} onValueChange={(next) => update("period", next as TransactionPeriod)}>
          <SelectTrigger id="transaction-period" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSACTION_PERIODS.map((period) => (
              <SelectItem key={period} value={period}>
                {PERIOD_LABELS[period]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="transaction-sort">Trier par</Label>
        <Select value={value.sort} onValueChange={(next) => update("sort", next as TransactionSort)}>
          <SelectTrigger id="transaction-sort" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSACTION_SORTS.map((sort) => (
              <SelectItem key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
