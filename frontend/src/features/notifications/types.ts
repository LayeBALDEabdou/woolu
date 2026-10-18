import type { Locale } from "@/lib/i18n/locales"
import type { ISODateString } from "@/types/common"

export const NOTIFICATION_TYPES = [
  "transaction_proposed",
  "terms_accepted",
  "terms_refused",
  "transaction_cancelled",
  "payment_confirmed",
  "payment_failed",
  "payment_expired",
  "delivery_started",
  "delivery_completed",
  "receipt_confirmed",
  "dispute_opened",
  "dispute_message",
  "dispute_status_changed",
  "dispute_resolved",
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/**
 * Le backend envoie un type et des paramètres structurés plutôt qu'un texte figé :
 * le frontend compose le message dans la langue de l'utilisateur, ce qui permettra
 * une restitution vocale multilingue à partir des mêmes données.
 */
export interface NotificationParams {
  reference?: string
  title?: string
  counterpartName?: string
  amount?: string
  status?: string
}

export interface AppNotification {
  id: string
  type: NotificationType
  params: NotificationParams
  transactionId: string | null
  disputeId: string | null
  createdAt: ISODateString
  readAt: ISODateString | null
}

export const NOTIFICATION_CHANNELS = ["in_app", "email", "sms", "voice"] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_CATEGORIES = ["transactions", "payments", "disputes"] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

export interface NotificationPreferences {
  channels: Record<NotificationChannel, boolean>
  categories: Record<NotificationCategory, boolean>
  locale: Locale
}
