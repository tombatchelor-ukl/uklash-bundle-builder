import { formatPrice } from '../utils/pricing'

export default function PriceTable({ markets, prices, discountedPrices, discountRate, selectedMarket, breakdown }) {
  const showDiscount   = discountedPrices && discountRate > 0
  const visibleMarkets = selectedMarket
    ? markets.filter(m => m.key === selectedMarket)
    : markets

  // When present, lets a row say its total is missing component prices rather than
  // presenting an understated figure as complete.
  const missingByMarket = {}
  if (breakdown) {
    breakdown.forEach(b => { missingByMarket[b.market.key] = b.missing?.length ?? 0 })
  }
  const anyMissing = Object.values(missingByMarket).some(n => n > 0)

  return (
    <div className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(16,24,32,0.08)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'rgba(16,24,32,0.03)', borderBottom: '1px solid rgba(16,24,32,0.07)' }}>
            {!selectedMarket && (
              <th className="text-left px-4 py-2.5 font-medium text-[10px] uppercase tracking-widest"
                style={{ color: 'rgba(16,24,32,0.4)' }}>
                Market
              </th>
            )}
            <th className={`px-4 py-2.5 font-medium text-[10px] uppercase tracking-widest ${selectedMarket ? 'text-left' : 'text-right'}`}
              style={{ color: 'rgba(16,24,32,0.4)' }}>
              {selectedMarket ? visibleMarkets[0]?.label : 'RRP'}
            </th>
            {showDiscount && (
              <>
                <th className="text-right px-4 py-2.5 font-medium text-[10px] uppercase tracking-widest"
                  style={{ color: 'rgba(16,24,32,0.4)' }}>
                  Saving
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-[10px] uppercase tracking-widest"
                  style={{ color: '#101820' }}>
                  Bundle Price
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {visibleMarkets.map((market, i) => {
            const raw     = prices?.[market.key] ?? 0
            const disc    = discountedPrices?.[market.key] ?? 0
            const saving  = raw - disc
            const isLast  = i === visibleMarkets.length - 1
            const missing = missingByMarket[market.key] ?? 0

            return (
              <tr key={market.key}
                style={{ borderBottom: isLast ? 'none' : '1px solid rgba(16,24,32,0.05)', background: missing > 0 ? '#fffbeb' : '#ffffff' }}>
                {!selectedMarket && (
                  <td className="px-4 py-2.5 text-sm font-medium" style={{ color: '#101820' }}>
                    <span className="flex items-center gap-1.5">
                      {market.label}
                      {missing > 0 && (
                        <span
                          className="text-[10px] font-semibold"
                          style={{ color: '#b45309' }}
                          title={`${missing} component${missing !== 1 ? 's' : ''} ha${missing === 1 ? 's' : 've'} no ${market.label} price — counted as 0`}
                        >
                          −{missing}
                        </span>
                      )}
                    </span>
                  </td>
                )}
                <td className={`px-4 py-2.5 tabular-nums text-sm ${selectedMarket ? '' : 'text-right'} ${
                  showDiscount ? 'line-through' : 'font-medium'
                }`}
                  style={{ color: showDiscount ? 'rgba(16,24,32,0.3)' : '#101820' }}>
                  {raw === 0 ? '—' : formatPrice(raw, market)}
                </td>
                {showDiscount && (
                  <>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sm font-medium"
                      style={{ color: '#3a7a50' }}>
                      {saving > 0 ? `−${formatPrice(saving, market)}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sm font-medium"
                      style={{ color: '#101820' }}>
                      {disc === 0 ? '—' : formatPrice(disc, market)}
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      {anyMissing && (
        <div className="px-4 py-2" style={{ background: '#fef3c7', borderTop: '1px solid #fde68a' }}>
          <p className="text-[11px] font-medium" style={{ color: '#b45309' }}>
            Highlighted markets are missing component prices in the sheet. Those components
            count as 0, so the totals shown are lower than the real bundle price.
          </p>
        </div>
      )}
    </div>
  )
}
