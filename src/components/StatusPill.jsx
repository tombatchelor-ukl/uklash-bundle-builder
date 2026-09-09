// Non-Active sheet statuses, surfaced wherever a product is shown.
// Products stay fully selectable — this only marks them.
const STATUS_STYLES = {
  discontinued:     { bg: '#f2e2e2', color: '#8a3a3a', label: 'Discontinued' },
  'not yet active': { bg: '#ece3cf', color: '#7a5a1c', label: 'Not Yet Active' },
}

export default function StatusPill({ status, size = 'sm' }) {
  if (!status) return null
  const key = status.trim().toLowerCase()
  if (key === 'active') return null

  const s = STATUS_STYLES[key] ?? { bg: '#e4ddd8', color: '#5a5048', label: status }
  const cls = size === 'xs'
    ? 'px-1.5 py-0.5 text-[9px] tracking-wide'
    : 'px-2 py-0.5 text-[10px] font-medium tracking-wide'

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full uppercase ${cls}`}
      style={{ background: s.bg, color: s.color }}
      title={`Sheet status: ${status}`}
    >
      {s.label}
    </span>
  )
}
