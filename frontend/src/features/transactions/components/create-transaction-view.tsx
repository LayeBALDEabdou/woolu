"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import { EmptyState } from "@/components/feedback/states"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { useCurrentUser } from "@/features/auth/hooks"
import { isMerchantRole } from "@/features/auth/roles"
import { CreateTransactionForm } from "./create-transaction-form"

export function CreateTransactionView() {
  const user = useCurrentUser()

  return (
    <>
      <PageHeader
        title="Nouvelle transaction"
        description="Définissez les conditions de la vente ou de la prestation. Le client les acceptera avant de payer."
        back={{ href: "/transactions", label: "Transactions" }}
      />
      {isMerchantRole(user.role) ? (
        <CreateTransactionForm role={user.role} />
      ) : (
        <EmptyState
          icon={<Lock className="size-5" aria-hidden />}
          title="Réservé aux vendeurs et prestataires"
          description="En tant que client, vous recevez les propositions de transaction : vous n'avez pas à les créer."
          action={
            <Button asChild variant="outline">
              <Link href="/transactions">Voir mes transactions</Link>
            </Button>
          }
        />
      )}
    </>
  )
}
