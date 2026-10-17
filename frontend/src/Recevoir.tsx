import { useState } from 'react'
import RecevoirLightning from './RecevoirLightning'
import RecevoirUsdc from './RecevoirUsdc'

type Mode = 'lightning' | 'usdc'

function Recevoir() {
  const [mode, setMode] = useState<Mode>('lightning')

  return (
    <>
      <div className="modes" role="radiogroup" aria-label="Moyen de paiement">
        <button role="radio" aria-checked={mode === 'lightning'} onClick={() => setMode('lightning')}>
          Lightning (BTC)
        </button>
        <button role="radio" aria-checked={mode === 'usdc'} onClick={() => setMode('usdc')}>
          USDC
        </button>
      </div>

      {mode === 'lightning' ? <RecevoirLightning /> : <RecevoirUsdc />}
    </>
  )
}

export default Recevoir
