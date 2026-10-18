import { z } from "zod"
import { DELIVERY_METHODS } from "@/features/transactions/types"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `${max} caractères maximum.` })
    .transform((value) => (value === "" ? null : value))

export const startDeliverySchema = z
  .object({
    method: z.enum(DELIVERY_METHODS, { error: "Choisissez le mode de livraison." }),
    carrier: optionalText(80),
    trackingNumber: optionalText(60),
    note: optionalText(500),
  })
  .refine((values) => values.method !== "carrier" || values.carrier !== null, {
    error: "Indiquez le nom du transporteur.",
    path: ["carrier"],
  })
export type StartDeliveryValues = z.input<typeof startDeliverySchema>

export const completeDeliverySchema = z.object({
  note: optionalText(500),
})
export type CompleteDeliveryValues = z.input<typeof completeDeliverySchema>
