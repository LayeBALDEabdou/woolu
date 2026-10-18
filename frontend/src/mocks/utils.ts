let sequence = 0

/** Identifiant unique suffisant pour la démo (pas de dépendance à crypto, indisponible hors HTTPS). */
export function demoId(prefix: string): string {
  sequence += 1
  return `${prefix}_${Date.now().toString(36)}${sequence.toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/** Latence réseau simulée, désactivée pendant les tests. */
export function simulateLatency(ms = 250): Promise<void> {
  if (process.env.NODE_ENV === "test") return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isoAt(base: number, offsetMs: number): string {
  return new Date(base + offsetMs).toISOString()
}

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** Recherche insensible à la casse et aux accents. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/[^\d]/g, "")
  return digits.startsWith("221") ? digits.slice(3) : digits
}

/** Taux de conversion FICTIF utilisé uniquement pour afficher un montant USDC en démo. */
export function fakeXofToUsdc(amountXof: number): string {
  return (amountXof / 600).toFixed(6)
}
