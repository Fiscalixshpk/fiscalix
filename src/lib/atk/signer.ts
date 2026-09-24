// Nënshkrimi ECDSA P-256 sipas ATK:
//   proto → base64 → SHA-256(base64 bytes) → ECDSA ASN.1/DER → base64
// Node crypto: sign('sha256', data) hash-on vetë të dhënat → ekuivalent me Go SignASN1(sha256(data))

import { createPrivateKey, createPublicKey, sign, verify, type KeyObject } from 'crypto'

export interface SignedPayload { base64Data: string; base64Sig: string }

const keyCache = new Map<string, KeyObject>()

export function loadPrivateKey(pem: string): KeyObject {
  const cached = keyCache.get(pem)
  if (cached) return cached
  if (!pem.includes('-----BEGIN')) throw new Error('Çelësi privat nuk është në format PEM')
  const key = createPrivateKey({ key: pem, format: 'pem' }) // SEC1 ("EC PRIVATE KEY") dhe PKCS#8
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
    throw new Error('ATK kërkon çelës ECDSA P-256 (prime256v1)')
  }
  keyCache.set(pem, key)
  return key
}

export function signProto(protoBytes: Uint8Array, privateKeyPem: string): SignedPayload {
  const base64Data = Buffer.from(protoBytes).toString('base64')
  const signature = sign('sha256', Buffer.from(base64Data, 'utf8'), { key: loadPrivateKey(privateKeyPem), dsaEncoding: 'der' })
  return { base64Data, base64Sig: signature.toString('base64') }
}

/** Verifikim lokal — përdoret nga testet dhe nga kontrolli i integritetit */
export function verifySignature(base64Data: string, base64Sig: string, publicKeyOrCertPem: string): boolean {
  const key = createPublicKey(publicKeyOrCertPem)
  return verify('sha256', Buffer.from(base64Data, 'utf8'), { key, dsaEncoding: 'der' }, Buffer.from(base64Sig, 'base64'))
}

export function publicKeyFromPrivate(privateKeyPem: string): string {
  return createPublicKey(loadPrivateKey(privateKeyPem)).export({ type: 'spki', format: 'pem' }).toString()
}
