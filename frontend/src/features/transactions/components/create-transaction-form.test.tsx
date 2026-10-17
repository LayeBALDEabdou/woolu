import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DEMO_USERS, createTestServices, renderWithProviders } from "@/tests/test-utils"
import { routerMock } from "@/tests/setup"
import { CreateTransactionForm } from "./create-transaction-form"

function futureDate(days: number) {
  const date = new Date(Date.now() + days * 86_400_000)
  return date.toISOString().slice(0, 10)
}

describe("CreateTransactionForm", () => {
  it("affiche les erreurs de validation sans appeler le serveur", async () => {
    const user = userEvent.setup()
    const { services, session } = await createTestServices(DEMO_USERS.moussa)
    const createSpy = vi.spyOn(services.transactions, "create")
    renderWithProviders(<CreateTransactionForm role="vendeur" />, { services, session })

    await user.click(screen.getByRole("button", { name: "Vérifier le récapitulatif" }))

    expect(await screen.findByText("Le titre doit contenir au moins 5 caractères.")).toBeInTheDocument()
    expect(screen.getByText("Le montant est obligatoire.")).toBeInTheDocument()
    expect(screen.getByText("Indiquez l'e-mail ou le téléphone du client.")).toBeInTheDocument()
    expect(screen.getByLabelText("Titre de la transaction")).toHaveAttribute("aria-invalid", "true")
    expect(createSpy).not.toHaveBeenCalled()
  })

  it("passe par un récapitulatif et exige l'acceptation avant de créer", async () => {
    const user = userEvent.setup()
    const { services, session } = await createTestServices(DEMO_USERS.moussa)
    const createSpy = vi.spyOn(services.transactions, "create")
    renderWithProviders(<CreateTransactionForm role="vendeur" />, { services, session })

    await user.type(screen.getByLabelText("Titre de la transaction"), "Climatiseur split 12 000 BTU")
    await user.type(
      screen.getByLabelText("Description du produit ou du service"),
      "Climatiseur neuf, installation comprise à Dakar, garantie 2 ans.",
    )
    await user.type(screen.getByLabelText("Nom complet"), "Ibrahima Fall")
    await user.type(screen.getByLabelText("E-mail ou téléphone"), "ibrahima.fall@example.com")
    await user.type(screen.getByLabelText("Montant"), "275 000")
    await user.type(screen.getByLabelText("Date limite de livraison ou d'exécution"), futureDate(10))
    await user.click(screen.getByRole("button", { name: "Vérifier le récapitulatif" }))

    expect(await screen.findByRole("heading", { name: "Récapitulatif avant création" })).toBeInTheDocument()
    expect(screen.getByText("275 000 F CFA")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Créer la transaction" }))
    expect(await screen.findByText("Vous devez confirmer et accepter les conditions proposées.")).toBeInTheDocument()
    expect(createSpy).not.toHaveBeenCalled()

    await user.click(screen.getByRole("checkbox"))
    await user.click(screen.getByRole("button", { name: "Créer la transaction" }))

    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1))
    expect(createSpy.mock.calls[0]![0]).toMatchObject({
      title: "Climatiseur split 12 000 BTU",
      amount: 275000,
      currency: "XOF",
      claimWindowDays: 7,
      merchantAcceptsTerms: true,
    })
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith(expect.stringMatching(/^\/transactions\/trx_/)))
  })
})
