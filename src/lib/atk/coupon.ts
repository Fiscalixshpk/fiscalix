// Kuponi i nënshkruar në server. Modelet ndërtohen te coupon-core (izomorfik).
import { buildCouponModels, generateVerificationNo, type CouponMeta, type CouponModels } from './coupon-core'
import type { CalcResult } from './calc'
import type { CouponType } from './constants'
import { signProto } from './signer'

export { generateVerificationNo, type CouponMeta }

export interface BuiltCoupon extends CouponModels {
  posSignature: string
  qrCode: string          // citizenBase64|signature
}

export function buildCoupon(args: {
  meta: CouponMeta; calc: CalcResult; couponId: number; type: CouponType
  referenceNo: number; time: number; privateKeyPem: string; verificationNo?: string
}): BuiltCoupon {
  const m = buildCouponModels(args)
  const posSigned = signProto(Buffer.from(m.posPayload, 'base64'), args.privateKeyPem)
  const citizenSigned = signProto(Buffer.from(m.citizenPayload, 'base64'), args.privateKeyPem)
  return { ...m, posSignature: posSigned.base64Sig, qrCode: `${m.citizenPayload}|${citizenSigned.base64Sig}` }
}
