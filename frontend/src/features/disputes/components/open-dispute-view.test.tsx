import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DEMO_USERS, createTestServices, renderWithProviders } from "@/tests/test-utils"
import { routerMock } from "@/tests/setup"
import { OpenDisputeView } from "./open-dispute-view"

describe("OpenDisputeView", () => {
  it("ouvre une réclamation avec motif et description", async () => {
    const user = userEvent.setup()
    const { services, session } = await createTestServices(DEMO_USERS.aissatou)
    const openSpy = vi.spyOn(services.disputes, "open")
    renderWithProviders(<OpenDisputeView transactionId="trx_demo_05" />, { services, session })

    await user.click(await screen.findByRole("radio", { name: "Produit non reçu" }))
    await user.type(
      screen.getByLabelText("Description du problème"),
      "Le livreur n'est jamais passé alors que la date limite est atteinte.",
    )
    await user.click(screen.getByRole("checkbox"))
    await user.click(screen.getByRole("button", { name: "Ouvrir la réclamation" }))

    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith({
        transactionId: "trx_demo_05",
        reason: "not_received",
        description: "Le livreur n'est jamais passé alors que la date limite est atteinte.",
      }),
    )
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith(expect.stringMatching(/^\/reclamations\//)))
    expect((await services.transactions.get("trx_demo_05")).status).toBe("disputed")
  })

  it("propose uniquement les motifs adaptés à une prestation", async () => {
    const { services, session } = await createTestServices(DEMO_USERS.aissatou)
    renderWithProviders(<OpenDisputeView transactionId="trx_demo_06" />, { services, session })
    expect(await screen.findByRole("radio", { name: "Service non réalisé" })).toBeInTheDocument()
    expect(screen.queryByRole("radio", { name: "Produit non reçu" })).not.toBeInTheDocument()
  })

  it("empêche une réclamation incompatible avec l'état de la transaction", async () => {
    const { services, session } = await createTestServices(DEMO_USERS.aissatou)
    renderWithProviders(<OpenDisputeView transactionId="trx_demo_07" />, { services, session })
    expect(await screen.findByText("Réclamation impossible")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Voir la réclamation en cours" })).toHaveAttribute(
      "href",
      "/reclamations/dsp_demo_01",
    )
  })
})
