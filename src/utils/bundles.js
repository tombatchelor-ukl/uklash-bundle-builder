import { suggestSkuName, findDuplicateBundle } from './pricing'

let seq = 0

/** A single in-progress bundle. Several of these live in one session. */
export function createBundle() {
  return {
    id: `bundle-${++seq}`,
    items: [],          // [{ instanceId, product }]
    nameEn: '',
    nameEs: '',
    customSku: '',
    skuEdited: false,
  }
}

/**
 * The SKU a bundle will export with:
 *  - the existing product's SKU when it duplicates one already in the sheet
 *  - the user's override when they've edited it
 *  - otherwise the auto-generated suggestion
 */
export function bundleSku(bundle, duplicate) {
  if (duplicate) return duplicate.skuUk
  return bundle.skuEdited ? bundle.customSku : suggestSkuName(bundle.items)
}

/** Stable identity for "same set of components", ignoring order. */
function componentKey(bundle) {
  return bundle.items.map(i => i.product.skuUk).slice().sort().join(',')
}

/**
 * Every reason a bundle can't be exported. Empty array means ready.
 * `others` are the sibling bundles in the session — a bundle can clash with
 * one of those just as easily as with a row already in the sheet.
 */
export function bundleIssues(bundle, products, others = []) {
  const issues = []

  if (bundle.items.length < 2) issues.push('Needs at least 2 products')
  if (!bundle.nameEn.trim()) issues.push('Needs an English name')

  const dupProduct = findDuplicateBundle(bundle.items, products)
  if (dupProduct) issues.push(`Already in the sheet as ${dupProduct.skuUk}`)

  if (bundle.items.length >= 2) {
    const key = componentKey(bundle)
    if (others.some(o => o.items.length === bundle.items.length && componentKey(o) === key)) {
      issues.push('Same products as another bundle below')
    }
  }

  const sku = bundleSku(bundle, dupProduct)
  if (sku && others.some(o => bundleSku(o, findDuplicateBundle(o.items, products)) === sku)) {
    issues.push('SKU clashes with another bundle below')
  }

  return issues
}

export function isBundleReady(bundle, products, others = []) {
  return bundleIssues(bundle, products, others).length === 0
}

/** Everything except `bundle`, for clash checks. */
export function siblingsOf(bundle, bundles) {
  return bundles.filter(b => b.id !== bundle.id)
}

/**
 * Normalised header name → cell value for one bundle.
 * The RRP / Current Price columns are deliberately absent: they're
 * ARRAYFORMULA-driven in the sheet, and anything listed here lands inside a
 * copied block and would overwrite those formulas on paste.
 */
export function buildBundleExportMap(bundle, sku) {
  const componentSkus = bundle.items.map(i => i.product.skuUk)

  // Categories: union across all components
  const isLarge = bundle.items.some(i => i.product.categories.includes('large'))
  const isLash  = bundle.items.some(i => i.product.isLash  || i.product.categories.includes('lash'))
  const isBrow  = bundle.items.some(i => i.product.isBrow  || i.product.categories.includes('brow'))
  const isHair  = bundle.items.some(i => i.product.isHair  || i.product.categories.includes('hair'))
  const isSerum = bundle.items.some(i => i.product.isSerum || i.product.categories.includes('serum'))

  const today = new Date()
  const createdDate = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`

  return {
    'english product name': bundle.nameEn.trim(),
    'uk market sku':        sku,
    'created date':         createdDate,
    'status':               'Active',
    'amazon asin':          '',
    'spanish product name': bundle.nameEs.trim(),
    'spanish market sku':   componentSkus.join('---'),
    'gtin':                 '',
    'bundle?':              'TRUE',
    'number of components': String(bundle.items.length),
    'bundle component skus': componentSkus.join(','),
    'large?':  isLarge ? 'TRUE' : 'FALSE',
    'lash?':   isLash  ? 'TRUE' : 'FALSE',
    'brow?':   isBrow  ? 'TRUE' : 'FALSE',
    'hair?':   isHair  ? 'TRUE' : 'FALSE',
    'serum?':  isSerum ? 'TRUE' : 'FALSE',
  }
}

/**
 * Human-readable summary. A single bundle keeps exactly the original format;
 * several are numbered and rule-separated.
 * @param entries [{ nameEn, sku, items }]
 */
export function formatBundleDetails(entries) {
  const many = entries.length > 1
  return entries.map((e, i) => {
    const header = many ? `Bundle ${i + 1} of ${entries.length}\n` : ''
    const contents = e.items.map(it => `* ${it.product.nameEn} - ${it.product.skuUk}`).join('\n')
    return `${header}Bundle Name: ${e.nameEn}\nBundle SKU: ${e.sku}\nBundle Contents:\n\n${contents}`
  }).join(`\n\n${'—'.repeat(32)}\n\n`)
}
