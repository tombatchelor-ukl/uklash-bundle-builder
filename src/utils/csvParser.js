import Papa from 'papaparse'

// Build a column-index map from the actual header row (robust against column reordering/addition)
function buildColMap(headerRow) {
  const h = headerRow.map(s => (s || '').trim().toLowerCase())
  const find = (...terms) => h.findIndex(col => terms.every(t => col.includes(t)))

  return {
    NAME_EN:        find('english', 'name'),
    SKU_UK:         find('uk', 'market', 'sku'),
    NAME_ES:        find('spanish', 'name'),
    SKU_ES:         find('spanish', 'market', 'sku'),
    GTIN:           h.findIndex(s => s === 'gtin'),
    ASIN:           h.findIndex(s => s.includes('asin')),
    IS_LARGE:       h.findIndex(s => s === 'large?'),
    IS_LASH:        h.findIndex(s => s === 'lash?'),
    IS_BROW:        h.findIndex(s => s === 'brow?'),
    IS_HAIR:        h.findIndex(s => s === 'hair?'),
    IS_SERUM:       h.findIndex(s => s === 'serum?'),
    IS_BUNDLE:      h.findIndex(s => s === 'bundle?'),
    NUM_COMPONENTS: find('number', 'component'),
    COMPONENT_SKUS: find('bundle', 'component', 'sku'),
    PRICE_UK:       h.findIndex(s => s === 'uk rrp'),
    PRICE_ES:       h.findIndex(s => s === 'es rrp'),
    PRICE_EU:       h.findIndex(s => s === 'eu rrp'),
    PRICE_US:       h.findIndex(s => s === 'us rrp'),
    PRICE_CN:       h.findIndex(s => s === 'cn rrp'),
    PRICE_AU:       h.findIndex(s => s === 'au rrp'),
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

  return {
    nameEn:         row[COL.NAME_EN]?.trim() || '',
    skuUk:          row[COL.SKU_UK]?.trim() || '',
    nameEs:         row[COL.NAME_ES]?.trim() || '',
    skuEs:          row[COL.SKU_ES]?.trim() || '',
    gtin:           row[COL.GTIN]?.trim() || '',
    asin:           COL.ASIN >= 0 ? (row[COL.ASIN]?.trim() || '') : '',
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
  }
}

export function parseCsvText(text) {
  const result = Papa.parse(text, { skipEmptyLines: true })
  const rows = result.data
  if (rows.length < 2) return { products: [], productMap: {}, headers: [] }

  // Preserve the raw header row — used by the export to build correctly-ordered TSV rows
  // even when new columns are added to the sheet in future.
  const headers = rows[0].map(h => (h || '').trim())

  const COL = buildColMap(rows[0])

  const productMap = {}
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const sku = row[COL.SKU_UK]?.trim()
    if (!sku) continue
    productMap[sku] = rowToProduct(row, COL)
  }

  const products = Object.values(productMap)

  return { products, productMap, headers }
}
