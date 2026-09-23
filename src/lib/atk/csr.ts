// Gjenerim i CSR (PKCS#10) për ECDSA P-256 — pa programin `openssl` të serverit.
// (Vercel e ka ndryshuar binarin openssl; `execSync('openssl req ...')` dështon me
//  "undefined symbol: SSL_get_srp_g". Ky modul përdor vetëm `crypto` të Node.)
//
// Struktura (RFC 2986):
//   CertificationRequest ::= SEQUENCE { certificationRequestInfo, signatureAlgorithm, signature BIT STRING }
//   CertificationRequestInfo ::= SEQUENCE { version INTEGER(0), subject Name, subjectPKInfo, attributes [0] }

import { createPrivateKey, createPublicKey, sign } from 'crypto'

// ── DER ───────────────────────────────────────────────────────────
function len(n: number): Buffer {
  if (n < 0x80) return Buffer.from([n])
  const bytes: number[] = []
  while (n > 0) { bytes.unshift(n & 0xff); n >>= 8 }
  return Buffer.from([0x80 | bytes.length, ...bytes])
}
const tlv = (tag: number, value: Buffer) => Buffer.concat([Buffer.from([tag]), len(value.length), value])
const seq = (...items: Buffer[]) => tlv(0x30, Buffer.concat(items))
const set = (...items: Buffer[]) => tlv(0x31, Buffer.concat(items))

function oid(dotted: string): Buffer {
  const parts = dotted.split('.').map(Number)
  const out = [40 * parts[0] + parts[1]]
  for (const p of parts.slice(2)) {
    const stack = [p & 0x7f]
    let v = p >> 7
    while (v > 0) { stack.unshift((v & 0x7f) | 0x80); v >>= 7 }
    out.push(...stack)
  }
  return tlv(0x06, Buffer.from(out))
}

const OID = {
  C: '2.5.4.6', O: '2.5.4.10', OU: '2.5.4.11', L: '2.5.4.7', CN: '2.5.4.3',
  ecdsaWithSHA256: '1.2.840.10045.4.3.2',
} as const

export type SubjectPart = { type: 'C' | 'O' | 'OU' | 'L' | 'CN'; value: string }

function rdn({ type, value }: SubjectPart): Buffer {
  // Si openssl: C → PrintableString, të tjerat → UTF8String
  const str = type === 'C' ? tlv(0x13, Buffer.from(value, 'ascii')) : tlv(0x0c, Buffer.from(value, 'utf8'))
  return set(seq(oid(OID[type]), str))
}

// ── CSR ───────────────────────────────────────────────────────────
export function createCsrPem(privateKeyPem: string, subject: SubjectPart[]): string {
  const key = createPrivateKey(privateKeyPem)
  if (key.asymmetricKeyType !== 'ec') throw new Error('CSR: kërkohet çelës EC (P-256)')
  const spki = createPublicKey(key).export({ type: 'spki', format: 'der' }) as Buffer

  const info = seq(
    tlv(0x02, Buffer.from([0x00])),     // version 0
    seq(...subject.map(rdn)),           // subject
    spki,                               // subjectPublicKeyInfo
    tlv(0xa0, Buffer.alloc(0)),         // attributes [0] (bosh)
  )
  const signature = sign('sha256', info, { key, dsaEncoding: 'der' })
  const csr = seq(
    info,
    seq(oid(OID.ecdsaWithSHA256)),
    tlv(0x03, Buffer.concat([Buffer.from([0x00]), signature])), // BIT STRING, 0 bit të papërdorur
  )
  const b64 = csr.toString('base64').match(/.{1,64}/g)!.join('\n')
  return `-----BEGIN CERTIFICATE REQUEST-----\n${b64}\n-----END CERTIFICATE REQUEST-----`
}
