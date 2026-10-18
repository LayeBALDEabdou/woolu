"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { CheckCircle2, Loader2 } from "lucide-react"
import { PasswordField } from "@/components/forms/form-fields"
import { useServices } from "@/components/providers/services-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { handleFormError } from "@/lib/forms"
import { type ResetPasswordValues, resetPasswordSchema } from "../schemas/auth-schemas"

export function ResetPasswordForm() {
  const { auth } = useServices()
  const token = useSearchParams().get("token")
  const [done, setDone] = useState(false)
  const reset = useMutation({ mutationFn: (input: { token: string; password: string }) => auth.resetPassword(input) })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Lien invalide</AlertTitle>
        <AlertDescription>
          Ce lien de réinitialisation est incomplet ou a expiré.{" "}
          <Link href="/mot-de-passe-oublie" className="underline">
            Demander un nouveau lien
          </Link>
          .
        </AlertDescription>
      </Alert>
    )
  }

  if (done) {
    return (
      <div role="status" className="space-y-3 rounded-xl bg-brand-50 p-5 text-sm">
        <CheckCircle2 className="size-6 text-brand-700" aria-hidden />
        <p className="font-medium text-foreground">Mot de passe mis à jour</p>
        <Button asChild>
          <Link href="/connexion">Se connecter</Link>
        </Button>
      </div>
    )
  }

  const onSubmit = handleSubmit(({ password }) =>
    reset.mutate(
      { token, password },
      {
        onSuccess: () => setDone(true),
        onError: (error) => handleFormError(error, setError, ["password"]),
      },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Réinitialisation du mot de passe">
      <FieldGroup>
        <PasswordField
          label="Nouveau mot de passe"
          autoComplete="new-password"
          description="10 caractères minimum, avec au moins une lettre et un chiffre."
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordField
          label="Confirmation"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" size="lg" disabled={reset.isPending} className="w-full">
          {reset.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Enregistrer le nouveau mot de passe
        </Button>
      </FieldGroup>
    </form>
  )
}
