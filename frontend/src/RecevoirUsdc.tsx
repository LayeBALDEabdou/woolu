import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { creerAdresse, lireAdresse, RESEAUX_USDC, type AdresseDepot } from './api'

const INTERVALLE_MS = 5000

function nomReseau(id: string) {
  return RESEAUX_USDC.find((r) => r.id === id)?.nom ?? id
}

function RecevoirUsdc() {
  const [reseau, setReseau] = useState<string>(RESEAUX_USDC[0].id)
  const [depot, setDepot] = useState<AdresseDepot | null>(null)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [copie, setCopie] = useState(false)
  const recu = depot?.statut === 'RECU'
  const reference = depot?.reference

  // Interroge le backend jusqu'à ce qu'un webhook Bitnob signale le dépôt
  useEffect(() => {
    if (!reference || recu) return
    const id = setInterval(() => {
      lireAdresse(reference).then(setDepot).catch(() => {})
    }, INTERVALLE_MS)
    return () => clearInterval(id)
  }, [reference, recu])

  async function generer(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    try {
      setDepot(await creerAdresse(reseau))
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setEnvoi(false)
    }
  }

  async function copier() {
    if (!depot) return
    await navigator.clipboard.writeText(depot.adresse)
    setCopie(true)
    setTimeout(() => setCopie(false), 2000)
  }

  if (depot && recu) {
    return (
      <div className="paiement">
        <p className="succes">Dépôt reçu ✓</p>
        {depot.montant && (
          <p className="discret">
            {depot.montant} {depot.devise || 'USDC'} sur {nomReseau(depot.reseau)}
          </p>
        )}
        <button onClick={() => setDepot(null)}>Nouvelle adresse</button>
      </div>
    )
  }

  if (depot) {
    return (
      <div className="paiement">
        <p className="sous-titre">
          Envoyez des USDC sur le réseau <strong>{nomReseau(depot.reseau)}</strong>.
        </p>

        <div className="qr">
          <QRCodeSVG value={depot.adresse} size={232} marginSize={2} />
        </div>

        <code className="facture">{depot.adresse}</code>

        <button onClick={copier}>{copie ? 'Copiée ✓' : "Copier l'adresse"}</button>

        <p className="avertissement">
          N'envoyez que des USDC, et uniquement sur {nomReseau(depot.reseau)} : des fonds envoyés depuis un
          autre réseau seraient perdus.
        </p>
        <p className="attente">En attente du dépôt…</p>

        <button className="secondaire" onClick={() => setDepot(null)}>
          Annuler
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={generer}>
      <p className="sous-titre">Recevez des USDC sur une adresse dédiée.</p>

      <label>
        Réseau
        <select value={reseau} onChange={(e) => setReseau(e.target.value)}>
          {RESEAUX_USDC.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom}
            </option>
          ))}
        </select>
      </label>

      {erreur && <p className="erreur">{erreur}</p>}

      <button type="submit" disabled={envoi}>
        {envoi ? 'Génération…' : "Générer l'adresse"}
      </button>
    </form>
  )
}

export default RecevoirUsdc
