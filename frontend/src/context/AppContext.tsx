import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { SearchSession, StageEvent, PersonaResponse, JobStatus } from '../types'

interface AppState {
  sessions: SearchSession[]
}

type Action =
  | { type: 'ADD_SESSION'; payload: SearchSession }
  | { type: 'UPDATE_SESSION'; payload: { job_id: string; event?: StageEvent; status?: JobStatus; result?: PersonaResponse; error?: string } }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'CLEAR_SESSIONS' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_SESSION':
      return { sessions: [action.payload, ...state.sessions] }

    case 'UPDATE_SESSION': {
      return {
        sessions: state.sessions.map((s) => {
          if (s.job_id !== action.payload.job_id) return s
          const updated: SearchSession = { ...s }
          if (action.payload.event) updated.events = [...s.events, action.payload.event]
          if (action.payload.status) updated.status = action.payload.status
          if (action.payload.result) updated.result = action.payload.result
          if (action.payload.error) updated.error = action.payload.error
          if (action.payload.status === 'done' || action.payload.status === 'failed') {
            updated.finished_at = new Date()
          }
          return updated
        }),
      }
    }

    case 'DELETE_SESSION':
      return { sessions: state.sessions.filter((s) => s.job_id !== action.payload) }

    case 'CLEAR_SESSIONS':
      return { sessions: [] }

    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { sessions: [] })
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}