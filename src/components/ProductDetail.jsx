import CategoryTag from './CategoryTag'
import PriceTable from './PriceTable'
import { formatPrice } from '../utils/pricing'

export default function ProductDetail({ product, productMap, markets, selectedMarket }) {
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3"
        style={{ color: 'rgba(16,24,32,0.25)' }}>
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-sm font-medium">Select a product to view details</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-start justify-between gap-4 mb-2">
          {/* NyghtSerif for product name */}
          <h2 className="font-serif text-2xl leading-tight" style={{ color: '#101820' }}>
            {product.nameEn}
          </h2>
          {product.isBundle && (
            <span className="shrink-0 mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide"
              style={{ background: '#101820', color: '#ffffff' }}>
              Bundle
            </span>
          )}
        </div>
        {product.nameEs && product.nameEs !== product.nameEn && (
          <p className="text-sm italic mt-1" style={{ color: 'rgba(16,24,32,0.45)' }}>
            {product.nameEs}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {product.categories.map(c => (
            <CategoryTag key={c} category={c} />
          ))}
        </div>
      </div>

      {/* SKU & GTIN */}
      <div className="grid grid-cols-2 gap-3 mb-7">
        <InfoField label="UK SKU"    value={product.skuUk} mono />
        <InfoField label="ES SKU"    value={product.skuEs || '—'} mono />
        {product.gtin && <InfoField label="GTIN" value={product.gtin} mono />}
        {product.asin && <InfoField label="Amazon ASIN" value={product.asin} mono />}
      </div>

      <Divider />

      {/* Bundle component breakdown */}
      {product.isBundle && product.componentSkus.length > 0 && (
        <div className="mb-7">
          <SectionLabel>
            Bundle Components · {product.numComponents} items
          </SectionLabel>
          <ComponentBreakdown
            componentSkus={product.componentSkus}
            productMap={productMap}
            markets={markets}
            selectedMarket={selectedMarket}
            bundlePrices={product.prices}
          />
        </div>
      )}

      {/* Prices */}
      <div>
        <SectionLabel>{product.isBundle ? 'Bundle RRP' : 'Market RRP'}</SectionLabel>
        <PriceTable markets={markets} prices={product.prices} selectedMarket={selectedMarket} />
      </div>
    </div>
  )
}

function Divider() {
  return <hr className="my-6" style={{ borderColor: 'rgba(16,24,32,0.08)' }} />
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-widest mb-3"
      style={{ color: 'rgba(16,24,32,0.4)' }}>
      {children}
    </p>
  )
}

function InfoField({ label, value, mono }) {
  return (
    <div className="rounded-xl px-3.5 py-3" style={{ background: '#ffffff', border: '1px solid rgba(16,24,32,0.07)' }}>
      <div className="text-[9px] font-medium uppercase tracking-widest mb-1"
        style={{ color: 'rgba(16,24,32,0.35)' }}>
        {label}
      </div>
      <div className={`text-sm break-all ${mono ? 'font-mono' : ''}`}
        style={{ color: '#101820' }}>
        {value}
      </div>
    </div>
  )
}

function ComponentBreakdown({ componentSkus, productMap, markets, selectedMarket, bundlePrices }) {
  const componentCounts = componentSkus.reduce((acc, sku) => {
    acc[sku] = (acc[sku] || 0) + 1
    return acc
  }, {})
  const uniqueSkus = Object.keys(componentCounts)
  const visibleMarkets = selectedMarket
    ? markets.filter(m => m.key === selectedMarket)
    : markets.slice(0, 2)

  return (
    <div className="rounded-xl overflow-hidden mb-4"
      style={{ border: '1px solid rgba(16,24,32,0.08)' }}>
      <div className="divide-y" style={{ '--tw-divide-color': 'rgba(16,24,32,0.06)' }}>
        {uniqueSkus.map(sku => {
          const component = productMap[sku]
          const qty = componentCounts[sku]
          return (
            <div key={sku} className="flex items-center justify-between px-4 py-3 gap-2 bg-white">
              <div>
                <div className="text-sm font-medium" style={{ color: '#101820' }}>
                  {component?.nameEn || sku}
                  {qty > 1 && (
                    <span className="ml-1.5 text-xs" style={{ color: 'rgba(16,24,32,0.4)' }}>
                      ×{qty}
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(16,24,32,0.35)' }}>
                  {sku}
                </div>
              </div>
              {component && (
                <div className="text-right shrink-0">
                  {visibleMarkets.map(m => (
                    <div key={m.key} className="text-xs" style={{ color: 'rgba(16,24,32,0.55)' }}>
                      {!selectedMarket && (
                        <span style={{ color: 'rgba(16,24,32,0.3)' }}>{m.label} </span>
                      )}
                      {qty > 1 && <span style={{ color: 'rgba(16,24,32,0.3)' }}>{qty}× </span>}
                      {formatPrice(component.prices[m.key] * qty, m)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {/* Total row */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(16,24,32,0.03)', borderTop: '1px solid rgba(16,24,32,0.07)' }}>
        <span className="text-[10px] font-medium uppercase tracking-widest"
          style={{ color: 'rgba(16,24,32,0.4)' }}>
          Bundle RRP
        </span>
        <div className="text-right">
          {visibleMarkets.map(m => (
            <div key={m.key} className="text-xs font-medium" style={{ color: '#101820' }}>
              {!selectedMarket && (
                <span style={{ color: 'rgba(16,24,32,0.35)' }}>{m.label} </span>
              )}
              {formatPrice(bundlePrices[m.key], m)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
