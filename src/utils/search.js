/**
 * Multi-token search with relevance scoring.
 *
 * Rules:
 *  - Only searches English name + UK SKU (not Spanish, to avoid false positives)
 *  - Every whitespace-separated token must appear in name OR SKU
 *  - Results are sorted by relevance: SKU-prefix match → name-prefix → contains full query → token match
 *
 * "brow serum"  → matches "Brow Growth Serum"  (both tokens present)
 * "UKHAIR"      → only matches products with "ukhair" in name or UK SKU
 */
export function searchProducts(products, query) {
  if (!query.trim()) return products

  const q      = query.toLowerCase().trim()
  const tokens = q.split(/\s+/).filter(Boolean)

  const scored = []

  for (const p of products) {
    const name = p.nameEn.toLowerCase()
    const sku  = p.skuUk.toLowerCase()

    // All tokens must match somewhere
    const allMatch = tokens.every(t => name.includes(t) || sku.includes(t))
    if (!allMatch) continue

    // Relevance score (higher = shown first)
    let score = 1
    if (sku === q)              score = 6   // exact SKU
    else if (sku.startsWith(q)) score = 5   // SKU prefix
    else if (name.startsWith(q)) score = 4  // name prefix
    else if (sku.includes(q))   score = 3   // SKU substring (full query)
    else if (name.includes(q))  score = 2   // name substring (full query)
    // else score = 1 (all tokens match but not contiguous)

    scored.push({ p, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.p)
}
