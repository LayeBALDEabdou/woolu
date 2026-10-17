"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, LogOut, Settings } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLogout, useSession } from "@/features/auth/hooks"
import { ROLE_LABELS } from "@/features/auth/roles"
import { getErrorMessage } from "@/lib/api/errors"

export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function UserMenu() {
  const router = useRouter()
  const { data: session } = useSession()
  const logout = useLogout()
  if (!session) return null
  const { user } = session

  const onLogout = () =>
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.success("Vous êtes déconnecté.")
        router.replace("/connexion")
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2" aria-label={`Menu du compte de ${user.fullName}`}>
          <Avatar className="size-8">
            <AvatarFallback className="bg-brand-100 text-xs font-semibold text-brand-800">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-36 truncate text-sm font-medium sm:block">{user.fullName}</span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium text-foreground">{user.fullName}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          <span className="mt-1 block text-xs text-brand-700">Compte {ROLE_LABELS[user.role].toLowerCase()}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/parametres">
            <Settings aria-hidden />
            Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLogout} disabled={logout.isPending}>
          <LogOut aria-hidden />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
