import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api/errors"
import { createTestServices, renderWithProviders } from "@/tests/test-utils"
import { routerMock } from "@/tests/setup"
import { LoginForm } from "./login-form"

describe("LoginForm", () => {
  it("propose de renvoyer le lien quand l'adresse n'est pas confirmée", async () => {
    const user = userEvent.setup()
    const { services } = await createTestServices()
    vi.spyOn(services.auth, "login").mockRejectedValue(new ApiError("EMAIL_NOT_VERIFIED"))
    const resendSpy = vi.spyOn(services.auth, "resendVerification").mockResolvedValue()
    renderWithProviders(<LoginForm />, { services })

    await user.type(screen.getByLabelText("Adresse e-mail"), "awa@example.com")
    await user.type(screen.getByLabelText("Mot de passe"), "motdepasse42")
    await user.click(screen.getByRole("button", { name: "Se connecter" }))

    expect(await screen.findByText("Adresse e-mail à confirmer")).toBeInTheDocument()
    expect(screen.getByText("awa@example.com")).toBeInTheDocument()
    expect(routerMock.replace).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Renvoyer le lien" }))
    await waitFor(() => expect(resendSpy).toHaveBeenCalledWith("awa@example.com"))
    expect(await screen.findByRole("button", { name: "Lien renvoyé" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Retour à la connexion" }))
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument()
  })
})
