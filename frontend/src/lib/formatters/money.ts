import type { CurrencyCode, Money } from "@/types/common"

/** Nombre de décimales de chaque devise (ISO 4217). */
const CURRENCY_EXPONENT: Record<CurrencyCode, number> = { XOF: 0 }

const formatters = new Map<CurrencyCode, Intl.NumberFormat>()

function getFormatter(currency: CurrencyCode): Intl.NumberFormat {
  let formatter = formatters.get(currency)
  if (!formatter) {
    const digits = CURRENCY_EXPONENT[currency]
    formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    formatters.set(currency, formatter)
  }
  return formatter
}

/** Formate un montant : { amount: 25000, currency: "XOF" } ⇒ « 25 000 F CFA ». */
export function formatMoney(money: Money): string {
  const exponent = CURRENCY_EXPONENT[money.currency]
  const major = exponent === 0 ? money.amount : money.amount / 10 ** exponent
  // Uniformise les espaces insécables fines produites par Intl pour un rendu et des tests stables.
  return getFormatter(money.currency).format(major).replace(/[  ]/g, " ")
}

export function xof(amount: number): Money {
  return { amount, currency: "XOF" }
}

/**
 * Convertit une saisie utilisateur en montant XOF entier.
 * Accepte les séparateurs de milliers usuels (« 25 000 », « 25.000 », « 25000 »).
 * Retourne null si la saisie n'est pas un entier positif valide (les décimales sont refusées).
 */
export function parseXofInput(input: string): number | null {
  const normalized = input.replace(/[\s  .]/g, "").replace(/(f\s*cfa|fcfa|xof)$/i, "")
  if (!/^\d+$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isSafeInteger(value) ? value : null
}

/** Somme exacte de montants entiers d'une même devise. */
export function sumMoney(values: Money[], currency: CurrencyCode = "XOF"): Money {
  let total = 0
  for (const value of values) {
    if (value.currency !== currency) {
      throw new Error(`Devise inattendue : ${value.currency}`)
    }
    total += value.amount
  }
  if (!Number.isSafeInteger(total)) throw new Error("Montant hors limites")
  return { amount: total, currency }
}

export function formatSats(sats: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(sats).replace(/[  ]/g, " ")} sats`
}
