import { useState, useEffect } from 'react'
import { useProducts } from './hooks/useProducts'
import ProductList from './components/ProductList'
import ProductDetail from './components/ProductDetail'
import BuilderView from './components/BuilderView'

const VIEWS = { BROWSE: 'browse', BUILD: 'build' }
const SESSION_KEY = 'bb_unlocked'
const PASSWORD = 'lashlashlash'

function PasswordGate({ onUnlock }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (value === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      onUnlock()
    } else {
      setError(true)
      setValue('')
      setTimeout(() => setError(false), 1800)
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-8"
      style={{ background: '#101820' }}>
      <div className="flex flex-col items-center gap-1">
        <span className="select-none" style={{
          fontFamily: 'Aeonik', fontWeight: 900, color: '#ffffff',
          fontSize: '28px', letterSpacing: '-0.01em',
        }}>
          uklash
        </span>
        <span className="text-xs font-medium tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          Bundle Builder
        </span>
      </div>

      <form onSubmit={submit} className="flex flex-col items-center gap-3" style={{ width: '260px' }}>
        <input
          type="password"
          value={value}
          onChange={e => { setValue(e.target.value); setError(false) }}
          placeholder="Password"
          autoFocus
          className="w-full px-4 py-2.5 rounded-lg text-sm text-center focus:outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: `1px solid ${error ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.12)'}`,
            color: '#ffffff',
          }}
          onFocus={e => { if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.35)' }}
          onBlur={e => { if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
        />
        {error && (
          <p className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>Incorrect password</p>
        )}
        <button
          type="submit"
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity"
          style={{ background: '#ffffff', color: '#101820' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          Enter
        </button>
      </form>
    </div>
  )
}

export default function App() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1'
  )

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />
  const [config, setConfig] = useState(null)
  const [view, setView] = useState(VIEWS.BROWSE)
  const [selectedSku, setSelectedSku] = useState(null)
  const [selectedMarket, setSelectedMarket] = useState('uk')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}config.json`)
      .then(r => r.json())
      .then(cfg => {
        setConfig(cfg)
        setSelectedMarket(cfg.markets?.[0]?.key ?? 'uk')
      })
      .catch(console.error)
  }, [])

  const { products, productMap, headers, loading, error, lastFetched, refresh } =
    useProducts(config?.sheetUrl)

  const selectedProduct = selectedSku ? productMap[selectedSku] : null
  const markets = config?.markets ?? []

  return (
    <div className="flex flex-col h-screen" style={{ background: '#fbf6f3' }}>

      {/* ── Header ──────────────────────────────────────── */}
      <header className="flex items-center h-14 px-5 shrink-0 gap-4"
        style={{ background: '#101820' }}>

        {/* Logo wordmark */}
        <div className="flex items-baseline gap-2.5 mr-4">
          <span className="select-none" style={{ fontFamily: 'Aeonik', fontWeight: 900, color: '#ffffff', fontSize: '20px', letterSpacing: '-0.01em', lineHeight: 1 }}>
            uklash
          </span>
          <span className="text-white/30 text-xs font-medium tracking-widest uppercase">
            Bundle Builder
          </span>
        </div>

        {/* View tabs */}
        <nav className="flex items-center gap-0.5">
          <TabButton active={view === VIEWS.BROWSE} onClick={() => setView(VIEWS.BROWSE)}>
            Browse
          </TabButton>
          <TabButton active={view === VIEWS.BUILD} onClick={() => setView(VIEWS.BUILD)}>
            Build Bundle
          </TabButton>
        </nav>

        <div className="flex-1" />

        {/* Market selector */}
        {markets.length > 0 && (
          <div className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            {markets.map(m => (
              <button
                key={m.key}
                onClick={() => setSelectedMarket(m.key)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  selectedMarket === m.key
                    ? 'bg-white text-[#101820] shadow-sm'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Status + refresh */}
        <div className="flex items-center gap-2 ml-3">
          {error && <span className="text-xs text-amber-400">{error}</span>}
          {lastFetched && !error && (
            <span className="text-xs text-white/30 font-medium">
              {lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/8 transition-all disabled:opacity-30"
            style={{ '--tw-bg-opacity': 1 }}
            title="Refresh from Google Sheets"
          >
            <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────── */}
      {loading && !products.length ? (
        <LoadingScreen />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {view === VIEWS.BROWSE ? (
            <>
              {/* Sidebar */}
              <aside className="w-64 shrink-0 flex flex-col overflow-hidden border-r"
                style={{ background: '#101820', borderColor: 'rgba(255,255,255,0.06)' }}>
                <ProductList
                  products={products}
                  selectedSku={selectedSku}
                  onSelect={setSelectedSku}
                />
              </aside>
              {/* Detail */}
              <main className="flex-1 overflow-hidden" style={{ background: '#fbf6f3' }}>
                <ProductDetail
                  product={selectedProduct}
                  productMap={productMap}
                  markets={markets}
                  selectedMarket={selectedMarket}
                />
              </main>
            </>
          ) : (
            <main className="flex-1 overflow-hidden" style={{ background: '#fbf6f3' }}>
              <BuilderView
                products={products}
                markets={markets}
                discounts={config?.bundleDiscounts ?? {}}
                selectedMarket={selectedMarket}
                headers={headers}
              />
            </main>
          )}
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-xs font-medium tracking-wide transition-all ${
        active
          ? 'bg-white/12 text-white'
          : 'text-white/45 hover:text-white/70 hover:bg-white/6'
      }`}
      style={active ? { background: 'rgba(255,255,255,0.12)' } : {}}
    >
      {children}
    </button>
  )
}

function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: 'rgba(16,24,32,0.4)' }}>
      <svg className="w-7 h-7 animate-spin" style={{ color: '#101820' }} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-sm font-medium">Loading products…</p>
    </div>
  )
}
