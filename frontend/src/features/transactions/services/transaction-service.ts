import type { HttpClient } from "@/lib/api/http-client"
import type { Paginated } from "@/types/common"
import type {
  CreateTransactionInput,
  DashboardSummary,
  Transaction,
  TransactionListParams,
  TransactionSummary,
} from "../types"

export interface TransactionService {
  list(params: TransactionListParams): Promise<Paginated<TransactionSummary>>
  get(id: string): Promise<Transaction>
  create(input: CreateTransactionInput): Promise<Transaction>
  sendToClient(id: string): Promise<Transaction>
  acceptTerms(id: string): Promise<Transaction>
  refuseTerms(id: string, reason: string | null): Promise<Transaction>
  cancel(id: string, reason: string | null): Promise<Transaction>
  getDashboardSummary(): Promise<DashboardSummary>
}

export function createHttpTransactionService(http: HttpClient): TransactionService {
  const path = (id: string) => `/api/transactions/${encodeURIComponent(id)}`
  return {
    list: (params) => http.get("/api/transactions", { query: { ...params } }),
    get: (id) => http.get(path(id)),
    create: (input) => http.post("/api/transactions", input),
    sendToClient: (id) => http.post(`${path(id)}/send`),
    acceptTerms: (id) => http.post(`${path(id)}/accept`),
    refuseTerms: (id, reason) => http.post(`${path(id)}/refuse`, { reason }),
    cancel: (id, reason) => http.post(`${path(id)}/cancel`, { reason }),
    getDashboardSummary: () => http.get("/api/dashboard/summary"),
  }
}
