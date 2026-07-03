import { formatPrice } from '../utils/pricing'

export default function PriceTable({ markets, prices, discountedPrices, discountRate, selectedMarket }) {
  const showDiscount   = discountedPrices && discountRate > 0
  const visibleMarkets = selectedMarket
    ? markets.filter(m => m.key === selectedMarket)
    : markets

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
            const raw    = prices?.[market.key] ?? 0
            const disc   = discountedPrices?.[market.key] ?? 0
            const saving = raw - disc
            const isLast = i === visibleMarkets.length - 1

            return (
              <tr key={market.key}
                style={{ borderBottom: isLast ? 'none' : '1px solid rgba(16,24,32,0.05)', background: '#ffffff' }}>
                {!selectedMarket && (
                  <td className="px-4 py-2.5 text-sm font-medium" style={{ color: '#101820' }}>
                    {market.label}
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
    </div>
  )
}
