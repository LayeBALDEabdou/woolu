import { z } from "zod"

/** Numéros sénégalais : 9 chiffres commençant par 7 (mobile) ou 3 (fixe), indicatif +221 facultatif. */
const SENEGAL_PHONE = /^(?:\+?221)?[37]\d{8}$/

export function normalizePhoneInput(value: string): string {
  return value.replace(/[\s.\-()]/g, "")
}

export function isSenegalPhone(value: string): boolean {
  return SENEGAL_PHONE.test(normalizePhoneInput(value))
}

export const emailSchema = z
  .string()
  .trim()
  .min(1, { error: "L'adresse e-mail est obligatoire." })
  .pipe(z.email({ error: "Adresse e-mail invalide." }))

export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || isSenegalPhone(value), {
    error: "Numéro invalide. Exemple : 77 123 45 67.",
  })

/**
 * Règle de mot de passe côté interface (le backend applique sa propre politique) :
 * 10 caractères minimum, au moins une lettre et un chiffre.
 */
export const passwordSchema = z
  .string()
  .min(10, { error: "Le mot de passe doit contenir au moins 10 caractères." })
  .max(128, { error: "Le mot de passe est trop long." })
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    error: "Le mot de passe doit contenir au moins une lettre et un chiffre.",
  })
