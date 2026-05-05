interface MarkerPinProps {
  weight: number
  size?: number
}

function heatColor(w: number): string {
  if (w < 0) return '#9CA3AF'
  if (w <= 2) return '#6B7280'
  if (w <= 5) return '#FBBF24'
  if (w <= 10) return '#F97316'
  return '#EF4444'
}

export { heatColor }

export default function MarkerPin({ weight, size = 28 }: MarkerPinProps) {
  const color = heatColor(weight)
  return (
    <svg width={size} height={Math.round(size * 1.25)} viewBox="0 0 32 40" fill="none" className="flex-shrink-0">
      <path
        d="M16 1C8.27 1 2 7.27 2 15c0 10.5 14 24 14 24s14-13.5 14-24C30 7.27 23.73 1 16 1z"
        fill={color}
        stroke="white"
        strokeWidth="2"
      />
      <circle cx="16" cy="15" r="5" fill="white" />
    </svg>
  )
}
