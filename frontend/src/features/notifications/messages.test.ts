import { describe, expect, it } from "vitest"
import { renderNotification, toSpeechText } from "./messages"
import { NOTIFICATION_TYPES } from "./types"

describe("catalogue de notifications", () => {
  it("rend un titre et un texte pour chaque type", () => {
    for (const type of NOTIFICATION_TYPES) {
      const rendered = renderNotification({ type, params: { reference: "WL-26-0001" } })
      expect(rendered.title.length).toBeGreaterThan(0)
      expect(rendered.body.length).toBeGreaterThan(0)
    }
  })

  it("compose le texte à partir des paramètres structurés", () => {
    const rendered = renderNotification({
      type: "transaction_proposed",
      params: { counterpartName: "Moussa Ndiaye", title: "Réfrigérateur", amount: "210 000 F CFA" },
    })
    expect(rendered.body).toContain("Moussa Ndiaye vous propose « Réfrigérateur » pour 210 000 F CFA")
  })

  it("produit un texte prêt pour une future restitution vocale", () => {
    expect(toSpeechText({ type: "payment_confirmed", params: { reference: "WL-26-0042" } })).toBe(
      "Paiement confirmé. Le paiement de la transaction WL-26-0042 a été confirmé par le serveur.",
    )
  })
})
