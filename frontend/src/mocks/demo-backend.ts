/**
 * BACKEND SIMULÉ — mode démonstration uniquement.
 * Reproduit les règles que le vrai backend doit appliquer (transitions, rôles, séquestre)
 * afin que l'interface se comporte de manière réaliste. Aucune opération financière réelle.
 */
import { isMerchantRole } from "@/features/auth/roles"
import type { Session, User } from "@/features/auth/types"
import type { CompleteDeliveryInput, StartDeliveryInput } from "@/features/deliveries/services/delivery-service"
import { DISPUTE_STATUS_PRESENTATION, isDisputeActive } from "@/features/disputes/presentation"
import type { Dispute, DisputeOutcome, DisputeStatus, OpenDisputeInput } from "@/features/disputes/types"
import type { AppNotification, NotificationParams } from "@/features/notifications/types"
import type { PaymentAttempt, PaymentMethod } from "@/features/payments/types"
import {
  ACTION_RULES,
  canTransition,
  checkAction,
  getPartyRole,
  needsViewerAttention,
  type TransactionAction,
} from "@/features/transactions/domain/transitions"
import type {
  CreateTransactionInput,
  DashboardSummary,
  PartyRole,
  PartySummary,
  Transaction,
  TransactionEventType,
  TransactionListParams,
  TransactionStatus,
  TransactionSummary,
} from "@/features/transactions/types"
import { ApiError } from "@/lib/api/errors"
import { formatMoney, sumMoney } from "@/lib/formatters/money"
import type { Paginated } from "@/types/common"
import type { DemoState } from "./store"
import { DAY, MINUTE, demoId, fakeXofToSats, normalizePhone, normalizeText } from "./utils"

const INVOICE_TTL_MS = 15 * MINUTE

// ─── Accès et contrôles ─────────────────────────────────────────────────────

export function requireUser(state: DemoState): User {
  const user = state.users.find((u) => u.id === state.sessionUserId)
  if (!user) throw new ApiError("UNAUTHENTICATED")
  return user
}

export function toSession(user: User): Session {
  return { user, isDemo: true }
}

/**
 * Visibilité : les parties uniquement, et le client ne voit pas un brouillon
 * que le vendeur ne lui a pas encore envoyé (hypothèse documentée).
 */
function isVisibleTo(transaction: Transaction, userId: string): boolean {
  const role = getPartyRole(transaction, { userId })
  if (role === "merchant") return true
  return role === "client" && transaction.events.some((event) => event.type === "sent_to_client")
}

function findTransaction(state: DemoState, user: User, id: string): Transaction {
  const transaction = state.transactions.find((t) => t.id === id)
  // Une transaction d'un tiers est présentée comme inexistante (pas de fuite d'information).
  if (!transaction || !isVisibleTo(transaction, user.id)) {
    throw new ApiError("NOT_FOUND", "Transaction introuvable.")
  }
  return transaction
}

function assertAction(transaction: Transaction, user: User, action: TransactionAction): void {
  const check = checkAction(action, transaction, { userId: user.id })
  if (!check.allowed) {
    throw new ApiError(
      getPartyRole(transaction, { userId: user.id }) ? "INVALID_TRANSITION" : "FORBIDDEN",
      check.reason,
    )
  }
}

function setStatus(transaction: Transaction, to: TransactionStatus, now: number): void {
  if (!canTransition(transaction.status, to)) {
    throw new ApiError("INVALID_TRANSITION", `Transition refusée : ${transaction.status} → ${to}.`)
  }
  transaction.status = to
  transaction.updatedAt = new Date(now).toISOString()
}

function addEvent(
  transaction: Transaction,
  type: TransactionEventType,
  actor: PartyRole | "system",
  now: number,
  note: string | null = null,
): void {
  const actorName =
    actor === "merchant"
      ? transaction.merchant.fullName
      : actor === "client"
        ? transaction.client.fullName
        : null
  transaction.events.push({
    id: demoId("evt"),
    type,
    at: new Date(now).toISOString(),
    actor,
    actorName,
    note,
  })
  transaction.updatedAt = new Date(now).toISOString()
}

