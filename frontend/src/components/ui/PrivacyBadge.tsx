type Privacy = 'PUBLIC' | 'LINK_ONLY' | 'PRIVATE'

interface PrivacyBadgeProps {
  value: Privacy | string
}

const config: Record<string, { label: string; className: string }> = {
  PUBLIC:    { label: 'PUBLIC',     className: 'bg-success' },
  LINK_ONLY: { label: 'LINK ONLY',  className: 'bg-warning' },
  PRIVATE:   { label: 'PRIVATE',    className: 'bg-slate-500' },
}

export default function PrivacyBadge({ value }: PrivacyBadgeProps) {
  const c = config[value] ?? config.PRIVATE
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-widest uppercase text-white ${c.className}`}>
      {c.label}
    </span>
  )
}
