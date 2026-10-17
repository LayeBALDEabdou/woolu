import { useCallback, useState } from 'react'
import { decoderFacture, payerFacture, type FactureDecodee, type PaiementEffectue } from './api'
import Scanner from './Scanner'

function messageErreur(err: unknown) {
  return err instanceof Error ? err.message : 'Erreur inattendue'
}

function Payer() {
  const [saisie, setSaisie] = useState('')
  const [scan, setScan] = useState(false)
  const [facture, setFacture] = useState<FactureDecodee | null>(null)
  // Une référence par facture vérifiée : un double clic ne paie qu'une fois
  const [reference, setReference] = useState('')
  const [resultat, setResultat] = useState<PaiementEffectue | null>(null)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  async function verifier(texte: string) {
    setErreur('')
    setChargement(true)
    try {
      setFacture(await decoderFacture(texte))
      setReference(`pay-${crypto.randomUUID()}`)
    } catch (err) {
      setErreur(messageErreur(err))
    } finally {
      setChargement(false)
    }
  }

  const onScan = useCallback((texte: string) => {
    setScan(false)
    setSaisie(texte)
    verifier(texte)
  }, [])

  async function payer() {
    if (!facture) return
    setErreur('')
    setChargement(true)
    try {
      setResultat(await payerFacture(facture.request, reference))
    } catch (err) {
      setErreur(messageErreur(err))
    } finally {
      setChargement(false)
    }
  }

  function recommencer() {
    setSaisie('')
    setFacture(null)
    setResultat(null)
    setErreur('')
  }

  if (resultat) {
    return (
      <div className="paiement">
        {resultat.statut === 'failed' ? (
          <p className="erreur">Le paiement a échoué.</p>
        ) : (
          <p className="succes">{resultat.statut === 'paid' ? 'Facture payée ✓' : 'Paiement en cours…'}</p>
        )}
        {resultat.montant_sats != null && (
          <p className="discret">
            {resultat.montant_sats} sats{resultat.frais_sats ? ` + ${resultat.frais_sats} sats de frais` : ''}
          </p>
        )}
        <button onClick={recommencer}>Payer une autre facture</button>
      </div>
    )
  }

  if (facture) {
    return (
      <div className="paiement">
        <dl className="details">
          <dt>Montant</dt>
          <dd>{facture.montant_sats ?? '?'} sats</dd>
          {facture.description && (
            <>
              <dt>Description</dt>
              <dd>{facture.description}</dd>
            </>
          )}
        </dl>

        {facture.expiree ? (
          <p className="erreur">Cette facture a expiré.</p>
        ) : (
          <button onClick={payer} disabled={chargement}>
            {chargement ? 'Paiement…' : `Payer ${facture.montant_sats ?? ''} sats`}
          </button>
        )}
        {erreur && <p className="erreur">{erreur}</p>}
        <button className="secondaire" onClick={recommencer}>
          Annuler
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        verifier(saisie)
      }}
    >
      <p className="sous-titre">Scannez ou collez une facture Lightning.</p>

      {scan ? (
        <Scanner onScan={onScan} onFermer={() => setScan(false)} />
      ) : (
        <button type="button" className="secondaire" onClick={() => setScan(true)}>
          Scanner un QR code
        </button>
      )}

      <label>
        Facture
        <textarea
          rows={3}
          required
          placeholder="lntb… ou lnbc…"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
        />
      </label>

      {erreur && <p className="erreur">{erreur}</p>}

      <button type="submit" disabled={chargement}>
        {chargement ? 'Vérification…' : 'Vérifier la facture'}
      </button>
    </form>
  )
}

export default Payer
