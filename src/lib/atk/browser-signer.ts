// Nënshkrimi ECDSA P-256 në shfletues (WebCrypto) — për kuponët offline.
// E njëjta skemë si në server: SHA-256(base64 bytes) → ECDSA → ASN.1/DER → base64.
// WebCrypto kthen nënshkrimin në format P1363 (r‖s, 64 bajt) → e konvertojmë në DER.

const UTF8 = new TextEncoder()

function derInt(bytes: Uint8Array): Uint8Array {
  let i = 0
  while (i < bytes.length - 1 && bytes[i] === 0) i++
  let v = bytes.subarray(i)
  if (v[0] & 0x80) v = Uint8Array.from([0, ...v])
  return Uint8Array.from([0x02, v.length, ...v])
}

export function p1363ToDer(sig: Uint8Array): Uint8Array {
  const r = derInt(sig.subarray(0, 32)), s = derInt(sig.subarray(32, 64))
  return Uint8Array.from([0x30, r.length + s.length, ...r, ...s])
}

const b64 = (u: Uint8Array) => { let s = ''; u.forEach(b => { s += String.fromCharCode(b) }); return btoa(s) }

export function pemToDer(pem: string): Uint8Array {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  return Uint8Array.from(atob(body), c => c.charCodeAt(0))
}

/** Importon çelësin si JO të eksportueshëm: JavaScript-i s'mund ta lexojë më, vetëm ta përdorë për nënshkrim */
export async function importSigningKey(pkcs8Pem: string): Promise<CryptoKey> {
  const der = pemToDer(pkcs8Pem)
  const buf = der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength) as ArrayBuffer
  return globalThis.crypto.subtle.importKey('pkcs8', buf, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

export async function signBase64(key: CryptoKey, base64Data: string): Promise<string> {
  const sig = new Uint8Array(await globalThis.crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, UTF8.encode(base64Data)))
  return b64(p1363ToDer(sig))
}
