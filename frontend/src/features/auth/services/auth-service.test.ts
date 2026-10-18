import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api/errors"
import { HttpClient } from "@/lib/api/http-client"
import { createHttpAuthService } from "./auth-service"

const USER = {
  id: "7",
  fullName: "Awa Fall",
  email: "awa@example.com",
  phone: null,
  role: "vendeur",
  createdAt: "2026-10-18T10:00:00Z",
}

function mockFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const auth = createHttpAuthService(new HttpClient("http://api.test"))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("service d'authentification HTTP", () => {
  it("signale une inscription en attente de confirmation de l'adresse e-mail", async () => {
    const fetchMock = mockFetch(201, { user: USER, verificationRequired: true })
    const result = await auth.register({
      fullName: "Awa Fall",
      email: "awa@example.com",
      phone: null,
      role: "vendeur",
      password: "motdepasse42",
    })
    expect(result).toEqual({ status: "verification_required", email: "awa@example.com" })
    expect(fetchMock.mock.calls[0][0].toString()).toBe("http://api.test/api/auth/register")
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", credentials: "include" })
  })

  it("ouvre la session si le backend en renvoie une à l'inscription", async () => {
    mockFetch(201, { user: USER, isDemo: false })
    const result = await auth.register({
      fullName: "Awa Fall",
      email: "awa@example.com",
      phone: null,
      role: "vendeur",
      password: "motdepasse42",
    })
    expect(result).toEqual({ status: "authenticated", session: { user: USER, isDemo: false } })
  })

  it("reconnaît le refus de connexion d'une adresse non confirmée", async () => {
    mockFetch(403, {
      code: "EMAIL_NOT_VERIFIED",
      message: "Confirmez votre adresse e-mail.",
      fieldErrors: {},
    })
    const error = await auth
      .login({ email: "awa@example.com", password: "motdepasse42" })
      .catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
      message: "Confirmez votre adresse e-mail.",
      status: 403,
    })
  })

  it("renvoie null quand aucune session n'est ouverte", async () => {
    mockFetch(401, { code: "UNAUTHENTICATED", message: "Votre session a expiré.", fieldErrors: {} })
    await expect(auth.getSession()).resolves.toBeNull()
  })

  it("confirme l'adresse avec le jeton du lien", async () => {
    const fetchMock = mockFetch(200, { user: USER, isDemo: false })
    await expect(auth.verifyEmail("MQ.abc-123")).resolves.toEqual({ user: USER, isDemo: false })
    expect(fetchMock.mock.calls[0][0].toString()).toBe("http://api.test/api/auth/email/verify")
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: "MQ.abc-123" })
  })
})
