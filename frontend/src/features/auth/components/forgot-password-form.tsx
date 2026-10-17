"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Loader2, MailCheck } from "lucide-react"
import { TextField } from "@/components/forms/form-fields"
import { useServices } from "@/components/providers/services-provider"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { handleFormError } from "@/lib/forms"
import { type ForgotPasswordValues, forgotPasswordSchema } from "../schemas/auth-schemas"

export function ForgotPasswordForm() {
  const { auth, demo } = useServices()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const request = useMutation({ mutationFn: (email: string) => auth.requestPasswordReset(email) })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } })

  if (sentTo) {
    return (
      <div role="status" className="space-y-3 rounded-xl bg-brand-50 p-5 text-sm">
        <MailCheck className="size-6 text-brand-700" aria-hidden />
        <p className="font-medium text-foreground">Demande enregistrée</p>
        <p className="text-muted-foreground">
          Si un compte est associé à <strong>{sentTo}</strong>, un lien de réinitialisation valable
          pour une durée limitée vient d&apos;être envoyé.
        </p>
        {demo ? (
          <p className="text-xs text-warning-foreground">
            Mode démonstration : aucun e-mail n&apos;est réellement envoyé.
          </p>
        ) : null}
      </div>
    )
  }

  const onSubmit = handleSubmit(({ email }) =>
    request.mutate(email, {
      onSuccess: () => setSentTo(email),
      onError: (error) => handleFormError(error, setError, ["email"]),
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Mot de passe oublié">
      <FieldGroup>
        <TextField
          label="Adresse e-mail du compte"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Button type="submit" size="lg" disabled={request.isPending} className="w-full">
          {request.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Recevoir un lien de réinitialisation
        </Button>
      </FieldGroup>
    </form>
  )
}
