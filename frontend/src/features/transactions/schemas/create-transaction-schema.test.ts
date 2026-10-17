import { describe, expect, it } from "vitest"
import { createTransactionSchema, defaultCreateTransactionValues } from "./create-transaction-schema"

// 17 octobre 2026, 10 h à Dakar.
const NOW = Date.UTC(2026, 9, 17, 10, 0, 0)
const schema = createTransactionSchema(NOW)

const valid = {
  ...defaultCreateTransactionValues("product"),
  title: "Réfrigérateur 2 portes",
  description: "Réfrigérateur combiné 300 L, neuf, garantie 2 ans.",
  clientName: "Aïssatou Diop",
  clientContact: "77 123 45 67",
  amount: "210 000",
  deadline: "2026-10-25",
  merchantAcceptsTerms: true,
}

function errorsOf(values: Record<string, unknown>) {
  const result = schema.safeParse(values)
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]))
}

describe("schéma de création de transaction", () => {
  it("accepte une saisie valide et convertit les valeurs", () => {
    const result = schema.parse(valid)
    expect(result.amount).toBe(210000)
    expect(result.claimWindowDays).toBe(7)
    expect(result.clientContact).toBe("771234567")
    expect(result.specialConditions).toBeNull()
  })

  it("refuse un montant décimal ou hors limites", () => {
    expect(errorsOf({ ...valid, amount: "1500,50" }).amount).toMatch(/entier/)
    expect(errorsOf({ ...valid, amount: "500" }).amount).toMatch(/minimum/)
    expect(errorsOf({ ...valid, amount: "20 000 000" }).amount).toMatch(/maximum/)
  })

  it("refuse une date limite passée, du jour ou trop lointaine", () => {
    expect(errorsOf({ ...valid, deadline: "2026-10-17" }).deadline).toMatch(/postérieure/)
    expect(errorsOf({ ...valid, deadline: "2027-06-01" }).deadline).toMatch(/180 jours/)
  })

  it("exige un contact client valide (e-mail ou téléphone sénégalais)", () => {
    expect(errorsOf({ ...valid, clientContact: "12345" }).clientContact).toBeDefined()
    expect(errorsOf({ ...valid, clientContact: "client@" }).clientContact).toBeDefined()
    expect(schema.parse({ ...valid, clientContact: "Client@Example.com" }).clientContact).toBe("client@example.com")
    expect(schema.parse({ ...valid, clientContact: "+221 76 000 00 03" }).clientContact).toBe("+221760000003")
  })

  it("exige l'acceptation explicite des conditions par le vendeur", () => {
    expect(errorsOf({ ...valid, merchantAcceptsTerms: false }).merchantAcceptsTerms).toMatch(/accepter/)
  })

  it("exige une description suffisamment précise", () => {
    expect(errorsOf({ ...valid, description: "Trop court" }).description).toBeDefined()
  })
})
