/**
 * Paramètres métier affichés ou validés côté interface.
 * ⚠ Ce sont des HYPOTHÈSES à valider (voir docs/DECISIONS.md) : le backend reste la
 * source de vérité et doit appliquer ses propres limites.
 */
export const BUSINESS_RULES = {
  minTransactionAmountXof: 1_000,
  maxTransactionAmountXof: 10_000_000,
  /** Délai d'exécution maximal proposé à la création, en jours. */
  maxDeadlineDays: 180,
  /** Délais de réclamation proposés au vendeur à la création, en jours après livraison. */
  claimWindowOptions: [3, 7, 14] as const,
  defaultClaimWindowDays: 7,
} as const

export type ClaimWindowDays = (typeof BUSINESS_RULES.claimWindowOptions)[number]