function notify(
  state: DemoState,
  recipient: PartySummary,
  type: AppNotification["type"],
  transaction: Transaction,
  now: number,
  extra: { disputeId?: string; params?: NotificationParams } = {},
): void {
  if (!recipient.userId) return
  const counterpart =
    recipient.userId === transaction.client.userId ? transaction.merchant : transaction.client
  state.notifications.unshift({
    id: demoId("ntf"),
    userId: recipient.userId,
    type,
    params: extra.params ?? {
      reference: transaction.reference,
      title: transaction.title,
      amount: formatMoney(transaction.amount),
      counterpartName: counterpart.fullName,
    },
    transactionId: transaction.id,
    disputeId: extra.disputeId ?? null,
    createdAt: new Date(now).toISOString(),
    readAt: null,
  })
}

function toSummary(transaction: Transaction): TransactionSummary {
  return {
    id: transaction.id,
    reference: transaction.reference,
    title: transaction.title,
    kind: transaction.kind,
    amount: transaction.amount,
    status: transaction.status,
    merchant: transaction.merchant,
    client: transaction.client,
    deadline: transaction.deadline,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    escrow: transaction.escrow,
    activeDisputeId: transaction.activeDisputeId,
  }
}

// ─── Authentification ───────────────────────────────────────────────────────

export function login(state: DemoState, email: string): Session {
  const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  // Message générique : ne révèle pas si le compte existe.
  if (!user) throw new ApiError("UNAUTHENTICATED", "Adresse e-mail ou mot de passe incorrect.")
  state.sessionUserId = user.id
  return toSession(user)
}

export function register(
  state: DemoState,
  input: { fullName: string; email: string; phone: string | null; role: User["role"] },
  now: number,
): Session {
  const email = input.email.trim().toLowerCase()
  if (state.users.some((u) => u.email.toLowerCase() === email)) {
    throw new ApiError("CONFLICT", "Un compte existe déjà avec cette adresse e-mail.", {
      fieldErrors: { email: "Cette adresse e-mail est déjà utilisée." },
    })
  }
  // Le mot de passe n'est volontairement PAS conservé en mode démo.
  const user: User = {
    id: demoId("usr"),
    fullName: input.fullName.trim(),
    email,
    phone: input.phone,
    role: input.role,
    createdAt: new Date(now).toISOString(),
  }
  state.users.push(user)
  state.preferences[user.id] = {
    channels: { in_app: true, email: true, sms: false, voice: false },
    categories: { transactions: true, payments: true, disputes: true },
    locale: "fr",
  }
  state.sessionUserId = user.id
  return toSession(user)
}

// ─── Transactions ───────────────────────────────────────────────────────────

const PERIOD_DAYS = { "7d": 7, "30d": 30, "90d": 90 } as const

export function listTransactions(
  state: DemoState,
  params: TransactionListParams,
  now: number,
): Paginated<TransactionSummary> {
  const user = requireUser(state)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10))
  const search = normalizeText(params.search?.trim() ?? "")

  let items = state.transactions.filter((t) => isVisibleTo(t, user.id))
  if (params.status && params.status !== "all") items = items.filter((t) => t.status === params.status)
  if (params.period && params.period !== "all") {
    const since = now - PERIOD_DAYS[params.period] * DAY
    items = items.filter((t) => new Date(t.createdAt).getTime() >= since)
  }
  if (search) {
    items = items.filter((t) =>
      [t.reference, t.title, t.merchant.fullName, t.client.fullName].some((field) =>
        normalizeText(field).includes(search),
      ),
    )
  }

  const sort = params.sort ?? "created_desc"
  const sorted = [...items].sort((a, b) => {
    switch (sort) {
      case "created_asc":
        return a.createdAt.localeCompare(b.createdAt)
      case "amount_desc":
        return b.amount.amount - a.amount.amount
      case "amount_asc":
        return a.amount.amount - b.amount.amount
      case "deadline_asc":
        return a.deadline.localeCompare(b.deadline)
      case "created_desc":
        return b.createdAt.localeCompare(a.createdAt)
    }
  })

  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
    page,
    pageSize,
    total: sorted.length,
  }
}

