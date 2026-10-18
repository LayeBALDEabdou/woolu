import type { TransactionListParams } from "@/features/transactions/types"

/** Clés TanStack Query centralisées : une seule source pour lecture et invalidation. */
export const queryKeys = {
  session: ["session"] as const,
  dashboard: ["dashboard"] as const,
  transactions: {
    all: ["transactions"] as const,
    list: (params: TransactionListParams) => ["transactions", "list", params] as const,
    detail: (id: string) => ["transactions", "detail", id] as const,
  },
  payments: {
    all: ["payments"] as const,
    byTransaction: (transactionId: string) => ["payments", "transaction", transactionId] as const,
    history: ["payments", "history"] as const,
    attempt: (attemptId: string) => ["payments", "attempt", attemptId] as const,
  },
  disputes: {
    all: ["disputes"] as const,
    list: ["disputes", "list"] as const,
    detail: (id: string) => ["disputes", "detail", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: ["notifications", "list"] as const,
    preferences: ["notifications", "preferences"] as const,
  },
}
