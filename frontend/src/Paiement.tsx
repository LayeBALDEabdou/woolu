import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { lireCommande, type Commande, type NouvelleCommande } from './api'

const INTERVALLE_MS = 3000

interface Props {
  commande: NouvelleCommande
  onNouveau: () => void
}

function Paiement({ commande, onNouveau }: Props) {
  const [suivi, setSuivi] = useState<Commande | null>(null)
  const [copie, setCopie] = useState(false)
  const payee = suivi?.statut === 'PAYEE' || suivi?.statut === 'TERMINEE'

  // Interroge le backend jusqu'à ce que le webhook Bitnob marque la commande payée
  useEffect(() => {
    if (payee) return
    const id = setInterval(() => {
      lireCommande(commande.reference).then(setSuivi).catch(() => {})
    }, INTERVALLE_MS)
    return () => clearInterval(id)
  }, [commande.reference, payee])

  async function copier() {
    if (!commande.request) return
    await navigator.clipboard.writeText(commande.request)
    setCopie(true)
    setTimeout(() => setCopie(false), 2000)
  }

  if (payee) {
    return (
      <div className="paiement">
        <p className="succes">Paiement reçu ✓</p>
        {suivi?.code_livraison && (
          <p>
            Code de livraison : <strong className="code">{suivi.code_livraison}</strong>
          </p>
        )}
        <button onClick={onNouveau}>Nouveau paiement</button>
      </div>
    )
  }

  if (!commande.request) {
    return (
      <div className="paiement">
        <p className="erreur">Bitnob n'a pas renvoyé de facture.</p>
        <button onClick={onNouveau}>Réessayer</button>
      </div>
    )
  }

  return (
    <div className="paiement">
      <p className="sous-titre">Scannez avec un portefeuille Lightning.</p>

      <a href={`lightning:${commande.request}`} className="qr" aria-label="Ouvrir dans un portefeuille">
        <QRCodeSVG value={commande.request.toUpperCase()} size={232} marginSize={2} />
      </a>

      <code className="facture">{commande.request}</code>

      <button onClick={copier}>{copie ? 'Copiée ✓' : 'Copier la facture'}</button>

      <p className="attente">En attente du paiement…</p>
      {commande.expires_at && (
        <p className="discret">Expire le {new Date(commande.expires_at).toLocaleString('fr-FR')}</p>
      )}

      <button className="secondaire" onClick={onNouveau}>
        Annuler
      </button>
    </div>
  )
}

export default Paiement
