import type { User } from "@/features/auth/types"
import type { Dispute } from "@/features/disputes/types"
import type { AppNotification, NotificationPreferences } from "@/features/notifications/types"
import type { PaymentAttempt } from "@/features/payments/types"
import type { Transaction } from "@/features/transactions/types"
import { createSeedState } from "./seed"

/**
 * État du backend simulé, persisté dans le localStorage du navigateur.
 * ⚠ DONNÉES FICTIVES — aucun mot de passe n'y est stocké, aucun fonds réel n'est concerné.
 */
export interface DemoState {
  version: typeof STATE_VERSION
  users: User[]
  sessionUserId: string | null
  transactions: Transaction[]
  payments: PaymentAttempt[]
  disputes: Dispute[]
  notifications: Array<AppNotification & { userId: string }>
  preferences: Record<string, NotificationPreferences>
  counters: { transaction: number; dispute: number }
}

const STATE_VERSION = 1
const STORAGE_KEY = "woolu.demo.state.v1"

/** Repli en mémoire quand le localStorage est indisponible (navigation privée, rendu serveur). */
let memoryState: DemoState | null = null

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

function save(state: DemoState): void {
  memoryState = state
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota dépassé ou stockage bloqué : l'état reste en mémoire.
  }
}

/**
 * Lit l'état courant. Le stockage est relu à chaque appel pour refléter les
 * changements faits dans un autre onglet. Le résultat ne doit pas être muté.
 */
export function readState(): DemoState {
  const store = storage()
  const raw = store?.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed.version === STATE_VERSION) return parsed
    } catch {
      // État corrompu : on repart des données de démonstration.
    }
  } else if (!store && memoryState) {
    return memoryState
  }
  const seeded = createSeedState(Date.now())
  save(seeded)
  return seeded
}

/** Applique une mutation sur une copie de l'état puis persiste le résultat (tout ou rien). */
export function mutateState<T>(mutator: (draft: DemoState) => T): T {
  const draft = structuredClone(readState())
  const result = mutator(draft)
  save(draft)
  return result
}

export function resetState(): void {
  memoryState = null
  storage()?.removeItem(STORAGE_KEY)
}
