import { useState, useMemo, useCallback, useEffect } from 'react'
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
  calcBundlePrices, getDiscountRate,
  formatPrice, findDuplicateBundle,
} from '../utils/pricing'
import { searchProducts } from '../utils/search'
import { buildExportBlocks } from '../utils/exportRow'
import {
  createBundle, bundleSku, bundleIssues, isBundleReady, siblingsOf,
  buildBundleExportMap, formatBundleDetails,
} from '../utils/bundles'
import StatusPill from './StatusPill'

let instanceCounter = 0

// ─── Draggable card in the left picker ───────────────────────────────────────

function PickerCard({ product, selectedMarket, markets }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `picker::${product.skuUk}`,
    data: { type: 'picker', product },
  })
  const market = markets.find(m => m.key === selectedMarket)
  const dimmed = product.isDiscontinued

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="group mx-2 mb-2 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing select-none transition-all"
      style={{
        opacity: isDragging ? 0.4 : dimmed ? 0.5 : 1,
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
              className="shrink-0 w-10 h-14 rounded-md object-contain"
              style={{ background: '#f5f0ed', filter: dimmed ? 'grayscale(1)' : undefined }} />
          : <div className="shrink-0 w-4 h-4 mt-0.5">
              <svg style={{ color: 'rgba(16,24,32,0.28)' }} fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
              </svg>
            </div>
        }
        <div className="min-w-0">
          <div className="text-xs font-medium leading-tight line-clamp-2 font-sans" style={{ color: dimmed ? 'rgba(16,24,32,0.55)' : '#101820' }}>{product.nameEn}</div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'rgba(16,24,32,0.45)' }}>{product.skuUk}</div>
          <div className="flex gap-1 mt-1 flex-wrap">
            <StatusPill status={product.status} size="xs" />
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
  const dimmed = item.product.isDiscontinued

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        height: '172px',
        opacity: isDragging ? 0.4 : dimmed ? 0.55 : 1,
        borderColor: isDragging ? 'rgba(16,24,32,0.3)' : 'rgba(16,24,32,0.1)',
        boxShadow: isDragging ? '0 10px 25px rgba(16,24,32,0.15)' : undefined,
        backgroundColor: '#ffffff',
      }}
      className="relative flex-shrink-0 w-40 rounded-xl border-2 flex flex-col p-3 select-none transition-shadow"
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
            <div className="rounded-md overflow-hidden w-full flex items-center justify-center"
              style={{ height: '96px', background: '#f5f0ed' }}>
              <img src={skuImages[item.product.skuUk]} alt="" loading="lazy"
                className="w-full h-full object-contain"
                style={{ filter: dimmed ? 'grayscale(1)' : undefined }} />
            </div>
            <div>
              {dimmed && <div className="mb-1"><StatusPill status={item.product.status} size="xs" /></div>}
              <div className="text-[10px] font-semibold leading-tight line-clamp-2 pr-2 font-serif mt-1.5" style={{ color: dimmed ? 'rgba(16,24,32,0.55)' : '#101820' }}>
                {item.product.nameEn}
              </div>
              {market && price > 0 && (
                <div className="text-xs font-bold mt-0.5 font-sans" style={{ color: '#101820' }}>
                  {formatPrice(price, market)}
                </div>
              )}
            </div>
          </>
        ) : (
          /* No-image fallback */
          <>
            <div>
              {dimmed && <div className="mb-1"><StatusPill status={item.product.status} size="xs" /></div>}
              <div className="text-xs font-semibold leading-tight line-clamp-2 mt-1 pr-2 font-serif" style={{ color: dimmed ? 'rgba(16,24,32,0.55)' : '#101820' }}>
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
              className="flex-shrink-0 w-40 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors"
              style={{
                height: '172px',
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

// ─── Bundle tab strip ────────────────────────────────────────────────────────

function BundleTabs({ bundles, activeId, products, onSelect, onAdd, onRemove }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
      {bundles.map((b, i) => {
        const isActive = b.id === activeId
        const ready    = isBundleReady(b, products, siblingsOf(b, bundles))
        const label    = b.nameEn.trim() || `Bundle ${i + 1}`
        const dot      = b.items.length === 0
          ? 'rgba(16,24,32,0.2)'
          : ready ? '#3a7a50' : '#b45309'

        return (
          <div
            key={b.id}
            className="group flex items-center shrink-0 rounded-lg transition-all"
            style={{
              background: isActive ? '#101820' : 'rgba(16,24,32,0.05)',
              border: `1px solid ${isActive ? '#101820' : 'rgba(16,24,32,0.1)'}`,
            }}
          >
            <button
              onClick={() => onSelect(b.id)}
              className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 text-xs font-medium font-sans max-w-[180px]"
              style={{ color: isActive ? '#ffffff' : 'rgba(16,24,32,0.65)' }}
              title={label}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
              <span className="truncate">{label}</span>
              <span
                className="shrink-0 tabular-nums px-1 rounded"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(16,24,32,0.08)',
                  color: isActive ? 'rgba(255,255,255,0.75)' : 'rgba(16,24,32,0.5)',
                }}
              >
                {b.items.length}
              </span>
            </button>
            {bundles.length > 1 && (
              <button
                onClick={() => onRemove(b.id)}
                className="pr-2 pl-0.5 py-1.5 transition-opacity opacity-40 hover:opacity-100"
                style={{ color: isActive ? '#ffffff' : 'rgba(16,24,32,0.6)' }}
                title={`Remove ${label}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )
      })}

      <button
        onClick={onAdd}
        className="flex items-center gap-1 shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium font-sans transition-colors"
        style={{ border: '1px dashed rgba(16,24,32,0.25)', color: 'rgba(16,24,32,0.55)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#101820'; e.currentTarget.style.color = '#101820' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(16,24,32,0.25)'; e.currentTarget.style.color = 'rgba(16,24,32,0.55)' }}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New bundle
      </button>
    </div>
  )
}

// ─── Export panel: one bundle or the whole session ───────────────────────────

function ExportPanel({ bundles, products, headers, activeId, selectedMarket, markets, discounts, onSelectBundle }) {
  const [scope, setScope] = useState('all')          // 'active' | 'all'
  const [copiedKey, setCopiedKey] = useState(null)
  const [copiedDetails, setCopiedDetails] = useState(false)
  const [copyError, setCopyError] = useState('')

  const market = markets.find(m => m.key === selectedMarket)

  const evaluated = useMemo(() => bundles.map(b => {
    const duplicate = findDuplicateBundle(b.items, products)
    return {
      bundle: b,
      sku: bundleSku(b, duplicate),
      issues: bundleIssues(b, products, siblingsOf(b, bundles)),
    }
  }), [bundles, products])

  const inScope = scope === 'all'
    ? evaluated
    : evaluated.filter(e => e.bundle.id === activeId)

  const ready   = inScope.filter(e => e.issues.length === 0)
  const blocked = inScope.filter(e => e.issues.length > 0)

  // Same bundle order across every block, so pasted rows line up.
  const exportMaps = ready.map(e => buildBundleExportMap(e.bundle, e.sku))
  const blocks = exportMaps.length
    ? buildExportBlocks(headers.length ? headers : Object.keys(exportMaps[0]), exportMaps)
    : []

  const copy = (text, onDone) => {
    setCopyError('')
    if (!navigator.clipboard?.writeText) {
      setCopyError('Clipboard unavailable in this browser')
      return
    }
    navigator.clipboard.writeText(text).then(onDone).catch(err => {
      setCopyError(`Copy failed — ${err?.message || 'clipboard was blocked'}`)
    })
  }

  const copyBlock = (block, key) => copy(block.tsv, () => {
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 2000)
  })

  const copyDetails = () => copy(
    formatBundleDetails(ready.map(e => ({ nameEn: e.bundle.nameEn.trim(), sku: e.sku, items: e.bundle.items }))),
    () => {
      setCopiedDetails(true)
      setTimeout(() => setCopiedDetails(false), 2000)
    }
  )

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(16,24,32,0.08)' }}>
      {/* Scope switch */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>
          Export
        </p>
        <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'rgba(16,24,32,0.06)' }}>
          {[
            { key: 'active', label: 'This bundle' },
            { key: 'all',    label: `All ${bundles.length}` },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setScope(opt.key)}
              className="px-2.5 py-1 rounded text-xs font-medium font-sans transition-all"
              style={scope === opt.key
                ? { background: '#ffffff', color: '#101820', boxShadow: '0 1px 2px rgba(16,24,32,0.08)' }
                : { color: 'rgba(16,24,32,0.5)' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Review list — what's about to be exported, and what isn't */}
      <div className="rounded-lg mb-3 overflow-hidden" style={{ border: '1px solid rgba(16,24,32,0.1)' }}>
        {inScope.length === 0 ? (
          <p className="text-xs px-3 py-2.5 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>Nothing selected</p>
        ) : inScope.map((e, i) => {
          const ok = e.issues.length === 0
          const idx = bundles.findIndex(b => b.id === e.bundle.id)
          const priced = e.bundle.items.length
            ? calcBundlePrices(e.bundle.items, markets, discounts).find(b => b.market.key === selectedMarket)
            : null
          return (
            <button
              key={e.bundle.id}
              onClick={() => onSelectBundle(e.bundle.id)}
              className="w-full text-left px-3 py-2 flex items-start gap-2 transition-colors"
              style={{
                borderTop: i === 0 ? 'none' : '1px solid rgba(16,24,32,0.06)',
                background: e.bundle.id === activeId ? 'rgba(16,24,32,0.04)' : '#ffffff',
              }}
              title="Jump to this bundle"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                style={{ background: ok ? '#3a7a50' : '#b45309' }} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium truncate font-sans" style={{ color: '#101820' }}>
                    {e.bundle.nameEn.trim() || `Bundle ${idx + 1}`}
                  </span>
                  <span className="text-[10px] shrink-0 font-sans" style={{ color: 'rgba(16,24,32,0.4)' }}>
                    {e.bundle.items.length} item{e.bundle.items.length !== 1 ? 's' : ''}
                  </span>
                </span>
                {ok
                  ? <span className="block text-[10px] font-mono truncate mt-0.5" style={{ color: 'rgba(16,24,32,0.45)' }}>{e.sku}</span>
                  : <span className="block text-[10px] mt-0.5 font-sans" style={{ color: '#b45309' }}>{e.issues.join(' · ')}</span>
                }
              </span>
              {ok && priced && market && (
                <span className="text-xs font-semibold shrink-0 tabular-nums font-sans" style={{ color: '#101820' }}>
                  {formatPrice(priced.discounted, market)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {blocked.length > 0 && ready.length > 0 && (
        <p className="text-xs mb-2 font-sans" style={{ color: 'rgba(16,24,32,0.5)' }}>
          {blocked.length} bundle{blocked.length !== 1 ? 's' : ''} excluded — the copies below
          {' '}cover the {ready.length} ready {ready.length === 1 ? 'bundle' : 'bundles'} only.
        </p>
      )}

      {ready.length === 0 ? (
        <p className="text-xs font-sans" style={{ color: 'rgba(16,24,32,0.4)' }}>
          {blocked.length > 0
            ? `Fix the ${blocked.length === 1 ? 'issue' : 'issues'} above to enable export.`
            : 'Nothing ready to export yet.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {blocks.length > 1 && (
            <p className="text-xs font-sans leading-relaxed" style={{ color: 'rgba(16,24,32,0.5)' }}>
              Paste each block into its own range, {ready.length > 1 ? `${ready.length} rows` : '1 row'} tall.
              The pricing columns in between are left untouched so their formulas keep working.
            </p>
          )}

          {blocks.map(block => (
            <CopyButton
              key={block.range}
              onClick={() => copyBlock(block, block.range)}
              copied={copiedKey === block.range}
              label={`Copy ${block.range}${block.rowCount > 1 ? ` · ${block.rowCount} rows` : ''}`}
              copiedLabel={`Copied — paste into ${block.range.split('–')[0]}`}
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />}
              primary
            />
          ))}

          <CopyButton
            onClick={copyDetails}
            copied={copiedDetails}
            label={`Copy details${ready.length > 1 ? ` · ${ready.length} bundles` : ''}`}
            copiedLabel="Copied details"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />}
          />
        </div>
      )}

      {copyError && (
        <p className="text-xs font-semibold font-sans mt-2" style={{ color: '#b45309' }}>{copyError}</p>
      )}
    </div>
  )
}

// ─── Bottom summary panel ─────────────────────────────────────────────────────

function BundleSummary({ bundle, bundles, markets, discounts, selectedMarket, products, headers, onChange, onSelectBundle }) {
  const items = bundle.items
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

  // Locked to the existing product's SKU when this duplicates a sheet row
  const effectiveName = bundleSku(bundle, duplicate)

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex gap-0 h-full">
        {/* Left column: names + SKU + duplicate + component breakdown */}
        <div className="flex-1 min-w-0 p-4 border-r overflow-y-auto" style={{ borderColor: 'rgba(16,24,32,0.08)' }}>
          {count === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm font-sans text-center" style={{ color: 'rgba(16,24,32,0.45)' }}>
                Drag products onto the canvas to build this bundle
              </p>
            </div>
          ) : (
          <>
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
              value={bundle.nameEn}
              onChange={e => onChange({ nameEn: e.target.value })}
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
              value={bundle.nameEs}
              onChange={e => onChange({ nameEs: e.target.value })}
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
                onChange={e => { if (!duplicate) onChange({ customSku: e.target.value, skuEdited: true }) }}
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
              {bundle.skuEdited && !duplicate && (
                <button
                  onClick={() => onChange({ skuEdited: false, customSku: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-sans transition-colors"
                  style={{ color: 'rgba(16,24,32,0.45)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#101820' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(16,24,32,0.45)' }}
                >
                  Reset
                </button>
              )}
            </div>
            {!bundle.skuEdited && !duplicate && (
              <p className="text-xs mt-1 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>Auto-generated · click to edit</p>
            )}
          </div>

          {/* Component breakdown */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>
              Components · {market?.label ?? ''} pricing
            </h4>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(16,24,32,0.1)' }}>
              {items.map(item => {
                const itemPrice = item.product.prices[selectedMarket] ?? 0
                return (
                  <div
                    key={item.instanceId}
                    className="flex items-center justify-between px-3 py-2 border-b last:border-0"
                    style={{ borderColor: 'rgba(16,24,32,0.06)' }}
                  >
                    <span className="text-xs truncate mr-2 font-sans flex items-center gap-1.5 min-w-0" style={{ color: 'rgba(16,24,32,0.6)' }}>
                      <span className="truncate">{item.product.nameEn}</span>
                      <StatusPill status={item.product.status} size="xs" />
                    </span>
                    {itemPrice > 0 ? (
                      <span className="text-xs font-medium shrink-0 font-sans" style={{ color: '#101820' }}>
                        {market ? formatPrice(itemPrice, market) : '—'}
                      </span>
                    ) : (
                      <span
                        className="text-xs font-semibold shrink-0 font-sans"
                        style={{ color: '#b45309' }}
                        title={`No ${market?.label ?? ''} price in the sheet — counts as 0 in the total below`}
                      >
                        no {market?.label ?? ''} price
                      </span>
                    )}
                  </div>
                )
              })}
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
                  {!mBreakdown.isComplete && (
                    <div className="px-3 py-2 border-t" style={{ backgroundColor: '#fef3c7', borderColor: '#fde68a' }}>
                      <p className="text-xs font-semibold font-sans" style={{ color: '#b45309' }}>
                        Total is understated — {mBreakdown.missing.length} of {count} component{count !== 1 ? 's' : ''} ha{mBreakdown.missing.length === 1 ? 's' : 've'} no {market.label} price
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          </>
          )}
        </div>

        {/* Right column: discount tiers + price table + export */}
        <div className="shrink-0 p-4 overflow-y-auto flex flex-col" style={{ width: '440px' }}>
          {count > 0 && (
            <>
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
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>All markets</p>
                <PriceTable
                  markets={markets}
                  prices={totals.total}
                  discountedPrices={rate > 0 ? totals.discounted : undefined}
                  discountRate={rate}
                  breakdown={breakdown}
                />
              </div>
            </>
          )}

          <ExportPanel
            bundles={bundles}
            products={products}
            headers={headers}
            activeId={bundle.id}
            selectedMarket={selectedMarket}
            markets={markets}
            discounts={discounts}
            onSelectBundle={onSelectBundle}
          />
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

export default function BuilderView({ products, productMap, markets, discounts, selectedMarket, headers }) {
  // A session holds several bundles; the canvas edits whichever one is active.
  const [firstBundle] = useState(() => createBundle())
  const [bundles, setBundles] = useState([firstBundle])
  const [activeId, setActiveId] = useState(firstBundle.id)
  const [activeDragProduct, setActiveDragProduct] = useState(null)

  const activeBundle = bundles.find(b => b.id === activeId) ?? bundles[0]

  // Bundle items hold product snapshots. After a sheet refresh the parsed objects are
  // new, so re-point each item at the refreshed product to pick up changed prices and
  // statuses. Returns `prev` untouched when nothing moved, so this can't loop.
  useEffect(() => {
    if (!productMap) return
    setBundles(prev => {
      let changed = false
      const next = prev.map(b => {
        let itemsChanged = false
        const items = b.items.map(i => {
          const fresh = productMap[i.product.skuUk]
          if (fresh && fresh !== i.product) { itemsChanged = true; return { ...i, product: fresh } }
          return i
        })
        if (!itemsChanged) return b
        changed = true
        return { ...b, items }
      })
      return changed ? next : prev
    })
  }, [productMap])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const patchBundle = useCallback((id, patch) => {
    setBundles(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)))
  }, [])

  const patchActive = useCallback((patch) => {
    patchBundle(activeId, patch)
  }, [patchBundle, activeId])

  const addBundle = useCallback(() => {
    const b = createBundle()
    setBundles(prev => [...prev, b])
    setActiveId(b.id)
  }, [])

  const removeBundle = useCallback((id) => {
    const idx = bundles.findIndex(b => b.id === id)
    const next = bundles.filter(b => b.id !== id)
    if (!next.length) {
      // Never leave the session with nothing to edit
      const fresh = createBundle()
      setBundles([fresh])
      setActiveId(fresh.id)
      return
    }
    setBundles(next)
    if (id === activeId) setActiveId(next[Math.min(idx, next.length - 1)].id)
  }, [bundles, activeId])

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

    // Picker → canvas: add product to the active bundle
    if (aType === 'picker' && overIsCanvas) {
      const product = active.data.current.product
      setBundles(prev => prev.map(b => b.id === activeId
        ? { ...b, items: [...b.items, { instanceId: `item-${++instanceCounter}`, product }] }
        : b))
      return
    }

    // Canvas → canvas: reorder within the active bundle
    if (aType === 'canvas' && oType === 'canvas') {
      setBundles(prev => prev.map(b => {
        if (b.id !== activeId) return b
        const oldIdx = b.items.findIndex(i => i.instanceId === active.id)
        const newIdx = b.items.findIndex(i => i.instanceId === over.id)
        if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return b
        return { ...b, items: arrayMove(b.items, oldIdx, newIdx) }
      }))
    }
  }, [activeId])

  // Emptying a bundle clears its names too, so the next thing built here can't
  // inherit the previous product's name.
  const clearedFields = { nameEn: '', nameEs: '', customSku: '', skuEdited: false }

  const handleRemove = useCallback((instanceId) => {
    setBundles(prev => prev.map(b => {
      if (b.id !== activeId) return b
      const items = b.items.filter(i => i.instanceId !== instanceId)
      return items.length ? { ...b, items } : { ...b, items, ...clearedFields }
    }))
  }, [activeId])

  const clearActive = useCallback(() => {
    patchActive({ items: [], ...clearedFields })
  }, [patchActive])

  const readyCount = bundles.filter(b => isBundleReady(b, products, siblingsOf(b, bundles))).length

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Top half: picker + canvas ── */}
        <div className="flex min-h-0" style={{ flex: '0 0 56%' }}>
          {/* Product picker */}
          <div className="w-52 shrink-0 overflow-hidden">
            <ProductPicker products={products} selectedMarket={selectedMarket} markets={markets} />
          </div>

          {/* Canvas */}
          <div className="flex-1 flex flex-col p-4 gap-2 overflow-hidden min-w-0">
            {/* Bundle tabs */}
            <BundleTabs
              bundles={bundles}
              activeId={activeBundle.id}
              products={products}
              onSelect={setActiveId}
              onAdd={addBundle}
              onRemove={removeBundle}
            />

            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold font-sans" style={{ color: '#101820' }}>
                Bundle Canvas
                {activeBundle.items.length > 0 && (
                  <span className="ml-2 text-xs font-normal font-sans" style={{ color: 'rgba(16,24,32,0.45)' }}>
                    {activeBundle.items.length} item{activeBundle.items.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs font-sans" style={{ color: 'rgba(16,24,32,0.4)' }}>
                  {readyCount} of {bundles.length} ready
                </span>
                {activeBundle.items.length > 0 && (
                  <button
                    onClick={clearActive}
                    className="text-xs transition-colors font-sans"
                    style={{ color: 'rgba(16,24,32,0.45)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#b45309' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(16,24,32,0.45)' }}
                  >
                    Clear bundle
                  </button>
                )}
              </div>
            </div>

            <HorizontalCanvas
              items={activeBundle.items}
              selectedMarket={selectedMarket}
              markets={markets}
              onRemove={handleRemove}
            />
          </div>
        </div>

        {/* ── Bottom half: bundle summary ── */}
        <div className="min-h-0" style={{ flex: '0 0 44%', borderTop: '1px solid rgba(16,24,32,0.08)', backgroundColor: '#ffffff' }}>
          <div className="flex items-center px-4 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(16,24,32,0.06)' }}>
            <h2 className="text-sm font-semibold font-sans" style={{ color: '#101820' }}>
              {activeBundle.nameEn.trim() || `Bundle ${bundles.findIndex(b => b.id === activeBundle.id) + 1}`}
            </h2>
            <span className="ml-2 text-xs font-sans" style={{ color: 'rgba(16,24,32,0.4)' }}>
              · editing {bundles.findIndex(b => b.id === activeBundle.id) + 1} of {bundles.length}
            </span>
          </div>
          <div className="overflow-hidden" style={{ height: 'calc(100% - 37px)' }}>
            <BundleSummary
              bundle={activeBundle}
              bundles={bundles}
              markets={markets}
              discounts={discounts}
              selectedMarket={selectedMarket}
              products={products}
              headers={headers}
              onChange={patchActive}
              onSelectBundle={setActiveId}
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
