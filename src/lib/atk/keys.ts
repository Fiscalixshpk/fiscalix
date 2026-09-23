// Ruajtja e çelësit privat të pajisjes.
// Format i ri: "enc:v1:<iv>:<tag>:<ciphertext>" (AES-256-GCM, çelësi nga ATK_KEY_ENCRYPTION_SECRET)
// PEM i thjeshtë pranohet ende për pajisjet ekzistuese — enkriptoji me encryptPrivateKey().

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const PREFIX = 'enc:v1:'

function masterKey(): Buffer {
  const s = process.env.ATK_KEY_ENCRYPTION_SECRET
  if (!s || s.length < 32) throw new Error('ATK_KEY_ENCRYPTION_SECRET mungon (min 32 karaktere)')
  return createHash('sha256').update(s).digest()
}

export function encryptPrivateKey(pem: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv)
  const data = Buffer.concat([cipher.update(pem, 'utf8'), cipher.final()])
  return PREFIX + [iv, cipher.getAuthTag(), data].map(b => b.toString('base64')).join(':')
}

export function decryptPrivateKey(stored: string): string {
  if (stored.includes('-----BEGIN')) return stored
  if (!stored.startsWith(PREFIX)) throw new Error('Format i panjohur i çelësit privat')
  const [iv, tag, data] = stored.slice(PREFIX.length).split(':').map(p => Buffer.from(p, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', masterKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
