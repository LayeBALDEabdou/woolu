import QrScanner from 'qr-scanner'
import { useEffect, useRef, useState } from 'react'

interface Props {
  onScan: (texte: string) => void
  onFermer: () => void
}

// Lit un QR code avec la caméra (nécessite HTTPS ou localhost)
function Scanner({ onScan, onFermer }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!video.current) return
    const scanner = new QrScanner(video.current, (resultat) => onScan(resultat.data), {
      returnDetailedScanResult: true,
      preferredCamera: 'environment',
      highlightScanRegion: true,
    })
    scanner.start().catch(() => setErreur("Impossible d'accéder à la caméra."))
    return () => scanner.destroy()
  }, [onScan])

  return (
    <div className="scanner">
      {erreur ? <p className="erreur">{erreur}</p> : <video ref={video} muted playsInline />}
      <button className="secondaire" onClick={onFermer}>
        Fermer la caméra
      </button>
    </div>
  )
}

export default Scanner
