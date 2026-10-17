import { useState } from 'react'
import { creerCommande, type NouvelleCommande } from './api'
import Paiement from './Paiement'

function Recevoir() {
  const [montant, setMontant] = useState('1000')
  const [description, setDescription] = useState('')
  const [commande, setCommande] = useState<NouvelleCommande | null>(null)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    try {
      setCommande(await creerCommande(Number(montant), description.trim() || 'Paiement Woolu'))
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <>
      {commande ? (
        <Paiement commande={commande} onNouveau={() => setCommande(null)} />
      ) : (
        <form onSubmit={soumettre}>
          <p className="sous-titre">Payez en Bitcoin via Lightning.</p>

          <label>
            Montant (sats)
            <input
              type="number"
              min={1}
              step={1}
              required
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </label>

          <label>
            Description
            <input
              type="text"
              maxLength={255}
              placeholder="Ex : Frigo"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          {erreur && <p className="erreur">{erreur}</p>}

          <button type="submit" disabled={envoi}>
            {envoi ? 'Création…' : 'Générer la facture'}
          </button>
        </form>
      )}
    </>
  )
}

export default Recevoir