export function getTransaction(state: DemoState, id: string): Transaction {
  return findTransaction(state, requireUser(state), id)
}

function resolveClientParty(state: DemoState, merchant: User, input: CreateTransactionInput): PartySummary {
  const contact = input.clientContact.trim()
  const isEmail = contact.includes("@")
  const match = state.users.find((u) =>
    isEmail
      ? u.email.toLowerCase() === contact.toLowerCase()
      : u.phone !== null && normalizePhone(u.phone) === normalizePhone(contact),
  )
  if (match?.id === merchant.id) {
    throw new ApiError("VALIDATION", "Vous ne pouvez pas créer une transaction avec vous-même.", {
      fieldErrors: { clientContact: "Indiquez les coordonnées d'une autre personne." },
    })
  }
  if (match) {
    return { userId: match.id, fullName: match.fullName, email: match.email, phone: match.phone, role: match.role }
  }
  // Pas de compte : le backend réel enverrait une invitation (non simulée ici).
  return {
    userId: null,
    fullName: input.clientName.trim(),
    email: isEmail ? contact.toLowerCase() : null,
    phone: isEmail ? null : contact,
    role: "client",
  }
}

export function createTransaction(state: DemoState, input: CreateTransactionInput, now: number): Transaction {
  const user = requireUser(state)
  if (!isMerchantRole(user.role)) {
    throw new ApiError("FORBIDDEN", "Seuls les vendeurs et prestataires peuvent proposer une transaction.")
  }
  if (input.merchantAcceptsTerms !== true) {
    throw new ApiError("VALIDATION", "Vous devez accepter les conditions que vous proposez.")
  }
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new ApiError("VALIDATION", "Montant invalide.", { fieldErrors: { amount: "Montant invalide." } })
  }
  state.counters.transaction += 1
  const nowIso = new Date(now).toISOString()
  const transaction: Transaction = {
    id: demoId("trx"),
    reference: `WL-26-${String(state.counters.transaction).padStart(4, "0")}`,
    title: input.title.trim(),
    kind: input.kind,
    description: input.description.trim(),
    amount: { amount: input.amount, currency: input.currency },
    status: "created",
    merchant: { userId: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role },
    client: resolveClientParty(state, user, input),
    deadline: input.deadline,
    createdAt: nowIso,
    updatedAt: nowIso,
    escrow: { status: "not_started", updatedAt: null },
    activeDisputeId: null,
    specialConditions: input.specialConditions?.trim() || null,
    claimWindowDays: input.claimWindowDays,
    merchantAcceptedAt: nowIso,
    clientAcceptedAt: null,
    delivery: null,
    disputeIds: [],
    events: [],
  }
  addEvent(transaction, "created", "merchant", now)
  state.transactions.unshift(transaction)
  return transaction
}

/** Actions simples sans données supplémentaires (envoi, acceptation, refus, annulation). */
export function applyPartyAction(
  state: DemoState,
  id: string,
  action: Extract<TransactionAction, "send_to_client" | "accept_terms" | "refuse_terms" | "cancel">,
  now: number,
  note: string | null = null,
): Transaction {
  const user = requireUser(state)
  const transaction = findTransaction(state, user, id)
  assertAction(transaction, user, action)
  const role = getPartyRole(transaction, { userId: user.id })!

  if (action === "cancel" && state.payments.some((p) => p.transactionId === id && p.status === "pending")) {
    throw new ApiError("CONFLICT", "Un paiement est en cours de vérification : l'annulation est impossible pour le moment.")
  }

  const target = ACTION_RULES[action].to!
  setStatus(transaction, target, now)
  const nowIso = new Date(now).toISOString()

  switch (action) {
    case "send_to_client":
      addEvent(transaction, "sent_to_client", role, now)
      notify(state, transaction.client, "transaction_proposed", transaction, now)
      break
    case "accept_terms":
      transaction.clientAcceptedAt = nowIso
      addEvent(transaction, "terms_accepted", role, now)
      notify(state, transaction.merchant, "terms_accepted", transaction, now)
      break
    case "refuse_terms":
      addEvent(transaction, "terms_refused", role, now, note)
      notify(state, transaction.merchant, "terms_refused", transaction, now)
      break
    case "cancel":
      addEvent(transaction, "cancelled", role, now, note)
      // Un brouillon jamais envoyé n'est pas notifié au client.
      if (role === "client" || transaction.events.some((e) => e.type === "sent_to_client")) {
        notify(state, role === "merchant" ? transaction.client : transaction.merchant, "transaction_cancelled", transaction, now)
      }
      break
  }
  return transaction
}

