/**
 * Splitting the export row so it never overwrites the sheet's formula columns.
 *
 * Google Sheets replaces every cell inside a paste range — there is no "leave this
 * cell alone" token in a TSV. Pasting one 33-column row would therefore blank the
 * RRP / Current Price columns, which are ARRAYFORMULA-driven and recalculate from
 * component pricing.
 *
 * So instead of one row we emit one clipboard payload per contiguous run of columns
 * the app actually owns. The runs are derived from the live header row, so they
 * re-shape themselves if columns are added, removed or reordered in the sheet.
 *
 * For the current sheet this yields two blocks: A–K (names, SKUs, status, bundle
 * metadata) and Z–AD (the category flags), leaving L–Y untouched.
 */

/** 0 → "A", 25 → "Z", 26 → "AA" */
export function colLetter(index) {
  let s = ''
  let n = index
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

/** Tabs/newlines inside a value would shift every following column on paste. */
function cell(value) {
  return String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim()
}

const normalise = (h) => (h || '').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * @param headers   the sheet's actual header row (from the parsed CSV)
 * @param exportMap normalised header name → value. Any header absent from this map
 *                  is treated as not-ours and excluded from every block.
 * @returns [{ start, end, range, columns, tsv }] in left-to-right order
 */
export function buildExportBlocks(headers, exportMap) {
  const owned = headers.map(h =>
    Object.prototype.hasOwnProperty.call(exportMap, normalise(h))
  )

  const blocks = []
  let i = 0
  while (i < headers.length) {
    if (!owned[i]) { i++; continue }
    const start = i
    while (i < headers.length && owned[i]) i++
    const end = i - 1
    const columns = headers.slice(start, end + 1)
    blocks.push({
      start,
      end,
      range: start === end ? colLetter(start) : `${colLetter(start)}–${colLetter(end)}`,
      columns,
      tsv: columns.map(h => cell(exportMap[normalise(h)])).join('\t'),
    })
  }
  return blocks
}
