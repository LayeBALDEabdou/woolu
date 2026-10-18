import { z } from "zod"
import { DISPUTE_REASONS } from "../types"

export const openDisputeSchema = z.object({
  reason: z.enum(DISPUTE_REASONS, { error: "Choisissez le motif de la réclamation." }),
  description: z
    .string()
    .trim()
    .min(30, { error: "Décrivez précisément le problème (30 caractères minimum)." })
    .max(2000, { error: "2 000 caractères maximum." }),
  confirmAccuracy: z.boolean().refine((value) => value, {
    error: "Confirmez que les informations fournies sont exactes.",
  }),
})
export type OpenDisputeValues = z.input<typeof openDisputeSchema>

export const disputeReplySchema = z.object({
  body: z
    .string()
    .trim()
    .min(2, { error: "Votre message est vide." })
    .max(2000, { error: "2 000 caractères maximum." }),
})
export type DisputeReplyValues = z.infer<typeof disputeReplySchema>
