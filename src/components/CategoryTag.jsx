// Sophisticated, muted tag styles aligned with UKLASH brand palette
const TAG_STYLES = {
  lash:   { bg: '#ede4dc', color: '#101820' },  // warm nude
  brow:   { bg: '#e8dfc4', color: '#101820' },  // soft parchment
  hair:   { bg: '#d8e0e4', color: '#101820' },  // cool slate
  serum:  { bg: '#d8e4dc', color: '#101820' },  // sage
  bundle: { bg: '#101820', color: '#ffffff' },  // ink (premium)
  large:  { bg: '#e4ddd8', color: '#101820' },  // warm stone
}

const TAG_LABELS = {
  lash: 'Lash', brow: 'Brow', hair: 'Hair',
  serum: 'Serum', bundle: 'Bundle', large: 'Large',
}

export default function CategoryTag({ category, size = 'sm' }) {
  const style = TAG_STYLES[category] ?? { bg: '#e8e0d8', color: '#101820' }
  const label = TAG_LABELS[category] ?? category
  const cls = size === 'xs'
    ? 'px-1.5 py-0.5 text-[10px] tracking-wide'
    : 'px-2 py-0.5 text-[11px] font-medium tracking-wide'

  return (
    <span
      className={`inline-flex items-center rounded-full uppercase ${cls}`}
      style={{ background: style.bg, color: style.color }}
    >
      {label}
    </span>
  )
}
