"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { TextField } from "@/components/forms/form-fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { getErrorMessage } from "@/lib/api/errors"
import { handleFormError } from "@/lib/forms"
import { useResendVerification, useVerifyEmail } from "../hooks"
import { type ForgotPasswordValues, forgotPasswordSchema } from "../schemas/auth-schemas"

/** Page ouverte depuis le lien reçu par e-mail : confirme l'adresse puis ouvre la session. */
export function VerifyEmailView() {
  const router = useRouter()
  const token = useSearchParams().get("token")
  const verify = useVerifyEmail()
  // Le jeton ne sert qu'une fois : on évite un second envoi (double rendu en développement).
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    verify.mutate(token, {
      onSuccess: () => {
        toast.success("Adresse e-mail confirmée. Bienvenue sur Wóolu !")
        router.replace("/dashboard")
      },
    })
  }, [token, verify, router])

  if (!token || verify.isError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTitle>Lien invalide</AlertTitle>
          <AlertDescription>
            {token ? getErrorMessage(verify.error) : "Ce lien de confirmation est incomplet."}{" "}
            Demandez un nouveau lien ci-dessous.
          </AlertDescription>
        </Alert>
        <ResendVerificationForm />
      </div>
    )
  }

  if (verify.isSuccess) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl bg-brand-50 p-5 text-sm">
        <CheckCircle2 className="size-6 shrink-0 text-brand-700" aria-hidden />
        <p className="font-medium text-foreground">Adresse confirmée. Ouverture de votre espace…</p>
      </div>
    )
  }

  return (
    <div role="status" className="flex items-center gap-3 rounded-xl bg-muted p-5 text-sm">
      <Loader2 className="size-5 shrink-0 animate-spin text-brand-700" aria-hidden />
      <p>Confirmation de votre adresse e-mail…</p>
    </div>
  )
}

function ResendVerificationForm() {
  const resend = useResendVerification()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  if (sentTo) {
    return (
      <div role="status" className="space-y-3 rounded-xl bg-brand-50 p-5 text-sm">
        <p className="font-medium text-foreground">Demande enregistrée</p>
        <p className="text-muted-foreground">
          Si un compte en attente de confirmation est associé à <strong>{sentTo}</strong>, un
          nouveau lien vient d&apos;être envoyé.
        </p>
        <Button asChild variant="outline">
          <Link href="/connexion">Se connecter</Link>
        </Button>
      </div>
    )
  }

  const onSubmit = handleSubmit(({ email }) =>
    resend.mutate(email, {
      onSuccess: () => setSentTo(email),
      onError: (error) => handleFormError(error, setError, ["email"]),
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Recevoir un nouveau lien de confirmation">
      <FieldGroup>
        <TextField
          label="Adresse e-mail du compte"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Button type="submit" size="lg" disabled={resend.isPending} className="w-full">
          {resend.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Recevoir un nouveau lien
        </Button>
      </FieldGroup>
    </form>
  )
}
