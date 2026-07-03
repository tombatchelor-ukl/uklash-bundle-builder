import { useState, useMemo, useCallback } from 'react'
import skuImages from '../data/skuImages'
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import {
  SortableContext, horizontalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CategoryTag from './CategoryTag'
import PriceTable from './PriceTable'
import {
  calcBundlePrices, getDiscountRate, suggestSkuName,
  formatPrice, findDuplicateBundle,
} from '../utils/pricing'
import { searchProducts } from '../utils/search'

let instanceCounter = 0

// ─── Draggable card in the left picker ───────────────────────────────────────

function PickerCard({ product, selectedMarket, markets }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `picker::${product.skuUk}`,
    data: { type: 'picker', product },
  })
  const market = markets.find(m => m.key === selectedMarket)

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="group mx-2 mb-2 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing select-none transition-all"
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderColor: isDragging ? 'rgba(16,24,32,0.3)' : 'rgba(16,24,32,0.1)',
        backgroundColor: isDragging ? 'rgba(16,24,32,0.03)' : '#ffffff',
        boxShadow: isDragging ? 'none' : undefined,
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'rgba(16,24,32,0.3)'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(16,24,32,0.08)'
        }
      }}
      onMouseLeave={e => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'rgba(16,24,32,0.1)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      <div className="flex items-start gap-2">
        {/* Thumbnail */}
        {skuImages[product.skuUk]
          ? <img src={skuImages[product.skuUk]} alt="" loading="lazy"
              className="shrink-0 w-10 h-10 rounded-md object-cover"
              style={{ background: '#f5f0ed' }} />
          : <div className="shrink-0 w-4 h-4 mt-0.5">
              <svg style={{ color: 'rgba(16,24,32,0.28)' }} fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
              </svg>
            </div>
        }
        <div className="min-w-0">
          <div className="text-xs font-medium leading-tight line-clamp-2 font-sans" style={{ color: '#101820' }}>{product.nameEn}</div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'rgba(16,24,32,0.45)' }}>{product.skuUk}</div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {product.categories.filter(c => c !== 'large').slice(0, 2).map(c => (
              <CategoryTag key={c} category={c} size="xs" />
            ))}
          </div>
          {market && product.prices[selectedMarket] > 0 && (
            <div className="text-xs font-semibold mt-1 font-sans" style={{ color: 'rgba(16,24,32,0.6)' }}>
              {formatPrice(product.prices[selectedMarket], market)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sortable square card in the canvas ──────────────────────────────────────

function CanvasCard({ item, selectedMarket, markets, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.instanceId,
    data: { type: 'canvas', item },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const market = markets.find(m => m.key === selectedMarket)
  const price = market ? item.product.prices[selectedMarket] : 0

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.4 : 1,
        borderColor: isDragging ? 'rgba(16,24,32,0.3)' : 'rgba(16,24,32,0.1)',
        boxShadow: isDragging ? '0 10px 25px rgba(16,24,32,0.15)' : undefined,
        backgroundColor: '#ffffff',
      }}
      className="relative flex-shrink-0 w-40 h-40 rounded-xl border-2 flex flex-col p-3 select-none transition-shadow"
      onMouseEnter={e => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'rgba(16,24,32,0.2)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,24,32,0.1)'
        }
      }}
      onMouseLeave={e => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'rgba(16,24,32,0.1)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {/* Remove */}
      <button
        onClick={() => onRemove(item.instanceId)}
        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-colors z-10"
        style={{ color: 'rgba(16,24,32,0.28)' }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#b45309'
          e.currentTarget.style.backgroundColor = '#fef3c7'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'rgba(16,24,32,0.28)'
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing"
        style={{ color: 'rgba(16,24,32,0.28)' }}
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex flex-col justify-between h-full pt-3">
        {skuImages[item.product.skuUk] ? (
          /* Image-first layout */
          <>
            <div className="rounded-md overflow-hidden mx-auto" style={{ width: '80px', height: '80px', background: '#f5f0ed' }}>
              <img src={skuImages[item.product.skuUk]} alt="" loading="lazy"
                className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-[10px] font-semibold leading-tight line-clamp-2 pr-2 font-serif mt-2" style={{ color: '#101820' }}>
                {item.product.nameEn}
              </div>
              {market && price > 0 && (
                <div className="text-xs font-bold mt-1 font-sans" style={{ color: '#101820' }}>
                  {formatPrice(price, market)}
                </div>
              )}
            </div>
          </>
        ) : (
          /* No-image fallback */
          <>
            <div>
              <div className="text-xs font-semibold leading-tight line-clamp-2 mt-1 pr-2 font-serif" style={{ color: '#101820' }}>
                {item.product.nameEn}
              </div>
              <div className="font-mono mt-1 break-all leading-tight" style={{ fontSize: '10px', color: 'rgba(16,24,32,0.45)' }}>
                {item.product.skuUk}
              </div>
            </div>
            {market && price > 0 && (
              <div className="text-sm font-bold mt-2 font-sans" style={{ color: '#101820' }}>
                {formatPrice(price, market)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Horizontal drop canvas ───────────────────────────────────────────────────

function HorizontalCanvas({ items, selectedMarket, markets, onRemove }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' })
  const itemIds = items.map(i => i.instanceId)

  return (
    <div
      ref={setNodeRef}
      className="flex-1 h-full rounded-xl border-2 transition-colors overflow-hidden"
      style={{
        borderStyle: 'dashed',
        borderColor: isOver ? '#101820' : 'rgba(16,24,32,0.18)',
        backgroundColor: isOver ? 'rgba(16,24,32,0.03)' : 'rgba(16,24,32,0.02)',
      }}
    >
      {items.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center gap-2 p-8" style={{ color: 'rgba(16,24,32,0.45)' }}>
          <svg className="w-8 h-8" style={{ opacity: 0.3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <p className="text-sm font-medium font-sans">Drag products here</p>
          <p className="text-xs font-sans">Build your bundle from the left panel</p>
        </div>
      ) : (
        <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-3 p-4 h-full items-center overflow-x-auto">
            {items.map(item => (
              <CanvasCard
                key={item.instanceId}
                item={item}
                selectedMarket={selectedMarket}
                markets={markets}
                onRemove={onRemove}
              />
            ))}
            {/* Ghost drop target at the end */}
            <div
              className="flex-shrink-0 w-40 h-40 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors"
              style={{
                borderColor: isOver ? 'rgba(16,24,32,0.3)' : 'rgba(16,24,32,0.12)',
                backgroundColor: isOver ? 'rgba(16,24,32,0.03)' : 'transparent',
              }}
            >
              <svg className="w-5 h-5" style={{ color: 'rgba(16,24,32,0.28)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </SortableContext>
      )}
    </div>
  )
}

// ─── Left picker ──────────────────────────────────────────────────────────────

function ProductPicker({ products, selectedMarket, markets }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const FILTERS = [
    { key: 'all',   label: 'All' },
    { key: 'lash',  label: 'Lash' },
    { key: 'brow',  label: 'Brow' },
    { key: 'hair',  label: 'Hair' },
    { key: 'serum', label: 'Serum' },
  ]

  const filtered = useMemo(() => {
    // Only show non-bundle products
    let list = products.filter(p => !p.isBundle)
    if (filter !== 'all') {
      list = list.filter(p => {
        if (p.categories.includes(filter)) return true
        const bools = { lash: p.isLash, brow: p.isBrow, hair: p.isHair, serum: p.isSerum }
        return bools[filter] === true
      })
    }
    return searchProducts(list, search)
  }, [products, filter, search])

  return (
    <div
      className="flex flex-col h-full border-r"
      style={{ backgroundColor: '#ffffff', borderColor: 'rgba(16,24,32,0.08)' }}
    >
      <div className="p-3 border-b shrink-0" style={{ borderColor: 'rgba(16,24,32,0.08)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>Products</p>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-md focus:outline-none font-sans"
          style={{
            border: '1px solid rgba(16,24,32,0.12)',
            color: '#101820',
            backgroundColor: '#ffffff',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(16,24,32,0.4)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(16,24,32,0.12)' }}
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-2 py-0.5 rounded-full text-xs font-medium transition-colors font-sans"
              style={
                filter === f.key
                  ? { backgroundColor: '#101820', color: '#ffffff' }
                  : { backgroundColor: 'rgba(16,24,32,0.06)', color: 'rgba(16,24,32,0.5)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-center p-4 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>No products found</p>
        ) : (
          filtered.map(product => (
            <PickerCard
              key={product.skuUk}
              product={product}
              selectedMarket={selectedMarket}
              markets={markets}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Bottom summary panel ─────────────────────────────────────────────────────

function BundleSummary({ items, markets, discounts, selectedMarket, products, headers }) {
  const [customName, setCustomName] = useState('')
  const [nameEdited, setNameEdited] = useState(false)
  const [bundleEnName, setBundleEnName] = useState('')
  const [bundleEsName, setBundleEsName] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedDetails, setCopiedDetails] = useState(false)

  const suggested = useMemo(() => suggestSkuName(items), [items])
  const displayName = nameEdited ? customName : suggested

  const count = items.length
  const rate  = getDiscountRate(count, discounts)
  const pct   = Math.round(rate * 100)

  const breakdown = useMemo(
    () => calcBundlePrices(items, markets, discounts),
    [items, markets, discounts]
  )

  const totals = useMemo(() => {
    const total = {}, discounted = {}
    breakdown.forEach(b => {
      total[b.market.key]      = b.total
      discounted[b.market.key] = b.discounted
    })
    return { total, discounted }
  }, [breakdown])

  const duplicate = useMemo(() => findDuplicateBundle(items, products), [items, products])
  const market = markets.find(m => m.key === selectedMarket)
  const mBreakdown = breakdown.find(b => b.market.key === selectedMarket)

  // When a duplicate is found, lock the SKU to the existing one
  const effectiveName = duplicate ? duplicate.skuUk : displayName

  // Copy row is valid when: 2+ items, no duplicate, has an English name
  const canCopy = count >= 2 && !duplicate && bundleEnName.trim() !== ''

  const handleCopyRow = () => {
    if (!canCopy) return
    const componentSkus = items.map(i => i.product.skuUk)

    // Categories: union across all components
    const isLarge = items.some(i => i.product.categories.includes('large'))
    const isLash  = items.some(i => i.product.isLash  || i.product.categories.includes('lash'))
    const isBrow  = items.some(i => i.product.isBrow  || i.product.categories.includes('brow'))
    const isHair  = items.some(i => i.product.isHair  || i.product.categories.includes('hair'))
    const isSerum = items.some(i => i.product.isSerum || i.product.categories.includes('serum'))

    const today = new Date()
    const createdDate = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`

    // Map each known header name → its export value.
    // Any column not listed here (future additions) gets an empty cell automatically.
    const exportMap = {
      'english product name': bundleEnName.trim(),
      'uk market sku':        effectiveName,
      'created date':         createdDate,
      'status':               'Active',
      'amazon asin':          '',
      'spanish product name': bundleEsName.trim(),
      'spanish market sku':   componentSkus.join('---'),
      'gtin':                 '',
      'bundle?':              'TRUE',
      'number of components': String(items.length),
      'bundle component skus': componentSkus.join(','),
      'uk rrp': '', 'es rrp': '', 'eu rrp': '',
      'us rrp': '', 'cn rrp': '', 'au rrp': '',
      'large?':  isLarge ? 'TRUE' : 'FALSE',
      'lash?':   isLash  ? 'TRUE' : 'FALSE',
      'brow?':   isBrow  ? 'TRUE' : 'FALSE',
      'hair?':   isHair  ? 'TRUE' : 'FALSE',
      'serum?':  isSerum ? 'TRUE' : 'FALSE',
    }

    // Follow the sheet's actual column order; unknown columns → empty string
    const row = (headers.length ? headers : Object.keys(exportMap))
      .map(h => exportMap[h.toLowerCase().trim()] ?? '')
      .join('\t')

    navigator.clipboard.writeText(row).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCopyDetails = () => {
    if (!canCopy) return
    const contents = items.map(i => `* ${i.product.nameEn} - ${i.product.skuUk}`).join('\n')
    const text = `Bundle Name: ${bundleEnName.trim()}\nBundle SKU: ${effectiveName}\nBundle Contents:\n\n${contents}`
    navigator.clipboard.writeText(text).then(() => {
      setCopiedDetails(true)
      setTimeout(() => setCopiedDetails(false), 2000)
    })
  }

  if (count === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>Add products above to see bundle pricing</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex gap-0 h-full">
        {/* Left column: names + SKU + duplicate + component breakdown */}
        <div className="flex-1 min-w-0 p-4 border-r overflow-y-auto" style={{ borderColor: 'rgba(16,24,32,0.08)' }}>

          {/* Duplicate warning */}
          {duplicate && (
            <div
              className="mb-3 rounded-lg px-3 py-2.5 flex items-start gap-2"
              style={{ border: '1px solid #fde68a', backgroundColor: '#fef3c7' }}
            >
              <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#b45309' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-xs font-semibold font-sans" style={{ color: '#b45309' }}>Bundle already exists</p>
                <p className="text-xs mt-0.5 font-sans" style={{ color: '#b45309' }}>{duplicate.nameEn}</p>
                <p className="text-xs font-mono" style={{ color: '#b45309', opacity: 0.75 }}>{duplicate.skuUk}</p>
              </div>
            </div>
          )}

          {/* English product name */}
          <div className="mb-3">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>
              English Name <span style={{ color: '#b45309' }}>*</span>
            </label>
            <input
              type="text"
              value={bundleEnName}
              onChange={e => setBundleEnName(e.target.value)}
              placeholder="e.g. Lash Growth Serum Duo Pack"
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none font-sans"
              style={{ backgroundColor: '#ffffff', color: '#101820', border: '1px solid rgba(16,24,32,0.12)' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(16,24,32,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(16,24,32,0.12)' }}
            />
          </div>

          {/* Spanish product name */}
          <div className="mb-3">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>Spanish Name</label>
            <input
              type="text"
              value={bundleEsName}
              onChange={e => setBundleEsName(e.target.value)}
              placeholder="e.g. Pack Dúo Sérum De Pestañas"
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none font-sans"
              style={{ backgroundColor: '#ffffff', color: '#101820', border: '1px solid rgba(16,24,32,0.12)' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(16,24,32,0.4)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(16,24,32,0.12)' }}
            />
          </div>

          {/* Bundle SKU */}
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>Bundle SKU</label>
            <div className="relative">
              <input
                type="text"
                value={effectiveName}
                onChange={e => { if (!duplicate) { setCustomName(e.target.value); setNameEdited(true) } }}
                readOnly={!!duplicate}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg focus:outline-none pr-14"
                style={
                  duplicate
                    ? { backgroundColor: 'rgba(16,24,32,0.03)', color: 'rgba(16,24,32,0.45)', border: '1px solid rgba(16,24,32,0.08)', cursor: 'not-allowed' }
                    : { backgroundColor: '#ffffff', color: '#101820', border: '1px solid rgba(16,24,32,0.12)' }
                }
                onFocus={e => { if (!duplicate) e.target.style.borderColor = 'rgba(16,24,32,0.4)' }}
                onBlur={e => { if (!duplicate) e.target.style.borderColor = 'rgba(16,24,32,0.12)' }}
                placeholder="BUNDLE-..."
              />
              {nameEdited && !duplicate && (
                <button
                  onClick={() => { setNameEdited(false); setCustomName('') }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-sans transition-colors"
                  style={{ color: 'rgba(16,24,32,0.45)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#101820' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(16,24,32,0.45)' }}
                >
                  Reset
                </button>
              )}
            </div>
            {!nameEdited && !duplicate && (
              <p className="text-xs mt-1 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>Auto-generated · click to edit</p>
            )}
          </div>

          {/* Component breakdown */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>
              Components · {market?.label ?? ''} pricing
            </h4>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(16,24,32,0.1)' }}>
              {items.map(item => (
                <div
                  key={item.instanceId}
                  className="flex items-center justify-between px-3 py-2 border-b last:border-0"
                  style={{ borderColor: 'rgba(16,24,32,0.06)' }}
                >
                  <span className="text-xs truncate mr-2 font-sans" style={{ color: 'rgba(16,24,32,0.6)' }}>{item.product.nameEn}</span>
                  <span className="text-xs font-medium shrink-0 font-sans" style={{ color: '#101820' }}>
                    {market ? formatPrice(item.product.prices[selectedMarket], market) : '—'}
                  </span>
                </div>
              ))}
              {mBreakdown && market && (
                <>
                  <div
                    className="flex items-center justify-between px-3 py-2 border-t"
                    style={{ backgroundColor: 'rgba(16,24,32,0.03)', borderColor: 'rgba(16,24,32,0.08)' }}
                  >
                    <span className="text-xs font-semibold font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>Total RRP</span>
                    <span className="text-xs font-semibold font-sans" style={{ color: '#101820' }}>
                      {formatPrice(mBreakdown.total, market)}
                    </span>
                  </div>
                  {rate > 0 && (
                    <div
                      className="flex items-center justify-between px-3 py-2 border-t"
                      style={{ backgroundColor: 'rgba(58,122,80,0.06)', borderColor: 'rgba(58,122,80,0.15)' }}
                    >
                      <span className="text-xs font-semibold font-sans" style={{ color: '#3a7a50' }}>After {pct}% discount</span>
                      <span className="text-xs font-bold font-sans" style={{ color: '#3a7a50' }}>
                        {formatPrice(mBreakdown.discounted, market)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right column: discount tiers + price table + copy buttons */}
        <div className="shrink-0 p-4 overflow-y-auto flex flex-col" style={{ width: '420px' }}>
          {/* Items + discount */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold font-sans" style={{ color: '#101820' }}>
              {count} item{count !== 1 ? 's' : ''}
            </span>
            {rate > 0 ? (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold font-sans"
                style={{ backgroundColor: 'rgba(58,122,80,0.1)', color: '#3a7a50' }}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {pct}% off
              </span>
            ) : (
              <span className="text-xs font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>Add 2+ items for a discount</span>
            )}
          </div>

          <DiscountTierBar count={count} discounts={discounts} />

          {/* Price table — all markets */}
          <div className="mt-4 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>All markets</p>
            <PriceTable
              markets={markets}
              prices={totals.total}
              discountedPrices={rate > 0 ? totals.discounted : undefined}
              discountRate={rate}
            />
          </div>

          {/* Export buttons */}
          <div className="mt-4 pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(16,24,32,0.08)' }}>
            {!canCopy && !duplicate && count >= 2 && (
              <p className="text-xs font-sans" style={{ color: 'rgba(16,24,32,0.4)' }}>
                Enter an English name to enable export
              </p>
            )}

            {/* Copy Sheets row */}
            <CopyButton
              onClick={handleCopyRow}
              disabled={!canCopy}
              copied={copied}
              label="Copy Row for Sheets"
              copiedLabel="Copied row"
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />}
              primary
            />

            {/* Copy details string */}
            <CopyButton
              onClick={handleCopyDetails}
              disabled={!canCopy}
              copied={copiedDetails}
              label="Copy Bundle Details"
              copiedLabel="Copied details"
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function CopyButton({ onClick, disabled, copied, label, copiedLabel, icon, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold font-sans transition-all"
      style={
        disabled
          ? { backgroundColor: 'rgba(16,24,32,0.05)', color: 'rgba(16,24,32,0.25)', cursor: 'not-allowed', border: '1px solid rgba(16,24,32,0.08)' }
          : copied
            ? { backgroundColor: 'rgba(58,122,80,0.1)', color: '#3a7a50', border: '1px solid rgba(58,122,80,0.2)', cursor: 'default' }
            : primary
              ? { backgroundColor: '#101820', color: '#ffffff', cursor: 'pointer' }
              : { backgroundColor: 'rgba(16,24,32,0.06)', color: '#101820', border: '1px solid rgba(16,24,32,0.1)', cursor: 'pointer' }
      }
      onMouseEnter={e => { if (!disabled && !copied) e.currentTarget.style.opacity = '0.85' }}
      onMouseLeave={e => { if (!disabled && !copied) e.currentTarget.style.opacity = '1' }}
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {copied
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          : icon
        }
      </svg>
      {copied ? copiedLabel : label}
    </button>
  )
}

function DiscountTierBar({ count, discounts }) {
  const tiers = Object.keys(discounts).map(Number).sort((a, b) => a - b)
  const nextTier = tiers.find(t => t > count)
  const remaining = nextTier ? nextTier - count : 0

  return (
    <div
      className="rounded-lg p-3 text-xs"
      style={{ backgroundColor: 'rgba(16,24,32,0.03)', border: '1px solid rgba(16,24,32,0.08)' }}
    >
      <div className="flex justify-between mb-1.5">
        {tiers.map(tier => {
          const active = count >= tier
          return (
            <div
              key={tier}
              className="flex flex-col items-center gap-0.5 font-sans"
              style={{ color: active ? '#3a7a50' : 'rgba(16,24,32,0.45)' }}
            >
              <span className="font-bold text-sm" style={{ color: active ? '#3a7a50' : 'rgba(16,24,32,0.28)' }}>
                {Math.round(discounts[String(tier)] * 100)}%
              </span>
              <span>{tier}{tier === Math.max(...tiers) ? '+' : ''} items</span>
            </div>
          )
        })}
      </div>
      {/* Progress dots */}
      <div className="flex gap-1 mt-2 justify-center">
        {tiers.map(tier => (
          <div
            key={tier}
            className="w-2 h-2 rounded-full transition-colors"
            style={{ backgroundColor: count >= tier ? '#3a7a50' : 'rgba(16,24,32,0.12)' }}
          />
        ))}
      </div>
      {remaining > 0 && (
        <p className="text-center mt-1.5 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>
          Add {remaining} more for {Math.round(discounts[String(nextTier)] * 100)}% off
        </p>
      )}
    </div>
  )
}

// ─── Drag overlay mini-card ───────────────────────────────────────────────────

function DragPreview({ product }) {
  const img = skuImages[product.skuUk]
  return (
    <div
      className="relative shadow-2xl rounded-xl w-36 h-36 p-3 flex flex-col justify-between rotate-2 overflow-hidden"
      style={{ backgroundColor: '#ffffff', border: '2px solid #101820', opacity: 0.95 }}
    >
      {img && (
        <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ zIndex: 0 }}>
          <img src={img} alt="" className="w-full h-full object-cover opacity-20" />
        </div>
      )}
      <div className="relative z-10 text-xs font-semibold leading-tight line-clamp-3 font-serif" style={{ color: '#101820' }}>{product.nameEn}</div>
      <div className="relative z-10 text-xs font-mono truncate" style={{ color: 'rgba(16,24,32,0.45)' }}>{product.skuUk}</div>
    </div>
  )
}

// ─── Main BuilderView ─────────────────────────────────────────────────────────

export default function BuilderView({ products, markets, discounts, selectedMarket, headers }) {
  const [bundleItems, setBundleItems] = useState([])
  const [activeDragProduct, setActiveDragProduct] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = useCallback(({ active }) => {
    const d = active.data.current
    if (d?.type === 'picker') setActiveDragProduct(d.product)
    else if (d?.type === 'canvas') setActiveDragProduct(d.item.product)
  }, [])

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveDragProduct(null)
    if (!over) return

    const aType = active.data.current?.type
    const oType = over.data.current?.type
    const overIsCanvas = over.id === 'canvas' || oType === 'canvas'

    // Picker → canvas: add product
    if (aType === 'picker' && overIsCanvas) {
      const product = active.data.current.product
      setBundleItems(prev => [...prev, { instanceId: `item-${++instanceCounter}`, product }])
      return
    }

    // Canvas → canvas: reorder
    if (aType === 'canvas' && oType === 'canvas') {
      setBundleItems(prev => {
        const oldIdx = prev.findIndex(i => i.instanceId === active.id)
        const newIdx = prev.findIndex(i => i.instanceId === over.id)
        if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return prev
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }, [])

  const handleRemove = useCallback((instanceId) => {
    setBundleItems(prev => prev.filter(i => i.instanceId !== instanceId))
  }, [])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Top half: picker + canvas ── */}
        <div className="flex min-h-0" style={{ flex: '0 0 52%' }}>
          {/* Product picker */}
          <div className="w-52 shrink-0 overflow-hidden">
            <ProductPicker products={products} selectedMarket={selectedMarket} markets={markets} headers={headers} />
          </div>

          {/* Canvas */}
          <div className="flex-1 flex flex-col p-4 gap-2 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold font-sans" style={{ color: '#101820' }}>
                Bundle Canvas
                {bundleItems.length > 0 && (
                  <span className="ml-2 text-xs font-normal font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>
                    {bundleItems.length} item{bundleItems.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              {bundleItems.length > 0 && (
                <button
                  onClick={() => setBundleItems([])}
                  className="text-xs transition-colors font-sans"
                  style={{ color: 'rgba(16,24,32,0.45)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#b45309' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(16,24,32,0.45)' }}
                >
                  Clear all
                </button>
              )}
            </div>
            <HorizontalCanvas
              items={bundleItems}
              selectedMarket={selectedMarket}
              markets={markets}
              onRemove={handleRemove}
            />
          </div>
        </div>

        {/* ── Bottom half: bundle summary ── */}
        <div className="min-h-0" style={{ flex: '0 0 48%', borderTop: '1px solid rgba(16,24,32,0.08)', backgroundColor: '#ffffff' }}>
          <div className="flex items-center px-4 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(16,24,32,0.06)' }}>
            <h2 className="text-sm font-semibold font-sans" style={{ color: '#101820' }}>Bundle Summary</h2>
          </div>
          <div className="overflow-hidden" style={{ height: 'calc(100% - 37px)' }}>
            <BundleSummary
              items={bundleItems}
              markets={markets}
              discounts={discounts}
              selectedMarket={selectedMarket}
              products={products}
              headers={headers}
            />
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragProduct ? <DragPreview product={activeDragProduct} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