export function getDashboardSummary(state: DemoState): DashboardSummary {
  const user = requireUser(state)
  const viewer = { userId: user.id }
  const mine = state.transactions.filter((t) => isVisibleTo(t, user.id))
  const count = (statuses: TransactionStatus[]) => mine.filter((t) => statuses.includes(t.status)).length
  const myDisputes = state.disputes.filter((d) => mine.some((t) => t.id === d.transactionId))

  const recentActivity = mine
    .flatMap((t) =>
      t.events.map((event) => ({
        id: `${t.id}:${event.id}`,
        transactionId: t.id,
        transactionReference: t.reference,
        transactionTitle: t.title,
        event,
      })),
    )
    .sort((a, b) => b.event.at.localeCompare(a.event.at))
    .slice(0, 8)

  const held = mine.filter((t) => t.escrow.status === "held")

  return {
    totalCount: mine.length,
    pendingCount: count(["created", "pending_acceptance", "pending_payment"]),
    inProgressCount: count(["payment_confirmed", "in_progress", "awaiting_confirmation"]),
    completedCount: count(["completed"]),
    openDisputesCount: myDisputes.filter((d) => isDisputeActive(d.status)).length,
    fundsHeld: sumMoney(held.map((t) => t.amount)),
    fundsHeldCount: held.length,
    needsAttention: mine
      .filter((t) => needsViewerAttention(t, viewer))
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 5)
      .map(toSummary),
    recentActivity,
  }
}

// ─── Paiements ──────────────────────────────────────────────────────────────

/** Expire côté « serveur » les factures dont l'échéance est dépassée. */
function expireOverdueInvoices(state: DemoState, now: number): void {
  for (const attempt of state.payments) {
    if (attempt.status === "pending" && attempt.invoice && new Date(attempt.invoice.expiresAt).getTime() <= now) {
      markAttemptExpired(state, attempt, now)
    }
  }
}

function markAttemptExpired(state: DemoState, attempt: PaymentAttempt, now: number): void {
  attempt.status = "expired"
  attempt.updatedAt = new Date(now).toISOString()
  const transaction = state.transactions.find((t) => t.id === attempt.transactionId)
  if (transaction) {
    addEvent(transaction, "payment_expired", "system", now)
    notify(state, transaction.client, "payment_expired", transaction, now)
  }
}

