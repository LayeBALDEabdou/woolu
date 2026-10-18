import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api/errors"
import { queryKeys } from "@/lib/api/query-keys"
import { DEMO_USERS, createTestServices, renderWithProviders } from "@/tests/test-utils"
import { routerMock } from "@/tests/setup"
import { VerifyEmailView } from "./verify-email-view"

const search = vi.hoisted(() => ({ params: new URLSearchParams() }))

vi.mock("next/navigation", async () => {
  const { routerMock: router } = await import("@/tests/setup")
  return { useRouter: () => router, useSearchParams: () => search.params }
})

describe("VerifyEmailView", () => {
  it("confirme l'adresse une seule fois puis ouvre la session", async () => {
    search.params = new URLSearchParams("token=MQ.abc-123")
    const { services, session } = await createTestServices(DEMO_USERS.moussa)
    const verifySpy = vi.spyOn(services.auth, "verifyEmail").mockResolvedValue(session!)
    const { queryClient } = renderWithProviders(<VerifyEmailView />, { services })

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/dashboard"))
    expect(verifySpy).toHaveBeenCalledTimes(1)
    expect(verifySpy).toHaveBeenCalledWith("MQ.abc-123")
    expect(queryClient.getQueryData(queryKeys.session)).toEqual(session)
  })

  it("explique un lien expiré et propose d'en recevoir un nouveau", async () => {
    search.params = new URLSearchParams("token=perime")
    const { services } = await createTestServices()
    vi.spyOn(services.auth, "verifyEmail").mockRejectedValue(
      new ApiError("VALIDATION", "Ce lien de confirmation est invalide ou a expiré."),
    )
    renderWithProviders(<VerifyEmailView />, { services })

    expect(
      await screen.findByText(/Ce lien de confirmation est invalide ou a expiré/),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Recevoir un nouveau lien" })).toBeInTheDocument()
    expect(routerMock.replace).not.toHaveBeenCalled()
  })

  it("signale un lien sans jeton", async () => {
    search.params = new URLSearchParams()
    const { services } = await createTestServices()
    const verifySpy = vi.spyOn(services.auth, "verifyEmail")
    renderWithProviders(<VerifyEmailView />, { services })

    expect(screen.getByText(/Ce lien de confirmation est incomplet/)).toBeInTheDocument()
    expect(verifySpy).not.toHaveBeenCalled()
  })
})
