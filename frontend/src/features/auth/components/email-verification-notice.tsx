"use client"

import { useEffect, useState } from "react"
import { Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/api/errors"
import { useResendVerification } from "../hooks"

/** Délai avant de pouvoir redemander un lien (le backend limite aussi le nombre d'envois). */
const RESEND_COOLDOWN_MS = 30_000

interface EmailVerificationNoticeProps {
  email: string
  /** « registered » juste après l'inscription, « login » quand la connexion est refusée. */
  reason: "registered" | "login"
  onBack?: () => void
}

/** Le compte existe mais l'adresse n'est pas confirmée : on explique et on propose de renvoyer le lien. */
export function EmailVerificationNotice({ email, reason, onBack }: EmailVerificationNoticeProps) {
  const resend = useResendVerification()
  const [cooldown, setCooldown] = useState(false)

  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(false), RESEND_COOLDOWN_MS)
    return () => clearTimeout(timer)
  }, [cooldown])

  const onResend = () =>
    resend.mutate(email, {
      onSuccess: () => {
        setCooldown(true)
        toast.success(`Un nouveau lien a été envoyé à ${email}.`)
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  return (
    <div role="status" className="space-y-4 rounded-xl bg-brand-50 p-5 text-sm">
      <MailCheck className="size-6 text-brand-700" aria-hidden />
      <div className="space-y-1.5">
        <p className="font-medium text-foreground">
          {reason === "registered" ? "Vérifiez votre boîte mail" : "Adresse e-mail à confirmer"}
        </p>
        <p className="text-muted-foreground">
          {reason === "registered"
            ? "Votre compte est créé. "
            : "Votre compte n'est pas encore activé. "}
          Ouvrez le lien de confirmation envoyé à{" "}
          <strong className="text-foreground">{email}</strong> pour l&apos;activer.
        </p>
        <p className="text-muted-foreground">
          Rien reçu ? Regardez dans les courriers indésirables.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onResend}
          disabled={resend.isPending || cooldown}
        >
          {resend.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {cooldown ? "Lien renvoyé" : "Renvoyer le lien"}
        </Button>
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack}>
            Retour à la connexion
          </Button>
        ) : null}
      </div>
    </div>
  )
}
