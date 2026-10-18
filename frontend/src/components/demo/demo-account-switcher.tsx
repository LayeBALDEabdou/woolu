"use client"

import { useRouter } from "next/navigation"
import { FlaskConical } from "lucide-react"
import { toast } from "sonner"
import { useServices } from "@/components/providers/services-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSession, useSwitchDemoAccount } from "@/features/auth/hooks"
import { ROLE_LABELS } from "@/features/auth/roles"
import { getErrorMessage } from "@/lib/api/errors"

/** Permet de jouer successivement le rôle du vendeur et du client pendant une démonstration. */
export function DemoAccountSwitcher() {
  const router = useRouter()
  const { demo } = useServices()
  const { data: session } = useSession()
  const switchAccount = useSwitchDemoAccount()
  if (!demo || !session) return null

  const onChange = (userId: string) => {
    if (userId === session.user.id) return
    switchAccount.mutate(userId, {
      onSuccess: (next) => {
        toast.success(`Connecté en tant que ${next.user.fullName} (démo).`)
        router.push("/dashboard")
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-warning/40 bg-warning-surface text-warning-foreground hover:bg-warning-surface/70"
          title="Données fictives : aucun paiement réel n'est effectué"
          data-testid="demo-account-switcher"
        >
          <FlaskConical aria-hidden />
          <span className="sm:hidden">Démo</span>
          <span className="hidden sm:inline">Changer de compte démo</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="font-normal">
          <span className="block font-medium text-foreground">Comptes fictifs</span>
          <span className="block text-xs text-muted-foreground">Mode démonstration : aucun paiement réel.</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={session.user.id} onValueChange={onChange}>
          {demo.listAccounts().map((account) => (
            <DropdownMenuRadioItem key={account.userId} value={account.userId} disabled={switchAccount.isPending}>
              <span className="flex flex-col">
                <span className="font-medium">
                  {account.fullName} · {ROLE_LABELS[account.role]}
                </span>
                <span className="text-xs text-muted-foreground">{account.description}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
