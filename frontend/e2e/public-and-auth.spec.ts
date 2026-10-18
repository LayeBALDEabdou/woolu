import { expect, test } from "@playwright/test"

test.describe("site public", () => {
  test("présente Wóolu et la FAQ", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Le vendeur livre.")

    await page.goto("/questions-frequentes")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Questions fréquentes")
    const question = page.getByText("Quand le vendeur reçoit-il l'argent ?")
    await question.click()
    await expect(page.getByText(/Lorsque le client confirme la réception/)).toBeVisible()
  })

  test("les pages Fonctionnement et Sécurité sont accessibles", async ({ page }) => {
    await page.goto("/fonctionnement")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Le parcours d'une transaction")
    await page.goto("/securite")
    await expect(page.getByRole("heading", { name: "Conditions de libération des fonds" })).toBeVisible()
  })
})

test.describe("authentification", () => {
  test("redirige vers la connexion puis revient à la page demandée", async ({ page }) => {
    await page.goto("/transactions")
    await expect(page).toHaveURL(/\/connexion\?redirect=%2Ftransactions/)
    await page.getByRole("button", { name: /Aïssatou Diop/ }).click()
    await expect(page).toHaveURL(/\/transactions$/)
    await expect(page.getByRole("heading", { level: 1, name: "Transactions" })).toBeVisible()
  })

  test("valide le formulaire d'inscription et crée un compte", async ({ page }) => {
    await page.goto("/inscription")
    await page.getByRole("button", { name: "Créer mon compte" }).click()
    await expect(page.getByText("Indiquez votre prénom et votre nom.")).toBeVisible()

    await page.getByText("Vendeur", { exact: true }).click()
    await page.getByLabel("Prénom et nom").fill("Awa Ba")
    await page.getByLabel("Adresse e-mail").fill("awa.ba@example.com")
    await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse2026")
    await page.getByLabel("Confirmation du mot de passe").fill("motdepasse2026")
    await page.getByRole("checkbox").click()
    await page.getByRole("button", { name: "Créer mon compte" }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonjour Awa")
  })
})
