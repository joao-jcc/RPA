export async function submitJob(termo: string): Promise<{ job_id: string; stream_url: string; status_url: string }> {
  const res = await fetch(`/api/v1/rpa/persona/${encodeURIComponent(termo)}/save`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`Failed to submit job: ${res.status}`)
  return res.json()
}

export async function fetchJobResult(jobId: string) {
  const res = await fetch(`/api/v1/rpa/jobs/${jobId}`)
  if (!res.ok) throw new Error(`Failed to fetch job: ${res.status}`)
  return res.json()
}

export async function checkGoogleAuth(): Promise<{ authorized: boolean; reason?: string }> {
  const res = await fetch('/api/v1/auth/google/status')
  if (!res.ok) return { authorized: false, reason: 'Erro ao verificar autorização.' }
  return res.json()
}

export async function authorizeGoogle() {
  const res = await fetch('/api/v1/auth/google')
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
  return res.json()
}

export async function fetchSearches(fromRow: number, toRow: number): Promise<SearchRow[]> {
  const res = await fetch(`/api/v1/searches?from_row=${fromRow}&to_row=${toRow}`)
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`Failed to fetch searches: ${res.status}`)
  return res.json()
}

// Streaming version — calls onRow for each row as it arrives
export function streamSearches(
  fromRow: number,
  toRow: number,
  onRow:   (row: SearchRow) => void,
  onTotal: (count: number) => void,
  onDone:  (total: number) => void,
  onError: (msg: string)   => void,
): () => void {
  const source = new EventSource(
    `/api/v1/searches/stream?from_row=${fromRow}&to_row=${toRow}`
  )

  source.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type === 'total') onTotal(data.count)
    if (data.type === 'row')   onRow(data as SearchRow)
    if (data.type === 'done')  { onDone(data.total); source.close() }
    if (data.type === 'error') { onError(data.message); source.close() }
  }

  source.onerror = () => {
    onError('Conexão SSE perdida.')
    source.close()
  }

  return () => source.close()
}

export interface SearchRow {
  job_id:    string
  termo:     string
  nome:      string
  cpf:       string
  nis:       string
  data_hora: string
  json_url:  string
  persona:   unknown | null
}