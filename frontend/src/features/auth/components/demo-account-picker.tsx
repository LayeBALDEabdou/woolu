"use client"

import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useServices } from "@/components/providers/services-provider"
import { getErrorMessage } from "@/lib/api/errors"
import { useSwitchDemoAccount } from "../hooks"
import { ROLE_LABELS } from "../roles"

/** Connexion rapide aux comptes fictifs. Absent hors mode démonstration. */
export function DemoAccountPicker({ onSwitched }: { onSwitched: () => void }) {
  const { demo } = useServices()
  const switchAccount = useSwitchDemoAccount()
  if (!demo) return null

  const accounts = demo.listAccounts()

  return (
    <section
      aria-labelledby="demo-accounts"
      className="rounded-xl border border-dashed border-warning/40 bg-warning-surface/60 p-4"
    >
      <h2 id="demo-accounts" className="text-sm font-semibold text-warning-foreground">
        Comptes de démonstration
      </h2>
      <p className="mb-3 text-xs text-warning-foreground/90">
        Utilisateurs fictifs. En mode démo, le mot de passe n&apos;est ni vérifié ni enregistré.
      </p>
      <ul className="grid gap-2">
        {accounts.map((account) => (
          <li key={account.userId}>
            <button
              type="button"
              disabled={switchAccount.isPending}
              onClick={() =>
                switchAccount.mutate(account.userId, {
                  onSuccess: onSwitched,
                  onError: (error) => toast.error(getErrorMessage(error)),
                })
              }
              className="flex w-full items-center justify-between gap-3 rounded-lg bg-card px-3 py-2.5 text-left ring-1 ring-border transition-colors hover:bg-brand-50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {account.fullName}{" "}
                  <span className="font-normal text-muted-foreground">· {ROLE_LABELS[account.role]}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">{account.description}</span>
              </span>
              {switchAccount.isPending && switchAccount.variables === account.userId ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
