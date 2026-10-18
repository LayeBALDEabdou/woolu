import type { ISODateString } from "@/types/common"

/** Fuseau de référence de l'application (Sénégal, UTC+0 sans heure d'été). */
export const APP_TIME_ZONE = "Africa/Dakar"

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: APP_TIME_ZONE,
})

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
})

export function formatDate(value: ISODateString): string {
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: ISODateString): string {
  return dateTimeFormatter.format(new Date(value))
}

const relativeFormatter = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" })

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
]

/** « il y a 3 heures », « dans 2 jours »… `now` est injectable pour les tests. */
export function formatRelative(value: ISODateString, now: number = Date.now()): string {
  const diff = new Date(value).getTime() - now
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return relativeFormatter.format(Math.round(diff / ms), unit)
  }
  return "à l'instant"
}

/** Nombre de jours calendaires entre maintenant et l'échéance (négatif si dépassée). */
export function daysUntil(value: ISODateString, now: number = Date.now()): number {
  return Math.ceil((new Date(value).getTime() - now) / 86_400_000)
}

/** Durée restante au format mm:ss (pour l'expiration d'une facture). */
export function formatCountdown(msRemaining: number): string {
  const total = Math.max(0, Math.floor(msRemaining / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

/** Date du jour (YYYY-MM-DD) dans le fuseau de l'application. */
export function todayInAppTimeZone(now: number = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(new Date(now))
}
