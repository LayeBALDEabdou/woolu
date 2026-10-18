import { describe, expect, it } from "vitest"
import type { TransactionStatus, TransactionSummary } from "../types"
import {
  ACTION_RULES,
  STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  TRANSACTION_ACTIONS,
  canTransition,
  checkAction,
  getAvailableActions,
} from "./transitions"

const MERCHANT = { userId: "merchant-1" }
const CLIENT = { userId: "client-1" }
const OUTSIDER = { userId: "someone-else" }

function tx(status: TransactionStatus, overrides: Partial<TransactionSummary> = {}) {
  return {
    status,
    merchant: { userId: MERCHANT.userId, fullName: "M", email: null, phone: null, role: "vendeur" as const },
    client: { userId: CLIENT.userId, fullName: "C", email: null, phone: null, role: "client" as const },
    escrow: { status: "not_started" as const, updatedAt: null },
    activeDisputeId: null,
    ...overrides,
  }
}

const HELD = { escrow: { status: "held" as const, updatedAt: "2026-10-01T10:00:00.000Z" } }

describe("graphe des statuts", () => {
  it("n'autorise aucune transition depuis un état terminal", () => {
    for (const status of TERMINAL_STATUSES) expect(STATUS_TRANSITIONS[status]).toEqual([])
  })

  it("chaque action utilisateur respecte le graphe des transitions", () => {
    for (const action of TRANSACTION_ACTIONS) {
      const rule = ACTION_RULES[action]
      if (!rule.to) continue
      for (const statuses of Object.values(rule.allowedFrom)) {
        for (const from of statuses ?? []) expect(canTransition(from, rule.to)).toBe(true)
      }
    }
  })

  it("interdit les sauts incohérents", () => {
    expect(canTransition("pending_acceptance", "payment_confirmed")).toBe(false)
    expect(canTransition("pending_payment", "completed")).toBe(false)
    expect(canTransition("disputed", "awaiting_confirmation")).toBe(false)
    expect(canTransition("completed", "refunded")).toBe(false)
  })
})

describe("actions selon le rôle et l'état", () => {
  it("le vendeur envoie un brouillon, le client ne peut rien faire dessus", () => {
    expect(getAvailableActions(tx("created"), MERCHANT)).toEqual(["send_to_client", "cancel"])
    expect(getAvailableActions(tx("created"), CLIENT)).toEqual([])
  })

  it("seul le client accepte ou refuse les conditions", () => {
    expect(getAvailableActions(tx("pending_acceptance"), CLIENT)).toEqual(["accept_terms", "refuse_terms"])
    expect(getAvailableActions(tx("pending_acceptance"), MERCHANT)).toEqual(["cancel"])
  })

  it("seul le client peut payer, et seulement après acceptation", () => {
    expect(checkAction("pay", tx("pending_payment"), CLIENT).allowed).toBe(true)
    expect(checkAction("pay", tx("pending_payment"), MERCHANT).allowed).toBe(false)
    expect(checkAction("pay", tx("pending_acceptance"), CLIENT).allowed).toBe(false)
  })

  it("le vendeur ne livre qu'après confirmation du paiement", () => {
    expect(checkAction("start_delivery", tx("pending_payment"), MERCHANT).allowed).toBe(false)
    expect(checkAction("start_delivery", tx("payment_confirmed", HELD), MERCHANT).allowed).toBe(true)
  })

  it("la confirmation de réception exige un séquestre confirmé par le serveur", () => {
    expect(checkAction("confirm_receipt", tx("awaiting_confirmation", HELD), CLIENT).allowed).toBe(true)
    const result = checkAction("confirm_receipt", tx("awaiting_confirmation"), CLIENT)
    expect(result).toEqual({ allowed: false, reason: expect.stringContaining("séquestre") })
  })

  it("un litige bloque la confirmation et l'ouverture d'une seconde réclamation", () => {
    const disputed = tx("disputed", { ...HELD, activeDisputeId: "d1" })
    expect(getAvailableActions(disputed, CLIENT)).toEqual([])
    expect(getAvailableActions(disputed, MERCHANT)).toEqual([])
  })

  it("aucune action n'est possible sur une transaction terminée", () => {
    for (const status of TERMINAL_STATUSES) {
      expect(getAvailableActions(tx(status, HELD), CLIENT)).toEqual([])
      expect(getAvailableActions(tx(status, HELD), MERCHANT)).toEqual([])
    }
  })

  it("refuse toute action à un tiers", () => {
    expect(checkAction("accept_terms", tx("pending_acceptance"), OUTSIDER)).toEqual({
      allowed: false,
      reason: expect.stringContaining("partie prenante"),
    })
  })
})
