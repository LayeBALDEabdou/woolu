import { useState } from 'react'
import Payer from './Payer'
import Recevoir from './Recevoir'

type Onglet = 'recevoir' | 'payer'

function App() {
  const [onglet, setOnglet] = useState<Onglet>('recevoir')

  return (
    <main className="carte">
      <h1>Woolu</h1>

      <nav className="onglets" role="tablist">
        <button role="tab" aria-selected={onglet === 'recevoir'} onClick={() => setOnglet('recevoir')}>
          Recevoir
        </button>
        <button role="tab" aria-selected={onglet === 'payer'} onClick={() => setOnglet('payer')}>
          Payer
        </button>
      </nav>

      {onglet === 'recevoir' ? <Recevoir /> : <Payer />}
    </main>
  )
}

export default App
