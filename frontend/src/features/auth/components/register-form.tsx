"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { PasswordField, TextField } from "@/components/forms/form-fields"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { handleFormError } from "@/lib/forms"
import { useRegister } from "../hooks"
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "../roles"
import { type RegisterValues, registerSchema } from "../schemas/auth-schemas"
import { USER_ROLES } from "../types"

export function RegisterForm() {
  const router = useRouter()
  const registerMutation = useRegister()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: "client",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  })

  const onSubmit = handleSubmit(({ fullName, email, phone, role, password }) =>
    registerMutation.mutate(
      { fullName, email, phone: phone === "" ? null : phone, role, password },
      {
        onSuccess: () => router.replace("/dashboard"),
        onError: (error) => handleFormError(error, setError, ["fullName", "email", "phone", "password"]),
      },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Inscription">
      <FieldGroup>
        <FieldSet>
          <FieldLegend variant="label">Type de compte</FieldLegend>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-3">
                {USER_ROLES.map((role) => (
                  <FieldLabel key={role} htmlFor={`role-${role}`}>
                    <Field orientation="horizontal">
                      <RadioGroupItem value={role} id={`role-${role}`} className="mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="block text-sm font-semibold">{ROLE_LABELS[role]}</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {ROLE_DESCRIPTIONS[role]}
                        </span>
                      </div>
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
            )}
          />
          {errors.role ? <FieldError>{errors.role.message}</FieldError> : null}
        </FieldSet>

        <TextField label="Prénom et nom" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Adresse e-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <TextField
            label="Téléphone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="77 123 45 67"
            optional
            error={errors.phone?.message}
            {...register("phone")}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <PasswordField
            label="Mot de passe"
            autoComplete="new-password"
            description="10 caractères minimum, avec au moins une lettre et un chiffre."
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordField
            label="Confirmation du mot de passe"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>

        <Controller
          control={control}
          name="acceptTerms"
          render={({ field }) => (
            <Field orientation="horizontal" data-invalid={errors.acceptTerms ? true : undefined}>
              <Checkbox
                id="acceptTerms"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-invalid={errors.acceptTerms ? true : undefined}
                aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
              />
              <FieldLabel htmlFor="acceptTerms" className="font-normal">
                J&apos;ai lu les&nbsp;
                <Link href="/securite" className="font-medium text-brand-700 underline" target="_blank">
                  règles de sécurité
                </Link>
                &nbsp;et j&apos;accepte les conditions d&apos;utilisation.
              </FieldLabel>
            </Field>
          )}
        />
        {errors.acceptTerms ? <FieldError id="acceptTerms-error">{errors.acceptTerms.message}</FieldError> : null}

        <Button type="submit" size="lg" disabled={registerMutation.isPending} className="w-full">
          {registerMutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Créer mon compte
        </Button>
      </FieldGroup>
    </form>
  )
}
