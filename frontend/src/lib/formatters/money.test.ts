import { describe, expect, it } from "vitest"
import { formatMoney, parseXofInput, sumMoney, xof } from "./money"

describe("formatMoney", () => {
  it("formate un montant XOF sans décimales", () => {
    expect(formatMoney(xof(25000))).toBe("25 000 F CFA")
    expect(formatMoney(xof(0))).toBe("0 F CFA")
  })
})

describe("parseXofInput", () => {
  it.each([
    ["25000", 25000],
    ["25 000", 25000],
    ["25.000", 25000],
    ["1 250 000 FCFA", 1250000],
    ["  500 ", 500],
  ])("convertit « %s » en %d", (input, expected) => {
    expect(parseXofInput(input)).toBe(expected)
  })

  it.each(["", "abc", "12,5", "-300", "1e5", "25 000,50"])("refuse « %s »", (input) => {
    expect(parseXofInput(input)).toBeNull()
  })

  it("refuse les entiers non sûrs", () => {
    expect(parseXofInput("99999999999999999999")).toBeNull()
  })
})

describe("sumMoney", () => {
  it("additionne exactement des montants entiers", () => {
    expect(sumMoney([xof(100_000), xof(250_500), xof(1)])).toEqual(xof(350_501))
  })
})
