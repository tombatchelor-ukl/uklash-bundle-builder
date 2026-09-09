import Papa from 'papaparse'

// Build a column-index map from the actual header row (robust against column reordering/addition)
function buildColMap(headerRow) {
  const h = headerRow.map(s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase())
  const find  = (...terms) => h.findIndex(col => terms.every(t => col.includes(t)))
  const exact = (s) => h.findIndex(col => col === s)

  return {
    NAME_EN:        find('english', 'name'),
    SKU_UK:         find('uk', 'market', 'sku'),
    STATUS:         exact('status'),
    NAME_ES:        find('spanish', 'name'),
    SKU_ES:         find('spanish', 'market', 'sku'),
    GTIN:           exact('gtin'),
    ASIN:           h.findIndex(s => s.includes('asin')),
    IS_LARGE:       exact('large?'),
    IS_LASH:        exact('lash?'),
    IS_BROW:        exact('brow?'),
    IS_HAIR:        exact('hair?'),
    IS_SERUM:       exact('serum?'),
    IS_BUNDLE:      exact('bundle?'),
    NUM_COMPONENTS: find('number', 'component'),
    COMPONENT_SKUS: find('bundle', 'component', 'sku'),

    // RRP — drives all bundle pricing
    PRICE_UK:       exact('uk rrp'),
    PRICE_ES:       exact('es rrp'),
    PRICE_EU:       exact('eu rrp'),
    PRICE_US:       exact('us rrp'),
    PRICE_CN:       exact('cn rrp'),
    PRICE_AU:       exact('au rrp'),
    // US ex-VAT is a reporting variant of the US price, not a separate market.
    PRICE_US_EXVAT: find('us', 'ex', 'vat', 'rrp'),

    // Live selling prices — shown for reference, never used in bundle maths.
    // 'us current price' precedes 'us ex vat current price' in the sheet, so the
    // looser match below resolves to the plain US column first.
    CUR_UK:         find('uk', 'current', 'price'),
    CUR_ES:         find('es', 'current', 'price'),
    CUR_EU:         find('eu', 'current', 'price'),
    CUR_US:         find('us', 'current', 'price'),
    CUR_CN:         find('cn', 'current', 'price'),
    CUR_AU:         find('au', 'current', 'price'),
    CUR_US_EXVAT:   find('us', 'ex', 'vat', 'current', 'price'),
  }
}

export function parsePrice(str) {
  if (!str || str.trim() === '') return 0
  const cleaned = str.replace(/[^0-9.]/g, '')
  return parseFloat(cleaned) || 0
}

export function parseBool(str) {
  return String(str).trim().toUpperCase() === 'TRUE'
}

export function parseComponentSkus(str) {
  if (!str || str.trim() === '') return []
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

function getCategories(isLash, isBrow, isHair, isSerum, isBundle, isLarge) {
  const cats = []
  if (isLash)   cats.push('lash')
  if (isBrow)   cats.push('brow')
  if (isHair)   cats.push('hair')
  if (isSerum)  cats.push('serum')
  if (isBundle) cats.push('bundle')
  if (isLarge)  cats.push('large')
  return cats
}

function rowToProduct(row, COL) {
  const isLash   = parseBool(row[COL.IS_LASH])
  const isBrow   = parseBool(row[COL.IS_BROW])
  const isHair   = parseBool(row[COL.IS_HAIR])
  const isSerum  = parseBool(row[COL.IS_SERUM])
  const isBundle = parseBool(row[COL.IS_BUNDLE])
  const isLarge  = parseBool(row[COL.IS_LARGE])

  // Missing/blank Status is treated as active — never hide a product because the
  // sheet has a gap.
  const status    = row[COL.STATUS]?.trim() || ''
  const statusKey = status.toLowerCase()

  return {
    nameEn:         row[COL.NAME_EN]?.trim() || '',
    skuUk:          row[COL.SKU_UK]?.trim() || '',
    nameEs:         row[COL.NAME_ES]?.trim() || '',
    skuEs:          row[COL.SKU_ES]?.trim() || '',
    gtin:           row[COL.GTIN]?.trim() || '',
    asin:           COL.ASIN >= 0 ? (row[COL.ASIN]?.trim() || '') : '',
    status,
    isDiscontinued: statusKey === 'discontinued',
    isActive:       statusKey === 'active' || statusKey === '',
    isLarge, isLash, isBrow, isHair, isSerum, isBundle,
    numComponents:  parseInt(row[COL.NUM_COMPONENTS], 10) || 0,
    componentSkus:  parseComponentSkus(row[COL.COMPONENT_SKUS]),
    categories:     getCategories(isLash, isBrow, isHair, isSerum, isBundle, isLarge),
    prices: {
      uk: parsePrice(row[COL.PRICE_UK]),
      es: parsePrice(row[COL.PRICE_ES]),
      eu: parsePrice(row[COL.PRICE_EU]),
      us: parsePrice(row[COL.PRICE_US]),
      cn: parsePrice(row[COL.PRICE_CN]),
      au: parsePrice(row[COL.PRICE_AU]),
    },
    usExVatRrp: parsePrice(row[COL.PRICE_US_EXVAT]),
    currentPrices: {
      uk: parsePrice(row[COL.CUR_UK]),
      es: parsePrice(row[COL.CUR_ES]),
      eu: parsePrice(row[COL.CUR_EU]),
      us: parsePrice(row[COL.CUR_US]),
      cn: parsePrice(row[COL.CUR_CN]),
      au: parsePrice(row[COL.CUR_AU]),
    },
    usExVatCurrent: parsePrice(row[COL.CUR_US_EXVAT]),
  }
}

export function parseCsvText(text) {
  const result = Papa.parse(text, { skipEmptyLines: true })
  const rows = result.data
  if (rows.length < 2) return { products: [], productMap: {}, headers: [], duplicateSkus: [] }

  // Preserve the raw header row — used by the export to build correctly-ordered TSV rows
  // even when new columns are added to the sheet in future.
  const headers = rows[0].map(h => (h || '').replace(/\s+/g, ' ').trim())

  const COL = buildColMap(rows[0])

  const productMap = {}
  const seen = new Set()
  const duplicateSkus = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const sku = row[COL.SKU_UK]?.trim()
    if (!sku) continue
    // Last row wins (existing behaviour) — but record the collision so the UI can say so.
    if (seen.has(sku) && !duplicateSkus.includes(sku)) duplicateSkus.push(sku)
    seen.add(sku)
    productMap[sku] = rowToProduct(row, COL)
  }

  const products = Object.values(productMap)

  return { products, productMap, headers, duplicateSkus }
}
