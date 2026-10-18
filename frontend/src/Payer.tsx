import { useCallback, useState } from 'react'
import { envoyerUsdc, FRAIS_RETRAIT_USDC, RESEAUX_USDC, type EnvoiUsdc } from './api'
import Scanner from './Scanner'

function nomReseau(id: string) {
  return RESEAUX_USDC.find((r) => r.id === id)?.nom ?? id
}

// Un QR code de portefeuille peut contenir "solana:<adresse>?amount=..." : on garde l'adresse
function extraireAdresse(texte: string) {
  return texte.trim().replace(/^[a-z]+:/i, '').split(/[?@/]/)[0]
}

function Payer() {
  const [reseau, setReseau] = useState<string>(RESEAUX_USDC[0].id)
  const [adresse, setAdresse] = useState('')
  const [montant, setMontant] = useState('1')
  const [scan, setScan] = useState(false)
  const [confirmation, setConfirmation] = useState(false)
  // Une référence par envoi confirmé : un double clic n'envoie qu'une fois
  const [reference, setReference] = useState('')
  const [resultat, setResultat] = useState<EnvoiUsdc | null>(null)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const onScan = useCallback((texte: string) => {
    setScan(false)
    setAdresse(extraireAdresse(texte))
  }, [])

  function verifier(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setReference(`pay-${crypto.randomUUID()}`)
    setConfirmation(true)
  }

  async function envoyer() {
    setErreur('')
    setEnvoi(true)
    try {
      setResultat(await envoyerUsdc(adresse, reseau, montant, reference))
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setEnvoi(false)
    }
  }

  function recommencer() {
    setAdresse('')
    setConfirmation(false)
    setResultat(null)
    setErreur('')
  }

  if (resultat) {
    return (
      <div className="paiement">
        {resultat.statut === 'failed' ? (
          <p className="erreur">L'envoi a échoué.</p>
        ) : (
          <p className="succes">{resultat.statut === 'completed' ? 'USDC envoyés ✓' : 'Envoi en cours…'}</p>
        )}
        <p className="discret">
          {resultat.montant} USDC sur {nomReseau(resultat.reseau)} + {resultat.frais} USDC de frais
        </p>
        <button onClick={recommencer}>Nouvel envoi</button>
      </div>
    )
  }

  if (confirmation) {
    const total = Number(montant.replace(',', '.')) + FRAIS_RETRAIT_USDC
    return (
      <div className="paiement">
        <dl className="details">
          <dt>Montant</dt>
          <dd>{montant} USDC</dd>
          <dt>Frais</dt>
          <dd>{FRAIS_RETRAIT_USDC} USDC</dd>
          <dt>Total</dt>
          <dd>{Number.isFinite(total) ? total : '?'} USDC</dd>
          <dt>Réseau</dt>
          <dd>{nomReseau(reseau)}</dd>
          <dt>Vers</dt>
          <dd className="adresse">{adresse}</dd>
        </dl>

        <button onClick={envoyer} disabled={envoi}>
          {envoi ? 'Envoi…' : `Envoyer ${montant} USDC`}
        </button>
        {erreur && <p className="erreur">{erreur}</p>}
        <button className="secondaire" onClick={() => setConfirmation(false)} disabled={envoi}>
          Modifier
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={verifier}>
      <p className="sous-titre">Envoyez des USDC depuis le solde Bitnob.</p>

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

      {scan ? (
        <Scanner onScan={onScan} onFermer={() => setScan(false)} />
      ) : (
        <button type="button" className="secondaire" onClick={() => setScan(true)}>
          Scanner un QR code
        </button>
      )}

      <label>
        Adresse USDC
        <textarea
          rows={2}
          required
          placeholder={`Adresse ${nomReseau(reseau)}`}
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
        />
      </label>

      <label>
        Montant (USDC)
        <input
          type="number"
          min="0.000001"
          step="0.000001"
          required
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
        />
      </label>

      <p className="discret">Frais Bitnob : {FRAIS_RETRAIT_USDC} USDC par envoi, en plus du montant.</p>

      <button type="submit">Vérifier l'envoi</button>
    </form>
  )
}

export default Payer
