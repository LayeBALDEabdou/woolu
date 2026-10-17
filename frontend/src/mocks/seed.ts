/**
 * ⚠ DONNÉES DE DÉMONSTRATION FICTIVES.
 * Personnes, numéros et adresses e-mail sont inventés (domaine réservé example.com).
 */
import type { User } from "@/features/auth/types"
import type { Dispute } from "@/features/disputes/types"
import type { AppNotification, NotificationPreferences } from "@/features/notifications/types"
import type { PaymentAttempt } from "@/features/payments/types"
import type {
  DeliveryInfo,
  PartySummary,
  Transaction,
  TransactionEvent,
  TransactionEventType,
  TransactionKind,
  TransactionStatus,
} from "@/features/transactions/types"
import { formatMoney, xof } from "@/lib/formatters/money"
import type { DemoState } from "./store"
import { DAY, HOUR, MINUTE, fakeXofToSats, isoAt } from "./utils"

export const DEMO_USERS = {
  aissatou: "usr_demo_aissatou",
  moussa: "usr_demo_moussa",
  fatou: "usr_demo_fatou",
  ibrahima: "usr_demo_ibrahima",
} as const

export const DEMO_ACCOUNT_DESCRIPTIONS: Record<string, string> = {
  [DEMO_USERS.aissatou]: "Cliente — plusieurs achats et une réclamation en cours",
  [DEMO_USERS.moussa]: "Vendeur d'électroménager — commandes à expédier",
  [DEMO_USERS.fatou]: "Graphiste et développeuse web — prestations de service",
  [DEMO_USERS.ibrahima]: "Client — transactions terminées et à accepter",
}

export function defaultPreferences(): NotificationPreferences {
  return {
    channels: { in_app: true, email: true, sms: false, voice: false },
    categories: { transactions: true, payments: true, disputes: true },
    locale: "fr",
  }
}

function toParty(user: User): PartySummary {
  return {
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  }
}

function dateOnly(base: number, offsetDays: number): string {
  return new Date(base + offsetDays * DAY).toISOString().slice(0, 10)
}

interface EventSpec {
  type: TransactionEventType
  /** Décalage par rapport à maintenant (négatif = passé). */
  offset: number
  actor: TransactionEvent["actor"]
  note?: string
}

