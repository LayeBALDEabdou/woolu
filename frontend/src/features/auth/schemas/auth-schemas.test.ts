import { describe, expect, it } from "vitest"
import { openDisputeSchema } from "@/features/disputes/schemas/dispute-schemas"
import { loginSchema, registerSchema } from "./auth-schemas"

const validRegistration = {
  fullName: "Moussa Ndiaye",
  email: "moussa@example.com",
  phone: "",
  role: "vendeur",
  password: "motdepasse42",
  confirmPassword: "motdepasse42",
  acceptTerms: true,
}

describe("inscription", () => {
  it("accepte une inscription valide (téléphone facultatif)", () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true)
  })

  it("refuse des mots de passe différents", () => {
    const result = registerSchema.safeParse({ ...validRegistration, confirmPassword: "autre12345" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"])
  })

  it("exige un mot de passe robuste", () => {
    expect(registerSchema.safeParse({ ...validRegistration, password: "court1", confirmPassword: "court1" }).success).toBe(false)
    expect(
      registerSchema.safeParse({ ...validRegistration, password: "sanschiffres", confirmPassword: "sanschiffres" }).success,
    ).toBe(false)
  })

  it("refuse un type de compte inconnu et l'absence d'acceptation des conditions", () => {
    expect(registerSchema.safeParse({ ...validRegistration, role: "admin" }).success).toBe(false)
    expect(registerSchema.safeParse({ ...validRegistration, acceptTerms: false }).success).toBe(false)
  })

  it("valide le format du téléphone lorsqu'il est fourni", () => {
    expect(registerSchema.safeParse({ ...validRegistration, phone: "77 123 45 67" }).success).toBe(true)
    expect(registerSchema.safeParse({ ...validRegistration, phone: "0612345678" }).success).toBe(false)
  })
})

describe("connexion", () => {
  it("exige un e-mail valide et un mot de passe", () => {
    expect(loginSchema.safeParse({ email: "pas-un-email", password: "x" }).success).toBe(false)
    expect(loginSchema.safeParse({ email: "a@example.com", password: "" }).success).toBe(false)
  })
})

describe("réclamation", () => {
  it("exige un motif, une description détaillée et la certification", () => {
    expect(openDisputeSchema.safeParse({ reason: "not_received", description: "Pas reçu", confirmAccuracy: true }).success).toBe(false)
    expect(
      openDisputeSchema.safeParse({
        reason: "not_received",
        description: "Le colis n'est jamais arrivé malgré la date limite dépassée de cinq jours.",
        confirmAccuracy: false,
      }).success,
    ).toBe(false)
    expect(
      openDisputeSchema.safeParse({
        reason: "not_received",
        description: "Le colis n'est jamais arrivé malgré la date limite dépassée de cinq jours.",
        confirmAccuracy: true,
      }).success,
    ).toBe(true)
  })
})
