"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { PasswordField, TextField } from "@/components/forms/form-fields"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { handleFormError, safeRedirectPath } from "@/lib/forms"
import { useLogin } from "../hooks"
import { type LoginValues, loginSchema } from "../schemas/auth-schemas"
import { DemoAccountPicker } from "./demo-account-picker"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = safeRedirectPath(searchParams.get("redirect"))
  const login = useLogin()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } })

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: () => router.replace(redirectTo),
      onError: (error) => handleFormError(error, setError, ["email", "password"]),
    }),
  )

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} noValidate aria-label="Connexion">
        <FieldGroup>
          <TextField
            label="Adresse e-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <PasswordField
            label="Mot de passe"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="-mt-2 text-right">
            <Link href="/mot-de-passe-oublie" className="text-sm font-medium text-brand-700 hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <Button type="submit" size="lg" disabled={login.isPending} className="w-full">
            {login.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Se connecter
          </Button>
        </FieldGroup>
      </form>
      <DemoAccountPicker onSwitched={() => router.replace(redirectTo)} />
    </div>
  )
}
