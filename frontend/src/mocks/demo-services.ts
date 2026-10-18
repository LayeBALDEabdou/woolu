/**
 * Implémentations de démonstration des services, branchées sur le backend simulé.
 * Mêmes interfaces que les services HTTP : les composants ne voient aucune différence.
 */
import { ApiError } from "@/lib/api/errors"
import type { AppServices, DemoSimulator } from "@/lib/services/types"
import * as backend from "./demo-backend"
import { DEMO_ACCOUNT_DESCRIPTIONS, DEMO_USERS, defaultPreferences } from "./seed"
import { type DemoState, mutateState, readState, resetState } from "./store"
import { simulateLatency } from "./utils"

/**
 * Exécute une opération du backend simulé : latence réseau, mutation atomique de l'état
 * (rien n'est persisté si l'opération lève une erreur) et copie défensive du résultat.
 */
async function withState<T>(operation: (state: DemoState, now: number) => T): Promise<T> {
  await simulateLatency()
  const result = mutateState((state) => operation(state, Date.now()))
  return result === undefined ? result : structuredClone(result)
}

export function createDemoServices(): AppServices {
  const demo: DemoSimulator = {
    listAccounts() {
      const state = readState()
      return Object.values(DEMO_USERS).flatMap((id) => {
        const user = state.users.find((u) => u.id === id)
        return user
          ? [{ userId: user.id, fullName: user.fullName, email: user.email, role: user.role, description: DEMO_ACCOUNT_DESCRIPTIONS[id] ?? "" }]
          : []
      })
    },
    switchAccount: (userId) =>
      withState((state) => {
        const user = state.users.find((u) => u.id === userId)
        if (!user) throw new ApiError("NOT_FOUND", "Compte de démonstration introuvable.")
        state.sessionUserId = user.id
        return backend.toSession(user)
      }),
    confirmPayment: (id) => withState((state, now) => backend.simulatePaymentConfirmed(state, id, now)),
    failPayment: (id) => withState((state, now) => backend.simulatePaymentFailed(state, id, now)),
    expirePayment: (id) => withState((state, now) => backend.simulatePaymentExpired(state, id, now)),
    requestDisputeInformation: (id) =>
      withState((state, now) => backend.simulateDisputeInformationRequest(state, id, now)),
    startDisputeReview: (id) => withState((state, now) => backend.simulateDisputeReview(state, id, now)),
    decideDispute: (id, outcome) =>
      withState((state, now) => backend.simulateDisputeDecision(state, id, outcome, now)),
    async reset() {
      await simulateLatency()
      resetState()
    },
  }

  return {
    auth: {
      getSession: () =>
        withState((state) => {
          const user = state.users.find((u) => u.id === state.sessionUserId)
          return user ? backend.toSession(user) : null
        }),
      // Mode démo : le mot de passe n'est ni vérifié ni conservé.
      login: (input) => withState((state) => backend.login(state, input.email)),
      // Mode démo : aucun e-mail n'est envoyé, le compte est actif tout de suite.
      register: (input) =>
        withState((state, now) => ({ status: "authenticated" as const, session: backend.register(state, input, now) })),
      verifyEmail: async () => {
        await simulateLatency()
        throw new ApiError("VALIDATION", "La confirmation par e-mail n'existe pas en mode démonstration.")
      },
      resendVerification: () => simulateLatency(),
      logout: () =>
        withState((state) => {
          state.sessionUserId = null
        }),
      requestPasswordReset: () => simulateLatency(),
      resetPassword: () => simulateLatency(),
      updateProfile: (input) =>
        withState((state) => {
          const user = backend.requireUser(state)
          user.fullName = input.fullName.trim()
          user.phone = input.phone
          return user
        }),
      changePassword: () =>
        withState((state) => {
          backend.requireUser(state)
        }),
    },
    transactions: {
      list: (params) => withState((state, now) => backend.listTransactions(state, params, now)),
      get: (id) => withState((state) => backend.getTransaction(state, id)),
      create: (input) => withState((state, now) => backend.createTransaction(state, input, now)),
      sendToClient: (id) => withState((state, now) => backend.applyPartyAction(state, id, "send_to_client", now)),
      acceptTerms: (id) => withState((state, now) => backend.applyPartyAction(state, id, "accept_terms", now)),
      refuseTerms: (id, reason) =>
        withState((state, now) => backend.applyPartyAction(state, id, "refuse_terms", now, reason)),
      cancel: (id, reason) => withState((state, now) => backend.applyPartyAction(state, id, "cancel", now, reason)),
      getDashboardSummary: () => withState((state) => backend.getDashboardSummary(state)),
    },
    payments: {
      listForTransaction: (id) => withState((state, now) => backend.listPaymentsForTransaction(state, id, now)),
      listHistory: () => withState((state, now) => backend.listPaymentHistory(state, now)),
      initiate: (id, method) => withState((state, now) => backend.initiatePayment(state, id, method, now)),
      getAttempt: (id) => withState((state, now) => backend.getPaymentAttempt(state, id, now)),
    },
    deliveries: {
      start: (id, input) => withState((state, now) => backend.startDelivery(state, id, input, now)),
      complete: (id, input) => withState((state, now) => backend.completeDelivery(state, id, input, now)),
      confirmReceipt: (id) => withState((state, now) => backend.confirmReceipt(state, id, now)),
    },
    disputes: {
      list: () => withState((state) => backend.listDisputes(state)),
      get: (id) => withState((state) => backend.getDispute(state, id)),
      open: (input) => withState((state, now) => backend.openDispute(state, input, now)),
      reply: (id, body) => withState((state, now) => backend.replyToDispute(state, id, body, now)),
    },
    notifications: {
      list: () => withState((state) => backend.listNotifications(state)),
      markRead: (id) => withState((state, now) => backend.markNotificationsRead(state, now, id)),
      markAllRead: () => withState((state, now) => backend.markNotificationsRead(state, now)),
      getPreferences: () =>
        withState((state) => state.preferences[backend.requireUser(state).id] ?? defaultPreferences()),
      updatePreferences: (preferences) =>
        withState((state) => {
          const user = backend.requireUser(state)
          state.preferences[user.id] = preferences
          return preferences
        }),
    },
    demo,
  }
}
