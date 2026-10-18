import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DEMO_USERS, createTestServices, renderWithProviders } from "@/tests/test-utils"
import { PaymentView } from "./payment-view"

describe("PaymentView", () => {
  it("crée une adresse et reste en attente : aucun paiement n'est simulé par un clic", async () => {
    const user = userEvent.setup()
    const { services, session } = await createTestServices(DEMO_USERS.aissatou)
    const initiateSpy = vi.spyOn(services.payments, "initiate")
    renderWithProviders(<PaymentView transactionId="trx_demo_03" />, { services, session })

    expect(await screen.findByText("La dernière demande de paiement a expiré")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Créer une nouvelle adresse" }))

    await waitFor(() => expect(initiateSpy).toHaveBeenCalledWith("trx_demo_03", "usdc"))
    expect(await screen.findByText(/En attente de la confirmation du paiement par le serveur/)).toBeInTheDocument()
    expect(screen.getByText(/Adresse fictive/)).toBeInTheDocument()
    expect(screen.getByText("Adresse USDC · Solana")).toBeInTheDocument()
    expect(screen.queryByText("Paiement confirmé par le serveur")).not.toBeInTheDocument()
    expect(screen.queryByText("Fonds bloqués")).not.toBeInTheDocument()

    const transaction = await services.transactions.get("trx_demo_03")
    expect(transaction.status).toBe("pending_payment")
    expect(transaction.escrow.status).toBe("not_started")
  })

  it("refuse le paiement au vendeur", async () => {
    const { services, session } = await createTestServices(DEMO_USERS.fatou)
    renderWithProviders(<PaymentView transactionId="trx_demo_03" />, { services, session })
    expect(await screen.findByText("Paiement indisponible")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Générer/ })).not.toBeInTheDocument()
  })

  it("affiche la confirmation et les fonds bloqués une fois le paiement confirmé par le serveur", async () => {
    const { services, session } = await createTestServices(DEMO_USERS.ibrahima)
    const transactionSpy = vi.spyOn(services.transactions, "get")
    renderWithProviders(<PaymentView transactionId="trx_demo_04" />, { services, session })
    expect(await screen.findByText("Paiement confirmé par le serveur")).toBeInTheDocument()
    expect(screen.getByText("Fonds bloqués")).toBeInTheDocument()
    await waitFor(() => expect(transactionSpy).toHaveBeenCalledTimes(2))
  })
})
