/**
 * auth-errors.ts — Përkthen mesazhet e gabimit nga Supabase Auth në shqip
 */

const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Email ose fjalëkalim i gabuar',
  'Email not confirmed': 'Email-i nuk është konfirmuar ende',
  'User already registered': 'Ky email është i regjistruar tashmë',
  'User not found': 'Nuk u gjet llogari me këtë email',
  'Password should be at least 6 characters': 'Fjalëkalimi duhet të ketë të paktën 6 shkronja',
  'Unable to validate email address: invalid format': 'Formati i email-it është i pavlefshëm',
  'Email rate limit exceeded': 'Shumë përpjekje. Provo përsëri pas pak minutash',
  'Token has expired or is invalid': 'Lidhja ka skaduar ose është e pavlefshme',
  'New password should be different from the old password': 'Fjalëkalimi i ri duhet të jetë i ndryshëm nga i vjetri',
  'signup_disabled': 'Regjistrimi është i çaktivizuar momentalisht',
}

/**
 * Merr një mesazh gabimi (Error, string, ose unknown) dhe kthe versionin shqip
 * nëse njihet, ose mesazhin origjinal si fallback.
 */
export function translateAuthError(err: unknown, fallback = 'Ndodhi një gabim. Provo përsëri.'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!raw) return fallback

  // Exact match
  if (ERROR_MAP[raw]) return ERROR_MAP[raw]

  // Partial match (Supabase sometimes appends extra detail)
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return value
  }

  return fallback
}