export function listPaymentsForTransaction(state: DemoState, transactionId: string, now: number): PaymentAttempt[] {
  findTransaction(state, requireUser(state), transactionId)
  expireOverdueInvoices(state, now)
  return state.payments
    .filter((p) => p.transactionId === transactionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listPaymentHistory(state: DemoState, now: number): PaymentAttempt[] {
  const user = requireUser(state)
  expireOverdueInvoices(state, now)
  const mine = new Set(state.transactions.filter((t) => isVisibleTo(t, user.id)).map((t) => t.id))
  return state.payments.filter((p) => mine.has(p.transactionId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getPaymentAttempt(state: DemoState, attemptId: string, now: number): PaymentAttempt {
  const user = requireUser(state)
  expireOverdueInvoices(state, now)
  const attempt = state.payments.find((p) => p.id === attemptId)
  if (!attempt) throw new ApiError("NOT_FOUND", "Paiement introuvable.")
  findTransaction(state, user, attempt.transactionId)
  return attempt
}

export function initiatePayment(
  state: DemoState,
  transactionId: string,
  method: PaymentMethod,
  now: number,
): PaymentAttempt {
  const user = requireUser(state)
  const transaction = findTransaction(state, user, transactionId)
  assertAction(transaction, user, "pay")
  expireOverdueInvoices(state, now)
  if (state.payments.some((p) => p.transactionId === transactionId && p.status === "pending")) {
    throw new ApiError("CONFLICT", "Une facture est déjà en attente de paiement pour cette transaction.")
  }
  const id = demoId("pay")
  const nowIso = new Date(now).toISOString()
  const attempt: PaymentAttempt = {
    id,
    transactionId,
    transactionReference: transaction.reference,
    transactionTitle: transaction.title,
    method,
    status: "pending",
    amount: transaction.amount,
    invoice: {
      // Chaîne volontairement invalide : elle ne peut pas être payée par un vrai portefeuille.
      paymentRequest: `WOOLU-DEMO-FACTURE-FICTIVE-${id.toUpperCase()}`,
      amountSats: fakeXofToSats(transaction.amount.amount),
      expiresAt: new Date(now + INVOICE_TTL_MS).toISOString(),
    },
    createdAt: nowIso,
    updatedAt: nowIso,
    confirmedAt: null,
    failureReason: null,
    isSimulated: true,
  }
  state.payments.unshift(attempt)
  addEvent(transaction, "payment_initiated", "client", now)
  return attempt
}

function findPendingAttemptForSimulation(state: DemoState, attemptId: string): { attempt: PaymentAttempt; transaction: Transaction } {
  const attempt = state.payments.find((p) => p.id === attemptId)
  if (!attempt) throw new ApiError("NOT_FOUND", "Paiement introuvable.")
  if (attempt.status !== "pending") {
    throw new ApiError("CONFLICT", "Ce paiement n'est plus en attente.")
  }
  const transaction = state.transactions.find((t) => t.id === attempt.transactionId)
  if (!transaction) throw new ApiError("NOT_FOUND", "Transaction introuvable.")
  return { attempt, transaction }
}

/** Simule la réception d'un webhook Bitnob « paiement reçu » vérifié par le serveur. */
export function simulatePaymentConfirmed(state: DemoState, attemptId: string, now: number): void {
  const { attempt, transaction } = findPendingAttemptForSimulation(state, attemptId)
  const nowIso = new Date(now).toISOString()
  attempt.status = "confirmed"
  attempt.confirmedAt = nowIso
  attempt.updatedAt = nowIso
  setStatus(transaction, "payment_confirmed", now)
  addEvent(transaction, "payment_confirmed", "system", now)
  transaction.escrow = { status: "held", updatedAt: nowIso }
  addEvent(transaction, "escrow_held", "system", now)
  notify(state, transaction.client, "payment_confirmed", transaction, now)
  notify(state, transaction.merchant, "payment_confirmed", transaction, now)
}

export function simulatePaymentFailed(state: DemoState, attemptId: string, now: number): void {
  const { attempt, transaction } = findPendingAttemptForSimulation(state, attemptId)
  attempt.status = "failed"
  attempt.failureReason = "Le paiement a été refusé par le réseau (simulation)."
  attempt.updatedAt = new Date(now).toISOString()
  addEvent(transaction, "payment_failed", "system", now)
  notify(state, transaction.client, "payment_failed", transaction, now)
}

export function simulatePaymentExpired(state: DemoState, attemptId: string, now: number): void {
  const { attempt } = findPendingAttemptForSimulation(state, attemptId)
  markAttemptExpired(state, attempt, now)
}

// ─── Livraison ──────────────────────────────────────────────────────────────

export function startDelivery(state: DemoState, id: string, input: StartDeliveryInput, now: number): Transaction {
  const user = requireUser(state)
  const transaction = findTransaction(state, user, id)
  assertAction(transaction, user, "start_delivery")
  setStatus(transaction, "in_progress", now)
  transaction.delivery = {
    method: input.method,
    carrier: input.carrier,
    trackingNumber: input.trackingNumber,
    note: input.note,
    startedAt: new Date(now).toISOString(),
    completedAt: null,
    completionNote: null,
  }
  addEvent(transaction, "delivery_started", "merchant", now, input.note)
  notify(state, transaction.client, "delivery_started", transaction, now)
  return transaction
}

export function completeDelivery(state: DemoState, id: string, input: CompleteDeliveryInput, now: number): Transaction {
  const user = requireUser(state)
  const transaction = findTransaction(state, user, id)
  assertAction(transaction, user, "mark_delivered")
  if (!transaction.delivery) throw new ApiError("INVALID_TRANSITION", "Aucune livraison n'a été démarrée.")
  setStatus(transaction, "awaiting_confirmation", now)
  transaction.delivery.completedAt = new Date(now).toISOString()
  transaction.delivery.completionNote = input.note
  addEvent(transaction, "delivery_completed", "merchant", now, input.note)
  notify(state, transaction.client, "delivery_completed", transaction, now)
  return transaction
}

export function confirmReceipt(state: DemoState, id: string, now: number): Transaction {
  const user = requireUser(state)
  const transaction = findTransaction(state, user, id)
  assertAction(transaction, user, "confirm_receipt")
  setStatus(transaction, "completed", now)
  addEvent(transaction, "receipt_confirmed", "client", now)
  transaction.escrow = { status: "released", updatedAt: new Date(now).toISOString() }
  addEvent(transaction, "funds_released", "system", now)
  notify(state, transaction.merchant, "receipt_confirmed", transaction, now)
  return transaction
}

// ─── Litiges ────────────────────────────────────────────────────────────────

function findDispute(state: DemoState, user: User, id: string): Dispute {
  const dispute = state.disputes.find((d) => d.id === id)
  if (!dispute) throw new ApiError("NOT_FOUND", "Réclamation introuvable.")
  findTransaction(state, user, dispute.transactionId)
  return dispute
}

export function listDisputes(state: DemoState): Dispute[] {
  const user = requireUser(state)
  const mine = new Set(state.transactions.filter((t) => isVisibleTo(t, user.id)).map((t) => t.id))
  return state.disputes.filter((d) => mine.has(d.transactionId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getDispute(state: DemoState, id: string): Dispute {
  return findDispute(state, requireUser(state), id)
}

export function openDispute(state: DemoState, input: OpenDisputeInput, now: number): Dispute {
  const user = requireUser(state)
  const transaction = findTransaction(state, user, input.transactionId)
  assertAction(transaction, user, "open_dispute")
  setStatus(transaction, "disputed", now)
  state.counters.dispute += 1
  const nowIso = new Date(now).toISOString()
  const dispute: Dispute = {
    id: demoId("dsp"),
    reference: `LT-26-${String(state.counters.dispute).padStart(4, "0")}`,
    transactionId: transaction.id,
    transactionReference: transaction.reference,
    transactionTitle: transaction.title,
    reason: input.reason,
    description: input.description.trim(),
    status: "open",
    openedByName: user.fullName,
    merchantUserId: transaction.merchant.userId,
    merchantName: transaction.merchant.fullName,
    clientUserId: transaction.client.userId,
    clientName: transaction.client.fullName,
    messages: [],
    history: [{ status: "open", at: nowIso }],
    decision: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
  state.disputes.unshift(dispute)
  transaction.activeDisputeId = dispute.id
  transaction.disputeIds.push(dispute.id)
  addEvent(transaction, "dispute_opened", "client", now)
  notify(state, transaction.merchant, "dispute_opened", transaction, now, { disputeId: dispute.id })
  return dispute
}

function changeDisputeStatus(state: DemoState, dispute: Dispute, status: DisputeStatus, now: number): void {
  if (dispute.status === status) return
  const nowIso = new Date(now).toISOString()
  dispute.status = status
  dispute.updatedAt = nowIso
  dispute.history.push({ status, at: nowIso })
  const transaction = state.transactions.find((t) => t.id === dispute.transactionId)
  if (!transaction) return
  for (const party of [transaction.client, transaction.merchant]) {
    notify(state, party, "dispute_status_changed", transaction, now, {
      disputeId: dispute.id,
      params: { reference: dispute.reference, status: DISPUTE_STATUS_PRESENTATION[status].label },
    })
  }
}

export function replyToDispute(state: DemoState, id: string, body: string, now: number): Dispute {
  const user = requireUser(state)
  const dispute = findDispute(state, user, id)
  if (!isDisputeActive(dispute.status)) {
    throw new ApiError("INVALID_TRANSITION", "Ce dossier est clos : il n'accepte plus de messages.")
  }
  const transaction = state.transactions.find((t) => t.id === dispute.transactionId)!
  const role = getPartyRole(transaction, { userId: user.id })!
  dispute.messages.push({
    id: demoId("msg"),
    author: role,
    authorName: user.fullName,
    body: body.trim(),
    createdAt: new Date(now).toISOString(),
  })
  dispute.updatedAt = new Date(now).toISOString()
  notify(state, role === "client" ? transaction.merchant : transaction.client, "dispute_message", transaction, now, {
    disputeId: dispute.id,
    params: { reference: dispute.reference, counterpartName: user.fullName },
  })
  // Hypothèse : une réponse de la partie sollicitée fait passer le dossier en examen.
  if (dispute.status === "awaiting_response" || (dispute.status === "open" && role === "merchant")) {
    changeDisputeStatus(state, dispute, "under_review", now)
  }
  return dispute
}

function findActiveDisputeForSimulation(state: DemoState, id: string): Dispute {
  const dispute = state.disputes.find((d) => d.id === id)
  if (!dispute) throw new ApiError("NOT_FOUND", "Réclamation introuvable.")
  if (!isDisputeActive(dispute.status)) throw new ApiError("CONFLICT", "Ce dossier est déjà clos.")
  return dispute
}

export function simulateDisputeInformationRequest(state: DemoState, id: string, now: number): void {
  const dispute = findActiveDisputeForSimulation(state, id)
  dispute.messages.push({
    id: demoId("msg"),
    author: "woolu",
    authorName: "Équipe Wóolu",
    body: "Pour poursuivre l'examen, merci de préciser votre position et de décrire les échanges intervenus avec l'autre partie.",
    createdAt: new Date(now).toISOString(),
  })
  changeDisputeStatus(state, dispute, "awaiting_response", now)
}

export function simulateDisputeReview(state: DemoState, id: string, now: number): void {
  changeDisputeStatus(state, findActiveDisputeForSimulation(state, id), "under_review", now)
}

/** Simule la décision de l'équipe Wóolu (opération réservée au backend). */
export function simulateDisputeDecision(state: DemoState, id: string, outcome: DisputeOutcome, now: number): void {
  const dispute = findActiveDisputeForSimulation(state, id)
  const transaction = state.transactions.find((t) => t.id === dispute.transactionId)
  if (!transaction) throw new ApiError("NOT_FOUND", "Transaction introuvable.")
  const nowIso = new Date(now).toISOString()
  dispute.decision = {
    outcome,
    summary:
      outcome === "refund_client"
        ? "Après examen des éléments fournis, Wóolu autorise le remboursement intégral du client (décision simulée)."
        : "Après examen des éléments fournis, Wóolu autorise la libération des fonds au vendeur (décision simulée).",
    decidedAt: nowIso,
  }
  changeDisputeStatus(state, dispute, "resolved", now)

  setStatus(transaction, outcome === "refund_client" ? "refunded" : "completed", now)
  transaction.activeDisputeId = null
  transaction.escrow = { status: outcome === "refund_client" ? "refunded" : "released", updatedAt: nowIso }
  addEvent(transaction, "dispute_resolved", "system", now)
  addEvent(transaction, outcome === "refund_client" ? "refunded" : "funds_released", "system", now)
  for (const party of [transaction.client, transaction.merchant]) {
    notify(state, party, "dispute_resolved", transaction, now, {
      disputeId: dispute.id,
      params: { reference: dispute.reference },
    })
  }
}

// ─── Notifications ──────────────────────────────────────────────────────────

export function listNotifications(state: DemoState): AppNotification[] {
  const user = requireUser(state)
  return state.notifications
    .filter((n) => n.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ userId: _userId, ...notification }) => notification)
}

export function markNotificationsRead(state: DemoState, now: number, id?: string): void {
  const user = requireUser(state)
  const nowIso = new Date(now).toISOString()
  for (const notification of state.notifications) {
    if (notification.userId === user.id && !notification.readAt && (!id || notification.id === id)) {
      notification.readAt = nowIso
    }
  }
}
