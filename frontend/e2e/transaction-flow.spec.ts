import { type Page, expect, test } from "@playwright/test"

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

async function switchDemoAccount(page: Page, name: RegExp) {
  await page.getByTestId("demo-account-switcher").click()
  await page.getByRole("menuitemradio", { name }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test("parcours complet : création, acceptation, paiement en attente puis confirmé par le serveur", async ({ page }) => {
  // 1. Le vendeur crée la transaction.
  await page.goto("/connexion")
  await page.getByRole("button", { name: /Moussa Ndiaye/ }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole("link", { name: "Nouvelle transaction" }).first().click()

  await page.getByLabel("Titre de la transaction").fill("Ventilateur sur pied Binatone")
  await page.getByLabel("Description du produit ou du service").fill("Ventilateur 16 pouces, 3 vitesses, neuf avec garantie 1 an.")
  await page.getByLabel("Nom complet").fill("Aïssatou Diop")
  await page.getByLabel("E-mail ou téléphone").fill("aissatou.diop@example.com")
  await page.getByRole("textbox", { name: "Montant" }).fill("27 500")
  await page.getByLabel("Date limite de livraison ou d'exécution").fill(inDays(7))
  await page.getByRole("button", { name: "Vérifier le récapitulatif" }).click()

  await expect(page.getByRole("heading", { name: "Récapitulatif avant création" })).toBeVisible()
  await expect(page.getByText("27 500 F CFA", { exact: true })).toBeVisible()
  await page.getByRole("checkbox").click()
  await page.getByRole("button", { name: "Créer la transaction" }).click()

  await expect(page).toHaveURL(/\/transactions\/trx_/)
  const transactionUrl = page.url()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ventilateur sur pied Binatone")

  // 2. Envoi au client.
  await page.getByRole("button", { name: "Envoyer au client" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Envoyer" }).click()
  await expect(page.getByText(/En attente de la réponse de Aïssatou Diop/)).toBeVisible()

  // 3. Le client accepte les conditions.
  await switchDemoAccount(page, /Aïssatou Diop/)
  await page.goto(transactionUrl)
  await page.getByRole("button", { name: "Accepter les conditions" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("checkbox").click()
  await dialog.getByRole("button", { name: "J'accepte les conditions" }).click()

  // 4. Paiement : une facture est générée, le statut reste en attente.
  await page.getByRole("link", { name: "Procéder au paiement" }).click()
  await page.getByRole("button", { name: "Générer la facture de paiement" }).click()
  await expect(page.getByText(/En attente de la confirmation du paiement par le serveur/)).toBeVisible()
  await expect(page.getByLabel("QR code de la facture de paiement")).toBeVisible()
  await expect(page.getByText("Fonds bloqués")).toHaveCount(0)

  // 5. Événement serveur simulé (webhook Bitnob) : seule source de confirmation.
  await page.getByTestId("demo-simulator").getByRole("button", { name: "Paiement reçu et vérifié" }).click()
  await expect(page.getByText("Paiement confirmé par le serveur")).toBeVisible()
  await expect(page.getByTestId("escrow-held")).toContainText("Fonds bloqués")
})

test("un client ouvre une réclamation : la transaction passe en litige", async ({ page }) => {
  await page.goto("/connexion")
  await page.getByRole("button", { name: /Aïssatou Diop/ }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto("/transactions/trx_demo_05")
  await page.getByRole("link", { name: "Signaler un problème" }).click()
  await page.getByRole("radio", { name: "Produit non reçu" }).click()
  await page.getByLabel("Description du problème").fill("Le réfrigérateur n'a pas été livré à la date convenue, sans nouvelles du livreur.")
  await page.getByRole("checkbox").click()
  await page.getByRole("button", { name: "Ouvrir la réclamation" }).click()

  await expect(page).toHaveURL(/\/reclamations\//)
  await expect(page.getByText("Ouverte").first()).toBeVisible()

  await page.goto("/transactions/trx_demo_05")
  await expect(page.getByText("Litige en cours").first()).toBeVisible()
  await expect(page.getByRole("button", { name: /Confirmer la réception/ })).toHaveCount(0)
})
