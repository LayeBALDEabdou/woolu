import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { EscrowIndicator } from "@/features/payments/components/escrow-indicator"
import { DEMO_USERS, createTestServices, renderWithProviders } from "@/tests/test-utils"
import { TransactionActionsPanel } from "./transaction-actions-panel"
import { TransactionStatusBadge } from "./transaction-status-badge"

describe("TransactionStatusBadge", () => {
  it("affiche le libellé centralisé, adapté aux prestations", () => {
    const { rerender } = renderWithProviders(<TransactionStatusBadge status="in_progress" kind="product" />, {
      services: {} as never,
    })
    expect(screen.getByText("Livraison en cours")).toBeInTheDocument()
    rerender(<TransactionStatusBadge status="in_progress" kind="service" />)
    expect(screen.getByText("Réalisation en cours")).toBeInTheDocument()
    rerender(<TransactionStatusBadge status="disputed" />)
    expect(screen.getByText("Litige en cours")).toBeInTheDocument()
  })
})

describe("EscrowIndicator", () => {
  it("n'affiche « Fonds bloqués » que si le serveur a confirmé le séquestre", () => {
    const { rerender } = renderWithProviders(
      <EscrowIndicator transaction={{ status: "payment_confirmed", escrow: { status: "not_started", updatedAt: null } }} />,
      { services: {} as never },
    )
    expect(screen.queryByText("Fonds bloqués")).not.toBeInTheDocument()
    expect(screen.getByText("Séquestre en attente de confirmation")).toBeInTheDocument()

    rerender(
      <EscrowIndicator
        transaction={{ status: "payment_confirmed", escrow: { status: "held", updatedAt: "2026-10-10T10:00:00.000Z" } }}
      />,
    )
    expect(screen.getByText("Fonds bloqués")).toBeInTheDocument()
  })
})

describe("TransactionActionsPanel", () => {
  it("propose au client d'accepter, et exige une confirmation explicite", async () => {
    const user = userEvent.setup()
    const { services, session } = await createTestServices(DEMO_USERS.aissatou)
    const transaction = await services.transactions.get("trx_demo_02")
    const acceptSpy = vi.spyOn(services.transactions, "acceptTerms")

    renderWithProviders(<TransactionActionsPanel transaction={transaction} viewerId={DEMO_USERS.aissatou} />, {
      services,
      session,
    })

    await user.click(screen.getByRole("button", { name: "Accepter les conditions" }))
    const dialog = await screen.findByRole("dialog")
    const confirm = within(dialog).getByRole("button", { name: "J'accepte les conditions" })
    expect(confirm).toBeDisabled()

    await user.click(within(dialog).getByRole("checkbox"))
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    await waitFor(() => expect(acceptSpy).toHaveBeenCalledWith("trx_demo_02"))
    expect((await services.transactions.get("trx_demo_02")).status).toBe("pending_payment")
  })

  it("n'offre au vendeur que l'annulation pendant l'attente d'acceptation", async () => {
    const { services, session } = await createTestServices(DEMO_USERS.moussa)
    const transaction = await services.transactions.get("trx_demo_02")
    renderWithProviders(<TransactionActionsPanel transaction={transaction} viewerId={DEMO_USERS.moussa} />, {
      services,
      session,
    })
    expect(screen.queryByRole("button", { name: "Accepter les conditions" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Annuler la transaction" })).toBeInTheDocument()
    expect(screen.getByText(/En attente de la réponse de Aïssatou Diop/)).toBeInTheDocument()
  })

  it("bloque toute action du client pendant un litige", async () => {
    const { services, session } = await createTestServices(DEMO_USERS.aissatou)
    const transaction = await services.transactions.get("trx_demo_07")
    renderWithProviders(<TransactionActionsPanel transaction={transaction} viewerId={DEMO_USERS.aissatou} />, {
      services,
      session,
    })
    expect(screen.queryByRole("button", { name: /Confirmer/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Signaler un problème/ })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Voir la réclamation" })).toBeInTheDocument()
  })

  it("la confirmation de réception exige de cocher la vérification avant d'appeler le serveur", async () => {
    const user = userEvent.setup()
    const { services, session } = await createTestServices(DEMO_USERS.aissatou)
    const transaction = await services.transactions.get("trx_demo_06")
    const confirmSpy = vi.spyOn(services.deliveries, "confirmReceipt")

    renderWithProviders(<TransactionActionsPanel transaction={transaction} viewerId={DEMO_USERS.aissatou} />, {
      services,
      session,
    })

    await user.click(screen.getByRole("button", { name: "Confirmer la prestation" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/Cette confirmation est définitive/)).toBeInTheDocument()
    const confirm = within(dialog).getByRole("button", { name: "Je confirme" })
    await user.click(confirm)
    expect(confirmSpy).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("checkbox"))
    await user.click(confirm)
    await waitFor(() => expect(confirmSpy).toHaveBeenCalledWith("trx_demo_06"))
    expect((await services.transactions.get("trx_demo_06")).status).toBe("completed")
  })
})
