// En local, le backend Django tourne sur le port 8000 ; en prod, VITE_API_URL est fixée au build
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export type Statut = 'EN_ATTENTE' | 'PAYEE' | 'TERMINEE' | 'ERREUR'

export interface NouvelleCommande {
  reference: string
  statut: Statut
  request: string | null // facture Lightning BOLT11
  expires_at: string | null
}

export interface Commande {
  reference: string
  statut: Statut
  montant_sats: number
  description: string
  code_livraison: string | null
}

async function appeler<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_URL + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const erreur = data.erreur
    // Erreurs Bitnob : { detail, title } ; erreurs du backend : une chaîne
    const message = typeof erreur === 'string' ? erreur : erreur?.detail || erreur?.title || erreur?.message
    throw new Error(message || `Erreur ${response.status}`)
  }
  return data as T
}

export function creerCommande(montant_sats: number, description: string) {
  return appeler<NouvelleCommande>('/payments/commandes/', {
    method: 'POST',
    body: JSON.stringify({ montant_sats, description }),
  })
}

export function lireCommande(reference: string) {
  return appeler<Commande>(`/payments/commandes/${encodeURIComponent(reference)}/`)
}

export interface FactureDecodee {
  request: string
  montant_sats: number | null
  description: string
  expires_at: number | null // timestamp Unix en secondes
  expiree: boolean
}

export interface PaiementEffectue {
  reference: string
  statut: 'paid' | 'pending' | 'failed'
  montant_sats: number | null
  frais_sats: string | null
}

export function decoderFacture(request: string) {
  return appeler<FactureDecodee>('/payments/factures/decoder/', {
    method: 'POST',
    body: JSON.stringify({ request }),
  })
}

export function payerFacture(request: string, reference: string) {
  return appeler<PaiementEffectue>('/payments/factures/payer/', {
    method: 'POST',
    body: JSON.stringify({ request, reference }),
  })
}
