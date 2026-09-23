// Lexim i sigurt i përgjigjeve JSON.
// Parandalon "Unexpected end of JSON input" kur serveri kthen body bosh
// (405, 204, 502, timeout) ose HTML në vend të JSON.

export class HttpError extends Error {
  constructor(message: string, public readonly status: number, public readonly data?: unknown) {
    super(message)
    this.name = 'HttpError'
  }
}

export async function readJson<T = unknown>(res: Response): Promise<T | null> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/** fetch + JSON me gabime të qarta. Hedh HttpError kur !res.ok. */
export async function fetchJson<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const data = await readJson<T & { error?: string }>(res)

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error) ||
      `Kërkesa dështoi (${res.status})`
    throw new HttpError(message, res.status, data)
  }
  return (data ?? ({} as T)) as T
}
