"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { TextField } from "@/components/forms/form-fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { useCurrentUser, useUpdateProfile } from "@/features/auth/hooks"
import { ROLE_LABELS } from "@/features/auth/roles"
import { handleFormError } from "@/lib/forms"
import { type ProfileValues, profileSchema } from "../schemas/account-schemas"

export function ProfileForm() {
  const user = useCurrentUser()
  const updateProfile = useUpdateProfile()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName, phone: user.phone ?? "" },
  })

  const onSubmit = handleSubmit((values) =>
    updateProfile.mutate(
      { fullName: values.fullName, phone: values.phone === "" ? null : values.phone },
      {
        onSuccess: (updated) => {
          toast.success("Profil mis à jour.")
          reset({ fullName: updated.fullName, phone: updated.phone ?? "" })
        },
        onError: (error) => handleFormError(error, setError, ["fullName", "phone"]),
      },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Profil et coordonnées" className="max-w-xl">
      <FieldGroup>
        <TextField label="Prénom et nom" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
        <TextField
          label="Adresse e-mail"
          type="email"
          value={user.email}
          readOnly
          disabled
          description="La modification de l'adresse e-mail nécessite une vérification et n'est pas encore disponible."
        />
        <TextField
          label="Téléphone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          optional
          error={errors.phone?.message}
          {...register("phone")}
        />
        <TextField label="Type de compte" value={ROLE_LABELS[user.role]} readOnly disabled />
        <div>
          <Button type="submit" disabled={updateProfile.isPending || !isDirty}>
            {updateProfile.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Enregistrer
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
