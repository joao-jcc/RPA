import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { SearchSession, StageEvent, PersonaResponse, JobStatus } from '../types'
import type { SearchRow } from '../api/client'

interface AppState {
  sessions:    SearchSession[]
  remoteCache: Record<string, PersonaResponse>
  // Estado persistente da aba de dados — sobrevive a troca de aba
  explorer: {
    rows:     SearchRow[]
    fetched:  boolean
    page:     number
    hasMore:  boolean
    fromRow:  number   // seletor do usuário
    toRow:    number   // seletor do usuário
  }
}

type Action =
  | { type: 'ADD_SESSION';    payload: SearchSession }
  | { type: 'UPDATE_SESSION'; payload: { job_id: string; event?: StageEvent; status?: JobStatus; result?: PersonaResponse; error?: string } }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'CLEAR_SESSIONS' }
  | { type: 'CACHE_REMOTE';   payload: { job_id: string; persona: PersonaResponse } }
  | { type: 'EXPLORER_ADD_ROW';    payload: SearchRow }
  | { type: 'EXPLORER_RESET_ROWS' }
  | { type: 'EXPLORER_SET_PAGE';   payload: { page: number; hasMore: boolean } }
  | { type: 'EXPLORER_SET_FETCHED' }
  | { type: 'EXPLORER_SET_RANGE';  payload: { fromRow: number; toRow: number } }

const EXPLORER_INIT: AppState['explorer'] = {
  rows:    [],
  fetched: false,
  page:    1,
  hasMore: true,
  fromRow: 1,
  toRow:   20,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {

    case 'ADD_SESSION':
      return { ...state, sessions: [action.payload, ...state.sessions] }

    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map((s) => {
          if (s.job_id !== action.payload.job_id) return s
          const u: SearchSession = { ...s }
          if (action.payload.event)  u.events    = [...s.events, action.payload.event]
          if (action.payload.status) u.status    = action.payload.status
          if (action.payload.result) u.result    = action.payload.result
          if (action.payload.error)  u.error     = action.payload.error
          if (action.payload.status === 'done' || action.payload.status === 'failed') {
            u.finished_at = new Date()
          }
          return u
        }),
      }

    case 'DELETE_SESSION':
      return { ...state, sessions: state.sessions.filter((s) => s.job_id !== action.payload) }

    case 'CLEAR_SESSIONS':
      return { ...state, sessions: [] }

    case 'CACHE_REMOTE': {
      if (state.remoteCache[action.payload.job_id]) return state
      return {
        ...state,
        remoteCache: { ...state.remoteCache, [action.payload.job_id]: action.payload.persona },
      }
    }

    // ── Explorer ──────────────────────────────────────────────────────────────

    case 'EXPLORER_ADD_ROW': {
      const row = action.payload
      if (state.explorer.rows.some((r) => r.job_id === row.job_id)) return state
      return { ...state, explorer: { ...state.explorer, rows: [...state.explorer.rows, row] } }
    }

    case 'EXPLORER_RESET_ROWS':
      return { ...state, explorer: { ...state.explorer, rows: [], fetched: false } }

    case 'EXPLORER_SET_PAGE':
      return { ...state, explorer: { ...state.explorer, ...action.payload } }

    case 'EXPLORER_SET_FETCHED':
      return { ...state, explorer: { ...state.explorer, fetched: true } }

    case 'EXPLORER_SET_RANGE':
      return { ...state, explorer: { ...state.explorer, ...action.payload } }

    default:
      return state
  }
}

interface AppContextValue {
  state:    AppState
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    sessions:    [],
    remoteCache: {},
    explorer:    EXPLORER_INIT,
  })
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}