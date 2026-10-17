import { z } from "zod"
import { emailSchema, optionalPhoneSchema, passwordSchema } from "@/lib/validations/common"
import { USER_ROLES } from "../types"

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Le mot de passe est obligatoire." }),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, { error: "Indiquez votre prénom et votre nom." })
      .max(80, { error: "80 caractères maximum." }),
    email: emailSchema,
    phone: optionalPhoneSchema,
    role: z.enum(USER_ROLES, { error: "Choisissez un type de compte." }),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((value) => value, {
      error: "Vous devez accepter les conditions d'utilisation.",
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })
export type RegisterValues = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({ email: emailSchema })
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
