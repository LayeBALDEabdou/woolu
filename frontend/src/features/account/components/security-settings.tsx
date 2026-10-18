"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Loader2, LogOut } from "lucide-react"
import { toast } from "sonner"
import { PasswordField } from "@/components/forms/form-fields"
import { useServices } from "@/components/providers/services-provider"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import type { ChangePasswordInput } from "@/features/auth/types"
import { useLogout } from "@/features/auth/hooks"
import { getErrorMessage } from "@/lib/api/errors"
import { handleFormError } from "@/lib/forms"
import { type ChangePasswordValues, changePasswordSchema } from "../schemas/account-schemas"

export function SecuritySettings() {
  const router = useRouter()
  const { auth, demo } = useServices()
  const logout = useLogout()
  const changePassword = useMutation({ mutationFn: (input: ChangePasswordInput) => auth.changePassword(input) })
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  const onSubmit = handleSubmit(({ currentPassword, newPassword }) =>
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success(demo ? "Mode démo : aucun mot de passe n'est enregistré." : "Mot de passe modifié.")
          reset()
        },
        onError: (error) => handleFormError(error, setError, ["currentPassword", "newPassword"]),
      },
    ),
  )

  const onLogout = () =>
    logout.mutate(undefined, {
      onSuccess: () => router.replace("/connexion"),
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  return (
    <div className="space-y-8">
      <section aria-labelledby="password-title" className="max-w-xl space-y-4">
        <h3 id="password-title" className="font-medium">
          Changer de mot de passe
        </h3>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <PasswordField
              label="Mot de passe actuel"
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              {...register("currentPassword")}
            />
            <PasswordField
              label="Nouveau mot de passe"
              autoComplete="new-password"
              description="10 caractères minimum, avec au moins une lettre et un chiffre."
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />
            <PasswordField
              label="Confirmation"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <div>
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Modifier le mot de passe
              </Button>
            </div>
          </FieldGroup>
        </form>
      </section>

      <section aria-labelledby="sessions-title" className="max-w-xl space-y-3 border-t pt-6">
        <h3 id="sessions-title" className="font-medium">
          Session
        </h3>
        <p className="text-sm text-muted-foreground">
          Déconnectez-vous si vous utilisez un appareil partagé. La double authentification sera proposée
          ultérieurement.
        </p>
        <Button variant="outline" onClick={onLogout} disabled={logout.isPending}>
          {logout.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
          Se déconnecter
        </Button>
      </section>
    </div>
  )
}
