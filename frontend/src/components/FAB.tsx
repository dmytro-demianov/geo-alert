import Icon from './ui/Icon'

interface FABProps {
  onClick: () => void
}

export default function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[90] w-14 h-14 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-pin hover:bg-brand-600 active:scale-95 transition-all"
      title="Нова позначка"
    >
      <Icon name="plus" size={24} />
    </button>
  )
}
