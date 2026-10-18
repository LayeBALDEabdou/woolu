import { describe, expect, it } from "vitest"
import type { CreateTransactionInput } from "@/features/transactions/types"
import { ApiError } from "@/lib/api/errors"
import { DEMO_USERS, createTestServices } from "@/tests/test-utils"

const INPUT: CreateTransactionInput = {
  title: "Machine à laver 7 kg",
  kind: "product",
  description: "Machine à laver hublot 7 kg, neuve, garantie 1 an.",
  clientName: "Aïssatou Diop",
  clientContact: "aissatou.diop@example.com",
  amount: 185_000,
  currency: "XOF",
  deadline: "2030-01-15",
  specialConditions: null,
  claimWindowDays: 7,
  merchantAcceptsTerms: true,
}

async function rejectionCode(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error instanceof ApiError ? error.code : "OTHER"
  }
  return "RESOLVED"
}

describe("backend simulé : parcours complet", () => {
  it("création → envoi → acceptation → paiement en attente → confirmation serveur → livraison → réception", async () => {
    const { services } = await createTestServices(DEMO_USERS.moussa)
    const { transactions, payments, deliveries, demo } = services

    // Création par le vendeur : brouillon, invisible pour le client tant qu'il n'est pas envoyé.
    const created = await transactions.create(INPUT)
    expect(created.status).toBe("created")
    expect(created.amount).toEqual({ amount: 185_000, currency: "XOF" })
    expect(created.client.userId).toBe(DEMO_USERS.aissatou)
    expect(created.merchantAcceptedAt).not.toBeNull()

    await demo!.switchAccount(DEMO_USERS.aissatou)
    expect(await rejectionCode(transactions.get(created.id))).toBe("NOT_FOUND")

    await demo!.switchAccount(DEMO_USERS.moussa)
    expect((await transactions.sendToClient(created.id)).status).toBe("pending_acceptance")

    // Le vendeur ne peut pas accepter à la place du client.
    expect(await rejectionCode(transactions.acceptTerms(created.id))).toBe("INVALID_TRANSITION")

    await demo!.switchAccount(DEMO_USERS.aissatou)
    const accepted = await transactions.acceptTerms(created.id)
    expect(accepted.status).toBe("pending_payment")
    expect(accepted.clientAcceptedAt).not.toBeNull()

    // Initier un paiement ne confirme rien : la transaction reste en attente, sans séquestre.
    const attempt = await payments.initiate(created.id, "usdc")
    expect(attempt.status).toBe("pending")
    expect(attempt.isSimulated).toBe(true)
    const afterInitiate = await transactions.get(created.id)
    expect(afterInitiate.status).toBe("pending_payment")
    expect(afterInitiate.escrow.status).toBe("not_started")

    // Une seconde facture ne peut pas être émise tant que la première est en attente.
    expect(await rejectionCode(payments.initiate(created.id, "usdc"))).toBe("CONFLICT")

    // Seul l'événement serveur (webhook simulé) confirme le paiement et le séquestre.
    await demo!.confirmPayment(attempt.id)
    const paid = await transactions.get(created.id)
    expect(paid.status).toBe("payment_confirmed")
    expect(paid.escrow.status).toBe("held")
    expect(paid.escrow.updatedAt).not.toBeNull()

    // Le client ne peut pas déclarer la livraison.
    expect(await rejectionCode(deliveries.start(created.id, { method: "courier", carrier: null, trackingNumber: null, note: null }))).toBe(
      "INVALID_TRANSITION",
    )

    await demo!.switchAccount(DEMO_USERS.moussa)
    expect((await deliveries.start(created.id, { method: "courier", carrier: "Livreur", trackingNumber: null, note: null })).status).toBe(
      "in_progress",
    )
    expect((await deliveries.complete(created.id, { note: "Remis au client" })).status).toBe("awaiting_confirmation")

    await demo!.switchAccount(DEMO_USERS.aissatou)
    const completed = await deliveries.confirmReceipt(created.id)
    expect(completed.status).toBe("completed")
    expect(completed.escrow.status).toBe("released")
    expect(completed.events.map((e) => e.type)).toEqual(
      expect.arrayContaining(["payment_confirmed", "escrow_held", "receipt_confirmed", "funds_released"]),
    )
  })

  it("une réclamation bloque la confirmation ; seule la décision serveur clôt le litige", async () => {
    const { services } = await createTestServices(DEMO_USERS.aissatou)
    const { disputes, deliveries, transactions, demo } = services

    // Transaction de démo en attente de confirmation (site vitrine).
    const dispute = await disputes.open({
      transactionId: "trx_demo_06",
      reason: "service_not_performed",
      description: "Le formulaire de réservation ne fonctionne pas et deux pages sont manquantes.",
    })
    expect(dispute.status).toBe("open")

    const disputed = await transactions.get("trx_demo_06")
    expect(disputed.status).toBe("disputed")
    expect(disputed.escrow.status).toBe("held")
    expect(disputed.activeDisputeId).toBe(dispute.id)

    // Plus de confirmation ni de seconde réclamation possibles.
    expect(await rejectionCode(deliveries.confirmReceipt("trx_demo_06"))).toBe("INVALID_TRANSITION")
    expect(
      await rejectionCode(
        disputes.open({ transactionId: "trx_demo_06", reason: "other", description: "Une deuxième réclamation sur le même dossier." }),
      ),
    ).toBe("INVALID_TRANSITION")

    // La réponse du prestataire fait passer le dossier en examen.
    await demo!.switchAccount(DEMO_USERS.fatou)
    expect((await disputes.reply(dispute.id, "Je corrige le formulaire d'ici demain.")).status).toBe("under_review")

    await demo!.decideDispute(dispute.id, "refund_client")
    const refunded = await transactions.get("trx_demo_06")
    expect(refunded.status).toBe("refunded")
    expect(refunded.escrow.status).toBe("refunded")
    expect(refunded.activeDisputeId).toBeNull()
    expect((await disputes.get(dispute.id)).decision?.outcome).toBe("refund_client")
  })

  it("un client ne peut pas créer de transaction et un tiers ne voit pas les transactions des autres", async () => {
    const { services } = await createTestServices(DEMO_USERS.ibrahima)
    expect(await rejectionCode(services.transactions.create(INPUT))).toBe("FORBIDDEN")
    // trx_demo_05 concerne Moussa et Aïssatou uniquement.
    expect(await rejectionCode(services.transactions.get("trx_demo_05"))).toBe("NOT_FOUND")
  })

  it("une facture dont l'échéance est dépassée est expirée par le serveur", async () => {
    const { services } = await createTestServices(DEMO_USERS.aissatou)
    const attempt = await services.payments.initiate("trx_demo_03", "usdc")
    await services.demo!.expirePayment(attempt.id)
    expect((await services.payments.getAttempt(attempt.id)).status).toBe("expired")
    // Une nouvelle tentative est alors autorisée.
    expect((await services.payments.initiate("trx_demo_03", "usdc")).status).toBe("pending")
  })

  it("exige une session", async () => {
    const { services } = await createTestServices()
    expect(await services.auth.getSession()).toBeNull()
    expect(await rejectionCode(services.transactions.list({}))).toBe("UNAUTHENTICATED")
  })
})
