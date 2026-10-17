import type { Metadata } from "next"
import Link from "next/link"
import { AuthCard } from "@/components/layout/auth-card"
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form"

export const metadata: Metadata = { title: "Mot de passe oublié" }

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Indiquez l'adresse e-mail de votre compte pour recevoir un lien de réinitialisation."
      footer={
        <Link href="/connexion" className="font-medium text-brand-700 hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
