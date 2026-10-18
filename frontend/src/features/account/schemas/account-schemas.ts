import { z } from "zod"
import { optionalPhoneSchema, passwordSchema } from "@/lib/validations/common"

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { error: "Indiquez votre prénom et votre nom." })
    .max(80, { error: "80 caractères maximum." }),
  phone: optionalPhoneSchema,
})
export type ProfileValues = z.infer<typeof profileSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Saisissez votre mot de passe actuel." }),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    error: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    error: "Le nouveau mot de passe doit être différent de l'actuel.",
    path: ["newPassword"],
  })
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
