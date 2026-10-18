import type { Metadata } from "next"
import { Suspense } from "react"
import { LoadingRows } from "@/components/feedback/states"
import { AuthCard } from "@/components/layout/auth-card"
import { VerifyEmailView } from "@/features/auth/components/verify-email-view"

export const metadata: Metadata = { title: "Confirmation de l'adresse e-mail" }

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Confirmation de l'adresse"
      description="Une dernière étape pour activer votre compte."
    >
      {/* Le jeton est lu dans l'URL (?token=…) : la vue est rendue côté client. */}
      <Suspense fallback={<LoadingRows rows={2} />}>
        <VerifyEmailView />
      </Suspense>
    </AuthCard>
  )
}
