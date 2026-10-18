// En local, le backend Django tourne sur le port 8000 ; en prod, VITE_API_URL est fixée au build
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

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

export const RESEAUX_USDC = [
  { id: 'solana', nom: 'Solana' },
  { id: 'polygon', nom: 'Polygon' },
  { id: 'base', nom: 'Base' },
  { id: 'ethereum', nom: 'Ethereum' },
  { id: 'avalanche', nom: 'Avalanche' },
  { id: 'optimism', nom: 'Optimism' },
] as const

export interface AdresseDepot {
  reference: string
  reseau: string
  adresse: string
  statut: 'EN_ATTENTE' | 'RECU'
  montant?: string | null
  devise?: string | null
}

export function creerAdresse(reseau: string) {
  return appeler<AdresseDepot>('/payments/adresses/', {
    method: 'POST',
    body: JSON.stringify({ reseau }),
  })
}

export function lireAdresse(reference: string) {
  return appeler<AdresseDepot>(`/payments/adresses/${encodeURIComponent(reference)}/`)
}

export const FRAIS_RETRAIT_USDC = 1 // frais Bitnob par envoi, en plus du montant

export interface EnvoiUsdc {
  reference: string
  statut: 'pending' | 'completed' | 'failed'
  montant: string
  frais: string
  reseau: string
}

export function envoyerUsdc(adresse: string, reseau: string, montant: string, reference: string) {
  return appeler<EnvoiUsdc>('/payments/envois/', {
    method: 'POST',
    body: JSON.stringify({ adresse, reseau, montant, reference }),
  })
}
