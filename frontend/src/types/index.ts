export type Stage =
  | 'searching'
  | 'found'
  | 'extracting'
  | 'opening'
  | 'discovered'
  | 'benefit_start'
  | 'benefit_done'
  | 'uploading'
  | 'done'
  | 'error'

export interface StageEvent {
  stage: Stage
  message: string
  current?: number
  total?: number
  url?: string
  timestamp: Date
  // Extra fields emitted by specific stages
  benefit_name?: string
  total_received?: string
}

// rows podem vir como {columns: {...}} ou diretamente como {chave: valor}
export type BenefitRow = Record<string, string>

export interface Benefit {
  type: string
  total_received: string
  detail_url: string
  rows: BenefitRow[]
}

export interface PersonaResponse {
  name: string
  cpf: string
  nis: string
  location: string
  links: { profile: string }
  benefits: Benefit[]
}

export type JobStatus = 'pending' | 'running' | 'done' | 'failed'

export interface SearchSession {
  job_id: string
  termo: string
  status: JobStatus
  events: StageEvent[]
  result?: PersonaResponse
  error?: string
  started_at: Date
  finished_at?: Date
}

export const STAGE_LABELS: Record<Stage, string> = {
  searching: 'Pesquisando',
  found: 'Pessoa encontrada',
  extracting: 'Extraindo dados',
  opening: 'Abrindo recebimentos',
  discovered: 'Benefícios identificados',
  benefit_start: 'Extraindo benefício',
  benefit_done: 'Benefício concluído',
  uploading: 'Salvando no Drive',
  done: 'Concluído',
  error: 'Erro',
}

export function getStageProgress(events: StageEvent[]): number {
  if (events.length === 0) return 0
  const lastStage = events[events.length - 1].stage
  if (lastStage === 'done') return 100
  const stageOrder: Stage[] = [
    'searching', 'found', 'extracting', 'opening',
    'discovered', 'benefit_start', 'benefit_done', 'uploading', 'done',
  ]
  const seen = new Set(events.map((e) => e.stage))
  const seenCount = stageOrder.filter((s) => seen.has(s)).length
  return Math.min(Math.round((seenCount / stageOrder.length) * 100), 99)
}

// Normaliza uma row independente do formato recebido
export function normalizeRow(row: unknown): Record<string, string> {
  if (!row || typeof row !== 'object') return {}
  const r = row as Record<string, unknown>
  // formato antigo: { columns: { ... } }
  if (r.columns && typeof r.columns === 'object') {
    return r.columns as Record<string, string>
  }
  // formato novo: { "Mês": "11/2020", ... }
  return Object.fromEntries(
    Object.entries(r).map(([k, v]) => [k, String(v ?? '')])
  )
}