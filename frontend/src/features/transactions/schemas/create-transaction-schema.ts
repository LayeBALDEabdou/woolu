import { z } from "zod"
import { BUSINESS_RULES } from "@/lib/config/business-rules"
import { todayInAppTimeZone } from "@/lib/formatters/date"
import { formatMoney, parseXofInput, xof } from "@/lib/formatters/money"
import { SUPPORTED_CURRENCIES } from "@/types/common"
import { emailSchema, isSenegalPhone, normalizePhoneInput } from "@/lib/validations/common"
import { TRANSACTION_KINDS, type CreateTransactionInput } from "../types"

const CLAIM_WINDOWS = BUSINESS_RULES.claimWindowOptions.map(String) as ["3", "7", "14"]

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Schéma du formulaire de création. `now` est injectable afin que la validation
 * des échéances soit testable de manière déterministe.
 */
export function createTransactionSchema(now: number = Date.now()) {
  const today = todayInAppTimeZone(now)
  const maxDeadline = addDays(today, BUSINESS_RULES.maxDeadlineDays)
  const { minTransactionAmountXof: min, maxTransactionAmountXof: max } = BUSINESS_RULES

  return z.object({
    title: z
      .string()
      .trim()
      .min(5, { error: "Le titre doit contenir au moins 5 caractères." })
      .max(120, { error: "120 caractères maximum." }),
    kind: z.enum(TRANSACTION_KINDS, { error: "Choisissez le type de transaction." }),
    description: z
      .string()
      .trim()
      .min(20, { error: "Décrivez le produit ou le service (20 caractères minimum)." })
      .max(2000, { error: "2 000 caractères maximum." }),
    clientName: z
      .string()
      .trim()
      .min(2, { error: "Indiquez le nom du client ou bénéficiaire." })
      .max(80, { error: "80 caractères maximum." }),
    clientContact: z
      .string()
      .trim()
      .min(1, { error: "Indiquez l'e-mail ou le téléphone du client." })
      .refine(
        (value) =>
          value.includes("@") ? emailSchema.safeParse(value).success : isSenegalPhone(value),
        { error: "Saisissez une adresse e-mail ou un numéro sénégalais valide." },
      )
      .transform((value) => (value.includes("@") ? value.toLowerCase() : normalizePhoneInput(value))),
    amount: z
      .string()
      .trim()
      .min(1, { error: "Le montant est obligatoire." })
      .transform((value, ctx) => {
        const parsed = parseXofInput(value)
        if (parsed === null) {
          ctx.addIssue({ code: "custom", message: "Montant invalide : saisissez un nombre entier de francs CFA." })
          return z.NEVER
        }
        return parsed
      })
      .refine((value) => value >= min, { error: `Montant minimum : ${formatMoney(xof(min))}.` })
      .refine((value) => value <= max, { error: `Montant maximum : ${formatMoney(xof(max))}.` }),
    currency: z.enum(SUPPORTED_CURRENCIES),
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Choisissez une date limite." })
      .refine((value) => value > today, { error: "La date limite doit être postérieure à aujourd'hui." })
      .refine((value) => value <= maxDeadline, {
        error: `La date limite ne peut dépasser ${BUSINESS_RULES.maxDeadlineDays} jours.`,
      }),
    specialConditions: z
      .string()
      .trim()
      .max(1000, { error: "1 000 caractères maximum." })
      .transform((value) => (value === "" ? null : value)),
    claimWindowDays: z
      .enum(CLAIM_WINDOWS, { error: "Choisissez un délai de réclamation." })
      .transform((value) => Number(value) as CreateTransactionInput["claimWindowDays"]),
    merchantAcceptsTerms: z.boolean().refine((value) => value, {
      error: "Vous devez confirmer et accepter les conditions proposées.",
    }),
  })
}

export type CreateTransactionSchema = ReturnType<typeof createTransactionSchema>
export type CreateTransactionFormValues = z.input<CreateTransactionSchema>
export type CreateTransactionParsed = z.output<CreateTransactionSchema>

export function toCreateTransactionInput(values: CreateTransactionParsed): CreateTransactionInput {
  return { ...values, merchantAcceptsTerms: true }
}

export function defaultCreateTransactionValues(
  kind: CreateTransactionFormValues["kind"],
): CreateTransactionFormValues {
  return {
    title: "",
    kind,
    description: "",
    clientName: "",
    clientContact: "",
    amount: "",
    currency: "XOF",
    deadline: "",
    specialConditions: "",
    claimWindowDays: String(BUSINESS_RULES.defaultClaimWindowDays) as "7",
    merchantAcceptsTerms: false,
  }
}
