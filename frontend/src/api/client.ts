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

export async function authorizeGoogle() {
  const res = await fetch('/api/v1/auth/google')
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
  return res.json()
}
