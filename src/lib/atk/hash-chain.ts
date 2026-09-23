// Zinxhiri i hash-eve për llogat e ATK (për pajisje POS).
//
//   CurrentHash    = SHA-256( PreviousHash ‖ PayloadBase64 )
//   IntegrityCheck = HMAC-SHA-256( secret, CouponId | Time | PreviousHash | CurrentHash | Signature )
//
// CurrentHash lidh çdo kupon me paraardhësin → fshirja/ndryshimi i një rreshti prish zinxhirin.
// IntegrityCheck kërkon sekretin e serverit → një sulmues me qasje në DB s'mund ta rindërtojë zinxhirin.

import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { GENESIS_HASH } from './constants'

export interface ChainInput {
  couponId: number
  time: number
  previousHash: string
  payloadBase64: string
  signature: string
}

export interface ChainLink { previousHash: string; currentHash: string; integrityCheck: string }

function secret(): string {
  const s = process.env.ATK_LOG_HMAC_SECRET
  if (!s || s.length < 32) throw new Error('ATK_LOG_HMAC_SECRET mungon ose është më i shkurtër se 32 karaktere')
  return s
}

export function computeLink(input: ChainInput, hmacSecret = secret()): ChainLink {
  const currentHash = createHash('sha256').update(input.previousHash + input.payloadBase64, 'utf8').digest('hex')
  const integrityCheck = createHmac('sha256', hmacSecret)
    .update([input.couponId, input.time, input.previousHash, currentHash, input.signature].join('|'))
    .digest('hex')
  return { previousHash: input.previousHash, currentHash, integrityCheck }
}

export interface StoredLink extends ChainInput { id: string; currentHash: string; integrityCheck: string }

export interface ChainVerification {
  valid: boolean
  checked: number
  brokenAt?: { id: string; couponId: number; reason: string }
}

/** Verifikon zinxhirin e plotë (rreshtat në rendin e krijimit) */
export function verifyChain(links: StoredLink[], hmacSecret = secret()): ChainVerification {
  let expectedPrev = GENESIS_HASH
  for (let i = 0; i < links.length; i++) {
    const l = links[i]
    const fail = (reason: string): ChainVerification => ({ valid: false, checked: i, brokenAt: { id: l.id, couponId: l.couponId, reason } })
    if (l.previousHash !== expectedPrev) return fail('PreviousHash nuk përputhet me kuponin paraprak (rresht i fshirë ose i futur)')
    const recomputed = computeLink(l, hmacSecret)
    if (recomputed.currentHash !== l.currentHash) return fail('CurrentHash nuk përputhet (payload i ndryshuar)')
    const a = Buffer.from(recomputed.integrityCheck, 'hex'), b = Buffer.from(l.integrityCheck, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return fail('IntegrityCheck i pavlefshëm')
    expectedPrev = l.currentHash
  }
  return { valid: true, checked: links.length }
}
