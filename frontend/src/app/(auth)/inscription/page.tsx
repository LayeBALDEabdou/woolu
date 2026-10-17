import type { Metadata } from "next"
import Link from "next/link"
import { AuthCard } from "@/components/layout/auth-card"
import { RegisterForm } from "@/features/auth/components/register-form"

export const metadata: Metadata = { title: "Créer un compte" }

export default function RegisterPage() {
  return (
    <AuthCard
      className="max-w-2xl"
      title="Créer un compte"
      description="Choisissez votre type de compte. Vous pourrez compléter votre profil plus tard."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="font-medium text-brand-700 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  )
}
