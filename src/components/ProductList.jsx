import { useState, useMemo } from 'react'
import CategoryTag from './CategoryTag'
import { searchProducts } from '../utils/search'
import skuImages from '../data/skuImages'

const FILTERS = [
  { key: 'lash',    label: 'Lash' },
  { key: 'brow',    label: 'Brow' },
  { key: 'hair',    label: 'Hair' },
  { key: 'serum',   label: 'Serum' },
  { key: 'singles', label: 'Singles' },
  { key: 'bundle',  label: 'Sets' },
]

export default function ProductList({ products, selectedSku, onSelect }) {
  const [activeFilters, setActiveFilters] = useState(new Set())
  const [search, setSearch] = useState('')

  const toggleFilter = (key) => {
    setActiveFilters(prev => {
      // Mutual exclusion between singles and sets
      if (key === 'singles' && prev.has('bundle')) return prev
      if (key === 'bundle' && prev.has('singles')) return prev
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const filtered = useMemo(() => {
    let list = products
    if (activeFilters.size > 0) {
      list = list.filter(p =>
        [...activeFilters].some(f => {
          if (f === 'bundle')  return p.isBundle
          if (f === 'singles') return !p.isBundle
          if (p.categories.includes(f)) return true
          const bools = { lash: p.isLash, brow: p.isBrow, hair: p.isHair, serum: p.isSerum }
          return bools[f] === true
        })
      )
    }
    return searchProducts(list, search)
  }, [products, activeFilters, search])

  const bundleActive  = activeFilters.has('bundle')
  const singlesActive = activeFilters.has('singles')

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="relative">
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs font-medium placeholder-white/25 text-white focus:outline-none focus:ring-1 transition-all"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              '--tw-ring-color': 'rgba(255,255,255,0.25)',
            }}
          />
        </div>
      </div>

      {/* Filter chips — multi-select */}
      <div className="px-3 py-2 border-b flex flex-wrap gap-1"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {FILTERS.map(f => {
          const active   = activeFilters.has(f.key)
          const disabled = (f.key === 'singles' && bundleActive) || (f.key === 'bundle' && singlesActive)
          return (
            <button
              key={f.key}
              onClick={() => !disabled && toggleFilter(f.key)}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide transition-all"
              style={
                disabled
                  ? { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.18)', cursor: 'not-allowed' }
                  : active
                    ? { background: '#ffffff', color: '#101820' }
                    : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }
              }
            >
              {f.label}
            </button>
          )
        })}
        {activeFilters.size > 0 && (
          <button
            onClick={() => setActiveFilters(new Set())}
            className="px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide transition-all"
            style={{ color: 'rgba(255,255,255,0.3)', background: 'transparent' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Count */}
      <div className="px-3 py-2 text-xs border-b"
        style={{ color: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.06)' }}>
        {filtered.length} product{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No products match
          </div>
        ) : (
          filtered.map(product => (
            <ProductRow
              key={product.skuUk}
              product={product}
              isSelected={selectedSku === product.skuUk}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ProductRow({ product, isSelected, onSelect }) {
  const imgSrc = skuImages[product.skuUk]
  return (
    <button
      onClick={() => onSelect(product.skuUk)}
      className="w-full text-left px-3 py-2 border-b transition-all"
      style={{
        borderColor: 'rgba(255,255,255,0.05)',
        background: isSelected ? 'rgba(255,255,255,0.09)' : 'transparent',
        borderLeft: isSelected ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <div className="flex items-center gap-2.5">
        {/* Thumbnail */}
        <div className="shrink-0 w-9 h-9 rounded-md overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          {imgSrc
            ? <img src={imgSrc} alt="" className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center">
                <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
          }
        </div>
        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium truncate leading-tight"
            style={{ color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.82)' }}>
            {product.nameEn}
          </div>
          <div className="text-[10px] font-mono mt-0.5"
            style={{ color: 'rgba(255,255,255,0.28)' }}>
            {product.skuUk}
          </div>
        </div>
        {/* Tags */}
        <div className="flex flex-wrap gap-1 justify-end shrink-0">
          {product.categories.filter(c => c !== 'large' && c !== 'bundle').slice(0, 1).map(c => (
            <CategoryTag key={c} category={c} size="xs" />
          ))}
        </div>
      </div>
    </button>
  )
}
