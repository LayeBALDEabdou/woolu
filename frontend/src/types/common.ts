/** Date au format ISO 8601 telle que renvoyée par l'API (ex. 2026-10-17T10:00:00.000Z). */
export type ISODateString = string

/** Date calendaire sans heure (ex. 2026-11-02). */
export type ISODateOnly = string

export const SUPPORTED_CURRENCIES = ["XOF"] as const
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

/**
 * Montant monétaire exprimé en unités mineures entières de la devise.
 * Le franc CFA (XOF) n'a pas de subdivision : 25 000 FCFA ⇒ { amount: 25000, currency: "XOF" }.
 * Les montants ne sont jamais manipulés en nombres flottants.
 */
export interface Money {
  amount: number
  currency: CurrencyCode
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}
