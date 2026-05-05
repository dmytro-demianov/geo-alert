interface AvatarProps {
  name: string
  size?: number
  avatarUrl?: string | null
  hue?: number
}

const gradients = [
  'from-brand-300 to-brand-500',
  'from-orange-300 to-orange-500',
  'from-slate-400 to-slate-600',
  'from-green-300 to-emerald-500',
  'from-purple-300 to-purple-500',
]

export default function Avatar({ name, size = 32, avatarUrl, hue = 0 }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  const fontSize = Math.round(size * 0.38)
  const gradient = gradients[hue % gradients.length]

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 text-white font-bold`}
      style={{ width: size, height: size, fontSize }}
    >
      {initials}
    </div>
  )
}
