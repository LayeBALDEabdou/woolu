import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales"
import type { AppNotification, NotificationParams, NotificationType } from "./types"

interface RenderedNotification {
  title: string
  body: string
}

type Template = (params: NotificationParams) => RenderedNotification

const ref = (p: NotificationParams) => (p.reference ? ` ${p.reference}` : "")
const who = (p: NotificationParams) => p.counterpartName ?? "L'autre partie"

const fr: Record<NotificationType, Template> = {
  transaction_proposed: (p) => ({
    title: "Nouvelle proposition de transaction",
    body: `${who(p)} vous propose « ${p.title ?? "une transaction"} »${p.amount ? ` pour ${p.amount}` : ""}. Consultez les conditions avant de les accepter.`,
  }),
  terms_accepted: (p) => ({
    title: "Conditions acceptées",
    body: `${who(p)} a accepté les conditions de la transaction${ref(p)}. Le paiement peut maintenant être effectué.`,
  }),
  terms_refused: (p) => ({
    title: "Conditions refusées",
    body: `${who(p)} a refusé les conditions de la transaction${ref(p)}.`,
  }),
  transaction_cancelled: (p) => ({
    title: "Transaction annulée",
    body: `La transaction${ref(p)} a été annulée.`,
  }),
  payment_confirmed: (p) => ({
    title: "Paiement confirmé",
    body: `Le paiement de la transaction${ref(p)} a été confirmé par le serveur.`,
  }),
  payment_failed: (p) => ({
    title: "Échec du paiement",
    body: `Le paiement de la transaction${ref(p)} n'a pas abouti. Vous pouvez générer une nouvelle facture.`,
  }),
  payment_expired: (p) => ({
    title: "Adresse de paiement expirée",
    body: `La demande de paiement de la transaction${ref(p)} a expiré sans paiement.`,
  }),
  delivery_started: (p) => ({
    title: "Livraison démarrée",
    body: `${who(p)} a démarré la livraison ou la prestation pour la transaction${ref(p)}.`,
  }),
  delivery_completed: (p) => ({
    title: "Livraison déclarée terminée",
    body: `${who(p)} indique avoir terminé la transaction${ref(p)}. Confirmez la réception ou signalez un problème.`,
  }),
  receipt_confirmed: (p) => ({
    title: "Réception confirmée",
    body: `${who(p)} a confirmé la réception pour la transaction${ref(p)}. La libération des fonds est autorisée.`,
  }),
  dispute_opened: (p) => ({
    title: "Réclamation ouverte",
    body: `${who(p)} a ouvert une réclamation sur la transaction${ref(p)}. Les fonds restent bloqués.`,
  }),
  dispute_message: (p) => ({
    title: "Nouveau message sur une réclamation",
    body: `${who(p)} a répondu sur le dossier${ref(p)}.`,
  }),
  dispute_status_changed: (p) => ({
    title: "Réclamation mise à jour",
    body: `Le dossier${ref(p)} est maintenant : ${p.status ?? "mis à jour"}.`,
  }),
  dispute_resolved: (p) => ({
    title: "Décision rendue",
    body: `Wóolu a rendu sa décision sur le dossier${ref(p)}.`,
  }),
}

/** Catalogues disponibles. Le wolof sera ajouté ici (et pourra alimenter la synthèse vocale). */
const catalogs: Partial<Record<Locale, Record<NotificationType, Template>>> = { fr }

export function renderNotification(
  notification: Pick<AppNotification, "type" | "params">,
  locale: Locale = DEFAULT_LOCALE,
): RenderedNotification {
  const catalog = catalogs[locale] ?? fr
  return catalog[notification.type](notification.params)
}

/** Texte prêt à être lu par une future interface vocale. */
export function toSpeechText(
  notification: Pick<AppNotification, "type" | "params">,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const { title, body } = renderNotification(notification, locale)
  return `${title}. ${body}`
}
