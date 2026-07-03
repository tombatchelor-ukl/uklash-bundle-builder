/**
 * Returns the discount fraction for a given item count.
 * Falls back to the highest tier if count exceeds all defined tiers.
 */
export function getDiscountRate(count, discounts) {
  if (!discounts || count < 2) return 0
  const tiers = Object.keys(discounts)
    .map(Number)
    .sort((a, b) => a - b)

  let rate = 0
  for (const tier of tiers) {
    if (count >= tier) rate = discounts[String(tier)]
  }
  return rate
}

/**
 * Returns the discounted price for a single market.
 */
export function applyDiscount(price, rate) {
  return price * (1 - rate)
}

/**
 * Given an array of products and a market key, sums their prices.
 */
export function sumPrices(products, marketKey) {
  return products.reduce((acc, p) => acc + (p.prices?.[marketKey] ?? 0), 0)
}

/**
 * Formats a number as a currency string using the market's symbol.
 */
export function formatPrice(value, market) {
  if (value === 0 || value === null || value === undefined) return '—'
  const formatted = value.toFixed(2)
  switch (market.symbol) {
    case '£': return `£${formatted}`
    case '€': return `€${formatted}`
    case '$': return `${market.label === 'Australia' ? 'A$' : '$'}${formatted}`
    case '¥': return `¥${formatted}`
    default:  return `${market.symbol}${formatted}`
  }
}

/**
 * Given bundle items (array of {instanceId, product}) and the discounts config,
 * returns per-market price breakdown.
 */
export function calcBundlePrices(items, markets, discounts) {
  const products = items.map(i => i.product)   // ← unwrap from {instanceId, product}
  const count = products.length
  const rate = getDiscountRate(count, discounts)

  return markets.map(market => {
    const total = sumPrices(products, market.key)
    const discounted = applyDiscount(total, rate)
    return {
      market,
      total,
      discounted,
      rate,
      saving: total - discounted,
    }
  })
}

/**
 * Suggests a SKU name from an array of {instanceId, product} items.
 */
export function suggestSkuName(items) {
  if (!items.length) return ''
  const skuParts = items.map(i => i.product.skuUk).join('-')  // ← unwrap
  return `BUNDLE-${skuParts}`
}

/**
 * Checks whether a set of bundle items matches an existing product's component list.
 * Returns the matching product or null.
 */
export function findDuplicateBundle(items, products) {
  if (items.length < 2) return null
  const current = items.map(i => i.product.skuUk).slice().sort().join(',')
  return products.find(p => {
    if (!p.isBundle || !p.componentSkus.length) return false
    if (p.componentSkus.length !== items.length) return false
    return [...p.componentSkus].sort().join(',') === current
  }) ?? null
}
