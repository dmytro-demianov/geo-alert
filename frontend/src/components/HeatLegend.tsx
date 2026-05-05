import MarkerPin from './ui/MarkerPin'

const items: Array<{ weight: number; label: string }> = [
  { weight: -1, label: '<0' },
  { weight: 1,  label: '0–2' },
  { weight: 4,  label: '3–5' },
  { weight: 8,  label: '6–10' },
  { weight: 11, label: '11+' },
]

export default function HeatLegend() {
  return (
    <div className="absolute left-5 bottom-5 z-[90] bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/60 px-3.5 py-2.5 shadow-md pointer-events-none">
      <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2">
        Heat scale · like_weight
      </div>
      <div className="flex gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1">
            <MarkerPin weight={item.weight} size={18} />
            <span className="font-mono text-[10px] font-semibold text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
