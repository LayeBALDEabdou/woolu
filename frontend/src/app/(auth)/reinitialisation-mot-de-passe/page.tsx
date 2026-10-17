import type { Metadata } from "next"
import { Suspense } from "react"
import { LoadingRows } from "@/components/feedback/states"
import { AuthCard } from "@/components/layout/auth-card"
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form"

export const metadata: Metadata = { title: "Réinitialiser le mot de passe" }

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Nouveau mot de passe" description="Choisissez un mot de passe que vous n'utilisez pas ailleurs.">
      <Suspense fallback={<LoadingRows rows={2} />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  )
}
