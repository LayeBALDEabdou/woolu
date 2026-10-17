import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { LoadingRows } from "@/components/feedback/states"
import { AuthCard } from "@/components/layout/auth-card"
import { LoginForm } from "@/features/auth/components/login-form"

export const metadata: Metadata = { title: "Connexion" }

export default function LoginPage() {
  return (
    <AuthCard
      title="Connexion"
      description="Accédez à vos transactions, paiements et réclamations."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-brand-700 hover:underline">
            Créer un compte
          </Link>
        </>
      }
    >
      {/* Le formulaire lit le paramètre ?redirect : il est rendu côté client. */}
      <Suspense fallback={<LoadingRows rows={2} />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}
