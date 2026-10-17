import type { UserRole } from "./types"

export const ROLE_LABELS: Record<UserRole, string> = {
  client: "Client",
  vendeur: "Vendeur",
  prestataire: "Prestataire",
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  client: "J'achète un produit ou je commande un service et je veux payer en sécurité.",
  vendeur: "Je vends des produits et je veux rassurer mes clients sur le paiement.",
  prestataire: "Je réalise des services et je veux être payé une fois le travail validé.",
}

/** Les vendeurs et prestataires peuvent proposer des transactions. */
export function isMerchantRole(role: UserRole): boolean {
  return role === "vendeur" || role === "prestataire"
}
