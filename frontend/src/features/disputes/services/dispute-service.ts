import type { HttpClient } from "@/lib/api/http-client"
import type { Dispute, OpenDisputeInput } from "../types"

/** Les décisions (libération / remboursement) ne sont pas exposées ici : elles relèvent du backend. */
export interface DisputeService {
  list(): Promise<Dispute[]>
  get(id: string): Promise<Dispute>
  open(input: OpenDisputeInput): Promise<Dispute>
  reply(id: string, body: string): Promise<Dispute>
}

export function createHttpDisputeService(http: HttpClient): DisputeService {
  return {
    list: () => http.get("/api/disputes"),
    get: (id) => http.get(`/api/disputes/${encodeURIComponent(id)}`),
    open: (input) => http.post("/api/disputes", input),
    reply: (id, body) => http.post(`/api/disputes/${encodeURIComponent(id)}/messages`, { body }),
  }
}
