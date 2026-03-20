import { useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { fetchJobResult } from '../api/client'
import type { StageEvent } from '../types'

export function useJobStream(jobId: string, active: boolean) {
  const { dispatch } = useApp()

  useEffect(() => {
    if (!active) return

    const source = new EventSource(`/api/v1/rpa/jobs/${jobId}/stream`)

    source.onmessage = async (e) => {
      const data = JSON.parse(e.data)
      const event: StageEvent = { ...data, timestamp: new Date() }

      dispatch({ type: 'UPDATE_SESSION', payload: { job_id: jobId, event } })

      if (data.stage === 'done') {
        dispatch({ type: 'UPDATE_SESSION', payload: { job_id: jobId, status: 'done' } })
        source.close()
        try {
          const result = await fetchJobResult(jobId)
          if (result.data) {
            dispatch({ type: 'UPDATE_SESSION', payload: { job_id: jobId, result: result.data } })
          }
        } catch (_) {}
      }

      if (data.stage === 'error') {
        dispatch({ type: 'UPDATE_SESSION', payload: { job_id: jobId, status: 'failed', error: data.message } })
        source.close()
      }
    }

    source.onerror = () => {
      dispatch({ type: 'UPDATE_SESSION', payload: { job_id: jobId, status: 'failed', error: 'Conexão SSE perdida.' } })
      source.close()
    }

    return () => source.close()
  }, [jobId, active, dispatch])
}
