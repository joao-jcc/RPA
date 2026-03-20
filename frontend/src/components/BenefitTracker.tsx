import { Check, Loader2, Circle } from 'lucide-react'
import type { StageEvent } from '../types'

interface Props {
  events: StageEvent[]
}

interface BenefitItem {
  name: string
  status: 'done' | 'running' | 'pending'
}

export function BenefitTracker({ events }: Props) {
  const discoveredEvent = events.find((e) => e.stage === 'discovered')
  if (!discoveredEvent) return null

  const totalBenefits = discoveredEvent.total ?? 0
  if (totalBenefits === 0) return null

  const benefitNames: string[] = []
  const doneNames = new Set<string>()
  let runningName: string | null = null

  for (const e of events) {
    if (e.stage === 'benefit_start') {
      const name = e.message.replace(/\.\.\. \(\d+\/\d+\)$/, '').replace('Extraindo ', '')
      if (!benefitNames.includes(name)) benefitNames.push(name)
      runningName = name
    }
    if (e.stage === 'benefit_done') {
      const name = e.message.replace(/ concluído \(\d+\/\d+\)$/, '')
      doneNames.add(name)
      if (runningName === name) runningName = null
    }
  }

  const items: BenefitItem[] = benefitNames.map((name) => ({
    name,
    status: doneNames.has(name) ? 'done' : name === runningName ? 'running' : 'pending',
  }))

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.06]">
      {items.map(({ name, status }) => (
        <div
          key={name}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-300 ${
            status === 'done'
              ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
              : status === 'running'
              ? 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20'
              : 'bg-white/[0.04] text-white/30 border border-white/[0.06]'
          }`}
        >
          {status === 'done' ? (
            <Check size={10} />
          ) : status === 'running' ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Circle size={10} />
          )}
          {name}
        </div>
      ))}
    </div>
  )
}