export function createSeedState(now: number): DemoState {
  const at = (offset: number) => isoAt(now, offset)

  const users: User[] = [
    {
      id: DEMO_USERS.aissatou,
      fullName: "Aïssatou Diop",
      email: "aissatou.diop@example.com",
      phone: "+221 77 000 00 01",
      role: "client",
      createdAt: at(-120 * DAY),
    },
    {
      id: DEMO_USERS.moussa,
      fullName: "Moussa Ndiaye",
      email: "moussa.ndiaye@example.com",
      phone: "+221 77 000 00 02",
      role: "vendeur",
      createdAt: at(-200 * DAY),
    },
    {
      id: DEMO_USERS.fatou,
      fullName: "Fatou Sarr",
      email: "fatou.sarr@example.com",
      phone: "+221 76 000 00 03",
      role: "prestataire",
      createdAt: at(-150 * DAY),
    },
    {
      id: DEMO_USERS.ibrahima,
      fullName: "Ibrahima Fall",
      email: "ibrahima.fall@example.com",
      phone: "+221 78 000 00 04",
      role: "client",
      createdAt: at(-60 * DAY),
    },
  ]
  const byId = (id: string) => {
    const user = users.find((u) => u.id === id)
    if (!user) throw new Error(`Utilisateur de démo inconnu : ${id}`)
    return user
  }

  let referenceCounter = 0
  const transactions: Transaction[] = []

  function addTransaction(spec: {
    id: string
    merchant: string
    client: string
    title: string
    kind: TransactionKind
    description: string
    amount: number
    status: TransactionStatus
    createdOffset: number
    deadlineDays: number
    events: EventSpec[]
    specialConditions?: string
    claimWindowDays?: 3 | 7 | 14
    escrow?: Transaction["escrow"]
    delivery?: DeliveryInfo | null
    disputeIds?: string[]
    activeDisputeId?: string | null
  }): Transaction {
    referenceCounter += 1
    const merchant = byId(spec.merchant)
    const client = byId(spec.client)
    const events: TransactionEvent[] = spec.events.map((event, index) => ({
      id: `${spec.id}_evt_${index}`,
      type: event.type,
      at: at(event.offset),
      actor: event.actor,
      actorName:
        event.actor === "merchant"
          ? merchant.fullName
          : event.actor === "client"
            ? client.fullName
            : null,
      note: event.note ?? null,
    }))
    const accepted = events.find((e) => e.type === "terms_accepted")
    const transaction: Transaction = {
      id: spec.id,
      reference: `WL-26-${String(1040 + referenceCounter).padStart(4, "0")}`,
      title: spec.title,
      kind: spec.kind,
      description: spec.description,
      amount: xof(spec.amount),
      status: spec.status,
      merchant: toParty(merchant),
      client: toParty(client),
      deadline: dateOnly(now, spec.deadlineDays),
      createdAt: at(spec.createdOffset),
      updatedAt: events.at(-1)?.at ?? at(spec.createdOffset),
      escrow: spec.escrow ?? { status: "not_started", updatedAt: null },
      activeDisputeId: spec.activeDisputeId ?? null,
      specialConditions: spec.specialConditions ?? null,
      claimWindowDays: spec.claimWindowDays ?? 7,
      merchantAcceptedAt: at(spec.createdOffset),
      clientAcceptedAt: accepted?.at ?? null,
      delivery: spec.delivery ?? null,
      disputeIds: spec.disputeIds ?? [],
      events,
    }
    transactions.push(transaction)
    return transaction
  }

  const M = "merchant" as const
  const C = "client" as const
  const S = "system" as const

  addTransaction({
    id: "trx_demo_01",
    merchant: DEMO_USERS.moussa,
    client: DEMO_USERS.aissatou,
    title: "Téléphone Samsung Galaxy A15 (neuf, sous blister)",
    kind: "product",
    description:
      "Smartphone Samsung Galaxy A15, 128 Go, coloris bleu nuit. Neuf, sous blister, avec chargeur et facture. Garantie constructeur 12 mois.",
    amount: 89_000,
    status: "created",
    createdOffset: -2 * HOUR,
    deadlineDays: 5,
    events: [{ type: "created", offset: -2 * HOUR, actor: M }],
    specialConditions: "Livraison à Dakar uniquement (Plateau, Médina, Point E).",
  })

  addTransaction({
    id: "trx_demo_02",
    merchant: DEMO_USERS.moussa,
    client: DEMO_USERS.aissatou,
    title: "Machine à coudre Singer 4423",
    kind: "product",
    description:
      "Machine à coudre Singer Heavy Duty 4423, état neuf, 23 points de couture. Livrée avec pédale, housse et kit d'aiguilles.",
    amount: 120_000,
    status: "pending_acceptance",
    createdOffset: -1 * DAY,
    deadlineDays: 7,
    events: [
      { type: "created", offset: -1 * DAY, actor: M },
      { type: "sent_to_client", offset: -1 * DAY + 10 * MINUTE, actor: M },
    ],
    claimWindowDays: 7,
  })

  const t3 = addTransaction({
    id: "trx_demo_03",
    merchant: DEMO_USERS.fatou,
    client: DEMO_USERS.aissatou,
    title: "Création d'un logo et d'une charte graphique",
    kind: "service",
    description:
      "Conception d'un logo pour la boutique de tissus « Wax Aïssa » : 3 propositions, 2 séries de retouches, charte graphique (couleurs, typographies) et fichiers sources.",
    amount: 150_000,
    status: "pending_payment",
    createdOffset: -3 * DAY,
    deadlineDays: 14,
    events: [
      { type: "created", offset: -3 * DAY, actor: M },
      { type: "sent_to_client", offset: -3 * DAY + 5 * MINUTE, actor: M },
      { type: "terms_accepted", offset: -2 * DAY, actor: C },
      { type: "payment_initiated", offset: -2 * DAY + 10 * MINUTE, actor: C },
      { type: "payment_expired", offset: -2 * DAY + 25 * MINUTE, actor: S },
    ],
    specialConditions: "Les fichiers sources sont livrés après validation finale du client.",
    claimWindowDays: 14,
  })

  const t4 = addTransaction({
    id: "trx_demo_04",
    merchant: DEMO_USERS.moussa,
    client: DEMO_USERS.ibrahima,
    title: "Ordinateur portable HP 15 reconditionné",
    kind: "product",
    description:
      "HP 15-dw, Intel Core i5, 8 Go RAM, SSD 256 Go. Reconditionné, batterie neuve, garantie vendeur 6 mois.",
    amount: 285_000,
    status: "payment_confirmed",
    createdOffset: -5 * DAY,
    deadlineDays: 3,
    events: [
      { type: "created", offset: -5 * DAY, actor: M },
      { type: "sent_to_client", offset: -5 * DAY + 3 * MINUTE, actor: M },
      { type: "terms_accepted", offset: -4 * DAY, actor: C },
      { type: "payment_initiated", offset: -4 * DAY + 20 * MINUTE, actor: C },
      { type: "payment_confirmed", offset: -4 * DAY + 24 * MINUTE, actor: S },
      { type: "escrow_held", offset: -4 * DAY + 24 * MINUTE, actor: S },
    ],
    escrow: { status: "held", updatedAt: at(-4 * DAY + 24 * MINUTE) },
  })

  const t5 = addTransaction({
    id: "trx_demo_05",
    merchant: DEMO_USERS.moussa,
    client: DEMO_USERS.aissatou,
    title: "Réfrigérateur 2 portes 300 L",
    kind: "product",
    description:
      "Réfrigérateur combiné Hisense 300 L, classe énergétique A+, garantie 2 ans. Livraison et installation à domicile incluses.",
    amount: 210_000,
    status: "in_progress",
    createdOffset: -8 * DAY,
    deadlineDays: 2,
    events: [
      { type: "created", offset: -8 * DAY, actor: M },
      { type: "sent_to_client", offset: -8 * DAY + 2 * MINUTE, actor: M },
      { type: "terms_accepted", offset: -7 * DAY, actor: C },
      { type: "payment_initiated", offset: -7 * DAY + 30 * MINUTE, actor: C },
      { type: "payment_confirmed", offset: -7 * DAY + 33 * MINUTE, actor: S },
      { type: "escrow_held", offset: -7 * DAY + 33 * MINUTE, actor: S },
      { type: "delivery_started", offset: -1 * DAY, actor: M },
    ],
    escrow: { status: "held", updatedAt: at(-7 * DAY + 33 * MINUTE) },
    delivery: {
      method: "courier",
      carrier: "Livreur de la boutique",
      trackingNumber: null,
      note: "Livraison prévue demain entre 10 h et 13 h, Sicap Liberté 6.",
      startedAt: at(-1 * DAY),
      completedAt: null,
      completionNote: null,
    },
  })

  const t6 = addTransaction({
    id: "trx_demo_06",
    merchant: DEMO_USERS.fatou,
    client: DEMO_USERS.aissatou,
    title: "Site vitrine pour restaurant",
    kind: "service",
    description:
      "Site vitrine de 5 pages pour le restaurant « Chez Aïssa » : accueil, menu, galerie, réservation par WhatsApp, contact. Hébergement de la première année inclus.",
    amount: 350_000,
    status: "awaiting_confirmation",
    createdOffset: -20 * DAY,
    deadlineDays: -1,
    events: [
      { type: "created", offset: -20 * DAY, actor: M },
      { type: "sent_to_client", offset: -20 * DAY + 4 * MINUTE, actor: M },
      { type: "terms_accepted", offset: -19 * DAY, actor: C },
      { type: "payment_initiated", offset: -19 * DAY + HOUR, actor: C },
      { type: "payment_confirmed", offset: -19 * DAY + HOUR + 5 * MINUTE, actor: S },
      { type: "escrow_held", offset: -19 * DAY + HOUR + 5 * MINUTE, actor: S },
      { type: "delivery_started", offset: -18 * DAY, actor: M },
      { type: "delivery_completed", offset: -6 * HOUR, actor: M },
    ],
    escrow: { status: "held", updatedAt: at(-19 * DAY + HOUR + 5 * MINUTE) },
    delivery: {
      method: "remote",
      carrier: null,
      trackingNumber: null,
      note: "Maquettes partagées par e-mail, développement en cours.",
      startedAt: at(-18 * DAY),
      completedAt: at(-6 * HOUR),
      completionNote: "Site mis en ligne. Identifiants d'administration envoyés par e-mail.",
    },
    claimWindowDays: 14,
  })

  const t7 = addTransaction({
    id: "trx_demo_07",
    merchant: DEMO_USERS.moussa,
    client: DEMO_USERS.aissatou,
    title: "Paire de chaussures en cuir artisanales",
    kind: "product",
    description: "Chaussures en cuir de fabrication artisanale (Ngaye Mékhé), pointure 41, couleur marron.",
    amount: 32_500,
    status: "disputed",
    createdOffset: -12 * DAY,
    deadlineDays: -4,
    events: [
      { type: "created", offset: -12 * DAY, actor: M },
      { type: "sent_to_client", offset: -12 * DAY + MINUTE, actor: M },
      { type: "terms_accepted", offset: -11 * DAY, actor: C },
      { type: "payment_initiated", offset: -11 * DAY + 15 * MINUTE, actor: C },
      { type: "payment_confirmed", offset: -11 * DAY + 18 * MINUTE, actor: S },
      { type: "escrow_held", offset: -11 * DAY + 18 * MINUTE, actor: S },
      { type: "delivery_started", offset: -9 * DAY, actor: M },
      { type: "delivery_completed", offset: -5 * DAY, actor: M },
      { type: "dispute_opened", offset: -3 * DAY, actor: C },
    ],
    escrow: { status: "held", updatedAt: at(-11 * DAY + 18 * MINUTE) },
    delivery: {
      method: "carrier",
      carrier: "Transporteur interurbain",
      trackingNumber: "TRX-458812",
      note: "Expédition depuis Mékhé.",
      startedAt: at(-9 * DAY),
      completedAt: at(-5 * DAY),
      completionNote: "Colis remis au point relais de Dakar.",
    },
    disputeIds: ["dsp_demo_01"],
    activeDisputeId: "dsp_demo_01",
  })

  const t8 = addTransaction({
    id: "trx_demo_08",
    merchant: DEMO_USERS.fatou,
    client: DEMO_USERS.ibrahima,
    title: "Séance photo produits (20 photos retouchées)",
    kind: "service",
    description: "Shooting en studio de 20 produits cosmétiques, retouche et livraison en haute définition.",
    amount: 75_000,
    status: "completed",
    createdOffset: -40 * DAY,
    deadlineDays: -25,
    events: [
      { type: "created", offset: -40 * DAY, actor: M },
      { type: "sent_to_client", offset: -40 * DAY + MINUTE, actor: M },
      { type: "terms_accepted", offset: -39 * DAY, actor: C },
      { type: "payment_initiated", offset: -39 * DAY + 10 * MINUTE, actor: C },
      { type: "payment_confirmed", offset: -39 * DAY + 12 * MINUTE, actor: S },
      { type: "escrow_held", offset: -39 * DAY + 12 * MINUTE, actor: S },
      { type: "delivery_started", offset: -35 * DAY, actor: M },
      { type: "delivery_completed", offset: -30 * DAY, actor: M },
      { type: "receipt_confirmed", offset: -29 * DAY, actor: C },
      { type: "funds_released", offset: -29 * DAY, actor: S },
    ],
    escrow: { status: "released", updatedAt: at(-29 * DAY) },
    delivery: {
      method: "on_site",
      carrier: null,
      trackingNumber: null,
      note: "Studio de la Sicap Amitié.",
      startedAt: at(-35 * DAY),
      completedAt: at(-30 * DAY),
      completionNote: "Photos livrées via un lien de téléchargement.",
    },
  })

  addTransaction({
    id: "trx_demo_09",
    merchant: DEMO_USERS.moussa,
    client: DEMO_USERS.ibrahima,
    title: "Téléviseur LED 43 pouces",
    kind: "product",
    description: "Téléviseur Samsung 43 pouces Full HD, modèle d'exposition, garantie 6 mois.",
    amount: 165_000,
    status: "cancelled",
    createdOffset: -15 * DAY,
    deadlineDays: -8,
    events: [
      { type: "created", offset: -15 * DAY, actor: M },
      { type: "sent_to_client", offset: -15 * DAY + MINUTE, actor: M },
      { type: "terms_refused", offset: -14 * DAY, actor: C, note: "Délai de livraison trop long." },
    ],
  })

  const t10 = addTransaction({
    id: "trx_demo_10",
    merchant: DEMO_USERS.moussa,
    client: DEMO_USERS.aissatou,
    title: "Bouilloire électrique inox 1,7 L",
    kind: "product",
    description: "Bouilloire électrique inox 1,7 L, arrêt automatique.",
    amount: 12_500,
    status: "refunded",
    createdOffset: -35 * DAY,
    deadlineDays: -28,
    events: [
      { type: "created", offset: -35 * DAY, actor: M },
      { type: "sent_to_client", offset: -35 * DAY + MINUTE, actor: M },
      { type: "terms_accepted", offset: -34 * DAY, actor: C },
      { type: "payment_initiated", offset: -34 * DAY + 5 * MINUTE, actor: C },
      { type: "payment_confirmed", offset: -34 * DAY + 7 * MINUTE, actor: S },
      { type: "escrow_held", offset: -34 * DAY + 7 * MINUTE, actor: S },
      { type: "delivery_started", offset: -33 * DAY, actor: M },
      { type: "delivery_completed", offset: -31 * DAY, actor: M },
      { type: "dispute_opened", offset: -30 * DAY, actor: C },
      { type: "dispute_resolved", offset: -26 * DAY, actor: S },
      { type: "refunded", offset: -26 * DAY, actor: S },
    ],
    escrow: { status: "refunded", updatedAt: at(-26 * DAY) },
    delivery: {
      method: "hand_delivery",
      carrier: null,
      trackingNumber: null,
      note: null,
      startedAt: at(-33 * DAY),
      completedAt: at(-31 * DAY),
      completionNote: null,
    },
    disputeIds: ["dsp_demo_02"],
  })

  addTransaction({
    id: "trx_demo_11",
    merchant: DEMO_USERS.fatou,
    client: DEMO_USERS.ibrahima,
    title: "Traduction de documents commerciaux (FR → EN)",
    kind: "service",
    description: "Traduction d'une plaquette commerciale de 12 pages du français vers l'anglais, relecture incluse.",
    amount: 60_000,
    status: "pending_acceptance",
    createdOffset: -6 * HOUR,
    deadlineDays: 10,
    events: [
      { type: "created", offset: -6 * HOUR, actor: M },
      { type: "sent_to_client", offset: -6 * HOUR + MINUTE, actor: M },
    ],
    claimWindowDays: 3,
  })

  const payments: PaymentAttempt[] = [
    paymentFor(t3, "pay_demo_01", "expired", -2 * DAY + 10 * MINUTE, null),
    paymentFor(t4, "pay_demo_02", "confirmed", -4 * DAY + 20 * MINUTE, -4 * DAY + 24 * MINUTE),
    paymentFor(t5, "pay_demo_03", "confirmed", -7 * DAY + 30 * MINUTE, -7 * DAY + 33 * MINUTE),
    paymentFor(t6, "pay_demo_04", "confirmed", -19 * DAY + HOUR, -19 * DAY + HOUR + 5 * MINUTE),
    paymentFor(t7, "pay_demo_05", "confirmed", -11 * DAY + 15 * MINUTE, -11 * DAY + 18 * MINUTE),
    paymentFor(t8, "pay_demo_06", "confirmed", -39 * DAY + 10 * MINUTE, -39 * DAY + 12 * MINUTE),
    paymentFor(t10, "pay_demo_07", "confirmed", -34 * DAY + 5 * MINUTE, -34 * DAY + 7 * MINUTE),
  ]

  function paymentFor(
    transaction: Transaction,
    id: string,
    status: PaymentAttempt["status"],
    createdOffset: number,
    confirmedOffset: number | null,
  ): PaymentAttempt {
    return {
      id,
      transactionId: transaction.id,
      transactionReference: transaction.reference,
      transactionTitle: transaction.title,
      method: "lightning",
      status,
      amount: transaction.amount,
      invoice: {
        paymentRequest: `WOOLU-DEMO-FACTURE-FICTIVE-${id.toUpperCase()}`,
        amountSats: fakeXofToSats(transaction.amount.amount),
        expiresAt: at(createdOffset + 15 * MINUTE),
      },
      createdAt: at(createdOffset),
      updatedAt: at(confirmedOffset ?? createdOffset + 15 * MINUTE),
      confirmedAt: confirmedOffset === null ? null : at(confirmedOffset),
      failureReason: null,
      isSimulated: true,
    }
  }

  const disputes: Dispute[] = [
    {
      id: "dsp_demo_01",
      reference: "LT-26-0201",
      transactionId: t7.id,
      transactionReference: t7.reference,
      transactionTitle: t7.title,
      reason: "not_as_described",
      description:
        "Les chaussures reçues sont en pointure 39 et non 41 comme convenu. La couleur est également plus claire que sur les photos envoyées.",
      status: "under_review",
      openedByName: "Aïssatou Diop",
      merchantUserId: DEMO_USERS.moussa,
      merchantName: "Moussa Ndiaye",
      clientUserId: DEMO_USERS.aissatou,
      clientName: "Aïssatou Diop",
      messages: [
        {
          id: "msg_demo_01",
          author: "merchant",
          authorName: "Moussa Ndiaye",
          body: "Bonjour, je vérifie avec l'artisan. Pouvez-vous m'envoyer une photo de l'étiquette intérieure ?",
          createdAt: at(-2 * DAY - 4 * HOUR),
        },
        {
          id: "msg_demo_02",
          author: "client",
          authorName: "Aïssatou Diop",
          body: "L'étiquette indique bien 39. Je peux rapporter la paire au point relais.",
          createdAt: at(-2 * DAY),
        },
        {
          id: "msg_demo_03",
          author: "woolu",
          authorName: "Équipe Wóolu",
          body: "Nous avons bien reçu les éléments des deux parties. Le dossier est en cours d'examen.",
          createdAt: at(-1 * DAY),
        },
      ],
      history: [
        { status: "open", at: at(-3 * DAY) },
        { status: "under_review", at: at(-1 * DAY) },
      ],
      decision: null,
      createdAt: at(-3 * DAY),
      updatedAt: at(-1 * DAY),
    },
    {
      id: "dsp_demo_02",
      reference: "LT-26-0188",
      transactionId: t10.id,
      transactionReference: t10.reference,
      transactionTitle: t10.title,
      reason: "not_as_described",
      description: "La bouilloire ne chauffe pas : le voyant s'allume mais l'eau reste froide.",
      status: "resolved",
      openedByName: "Aïssatou Diop",
      merchantUserId: DEMO_USERS.moussa,
      merchantName: "Moussa Ndiaye",
      clientUserId: DEMO_USERS.aissatou,
      clientName: "Aïssatou Diop",
      messages: [
        {
          id: "msg_demo_10",
          author: "merchant",
          authorName: "Moussa Ndiaye",
          body: "Je n'ai plus ce modèle en stock, je préfère un remboursement.",
          createdAt: at(-29 * DAY),
        },
      ],
      history: [
        { status: "open", at: at(-30 * DAY) },
        { status: "under_review", at: at(-29 * DAY) },
        { status: "resolved", at: at(-26 * DAY) },
      ],
      decision: {
        outcome: "refund_client",
        summary: "Produit défectueux reconnu par le vendeur. Remboursement intégral de la cliente.",
        decidedAt: at(-26 * DAY),
      },
      createdAt: at(-30 * DAY),
      updatedAt: at(-26 * DAY),
    },
  ]

  const notification = (
    userId: string,
    id: string,
    type: AppNotification["type"],
    transaction: Transaction,
    offset: number,
    read: boolean,
    extra: Partial<AppNotification> = {},
  ): AppNotification & { userId: string } => ({
    id,
    userId,
    type,
    params: {
      reference: transaction.reference,
      title: transaction.title,
      amount: formatMoney(transaction.amount),
      counterpartName:
        userId === transaction.client.userId ? transaction.merchant.fullName : transaction.client.fullName,
    },
    transactionId: transaction.id,
    disputeId: null,
    createdAt: at(offset),
    readAt: read ? at(offset + HOUR) : null,
    ...extra,
  })

  const t2 = transactions[1]!
  const t11 = transactions[10]!
  const notifications = [
    notification(DEMO_USERS.aissatou, "ntf_demo_01", "delivery_completed", t6, -6 * HOUR, false),
    notification(DEMO_USERS.aissatou, "ntf_demo_02", "transaction_proposed", t2, -1 * DAY, false),
    notification(DEMO_USERS.aissatou, "ntf_demo_03", "delivery_started", t5, -1 * DAY, true),
    notification(DEMO_USERS.aissatou, "ntf_demo_04", "payment_expired", t3, -2 * DAY + 25 * MINUTE, true),
    notification(DEMO_USERS.aissatou, "ntf_demo_05", "dispute_status_changed", t7, -1 * DAY, true, {
      disputeId: "dsp_demo_01",
      params: { reference: "LT-26-0201", status: "En examen" },
    }),
    notification(DEMO_USERS.moussa, "ntf_demo_10", "payment_confirmed", t4, -4 * DAY + 24 * MINUTE, false),
    notification(DEMO_USERS.moussa, "ntf_demo_11", "dispute_opened", t7, -3 * DAY, true, {
      disputeId: "dsp_demo_01",
    }),
    notification(DEMO_USERS.fatou, "ntf_demo_20", "terms_accepted", t3, -2 * DAY, false),
    notification(DEMO_USERS.fatou, "ntf_demo_21", "receipt_confirmed", t8, -29 * DAY, true),
    notification(DEMO_USERS.ibrahima, "ntf_demo_30", "transaction_proposed", t11, -6 * HOUR, false),
    notification(DEMO_USERS.ibrahima, "ntf_demo_31", "payment_confirmed", t4, -4 * DAY + 24 * MINUTE, true),
  ]

  return {
    version: 1,
    users,
    sessionUserId: null,
    transactions,
    payments,
    disputes,
    notifications,
    preferences: Object.fromEntries(users.map((user) => [user.id, defaultPreferences()])),
    counters: { transaction: 1040 + referenceCounter, dispute: 210 },
  }
}
