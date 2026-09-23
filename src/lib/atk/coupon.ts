// Ndërton PosCoupon + CitizenCoupon nga i njëjti rezultat llogaritjeje
// → garanton që të dy përputhen (përndryshe ATK: "FAILED VERIFICATION").

import { randomInt } from 'crypto'
import { DEFAULT_ITEM_TYPE, type CouponType } from './constants'
import type { CalcResult } from './calc'
import {
  encodeCitizenCoupon, encodePosCoupon,
  type ProtoCitizenCoupon, type ProtoPosCoupon,
} from './proto'
import { signProto } from './signer'

export interface CouponMeta {
  businessId: number     // NUI
  branchId: number
  posId: number
  applicationId: number
  location: string
  operatorId: string
}

export interface BuiltCoupon {
  couponId: number
  type: CouponType
  referenceNo: number
  time: number
  verificationNo: string
  pos: ProtoPosCoupon
  citizen: ProtoCitizenCoupon
  posPayload: string      // base64 — "details" për ATK
  posSignature: string
  qrCode: string          // citizenBase64|signature
}

/** 16 shifra, unik për çdo kupon (readme ATK: max 16 karaktere) */
export function generateVerificationNo(): string {
  let s = String(randomInt(1, 10))
  while (s.length < 16) s += String(randomInt(0, 10))
  return s
}

export function buildCoupon(args: {
  meta: CouponMeta
  calc: CalcResult
  couponId: number
  type: CouponType
  referenceNo: number
  time: number
  privateKeyPem: string
  verificationNo?: string
}): BuiltCoupon {
  const { meta, calc, couponId, type, referenceNo, time } = args
  if ((type === 'CANCEL' || type === 'RETURN') && !referenceNo) {
    throw new Error(`${type} kërkon ReferenceNo = CouponId i shitjes origjinale`)
  }
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isSafeInteger(v))) {
      throw new Error(`Konfigurimi i pajisjes i paplotë: ${k}`)
    }
  }
  const verificationNo = args.verificationNo ?? generateVerificationNo()

  const pos: ProtoPosCoupon = {
    businessId: meta.businessId, couponId, branchId: meta.branchId, location: meta.location,
    operatorId: meta.operatorId, posId: meta.posId, applicationId: meta.applicationId,
    verificationNo, type, time,
    items: calc.lines.map(l => ({
      name: l.name, price: l.unitPrice, unit: l.unit, quantity: l.quantity,
      total: l.total, taxRate: l.taxRate, type: l.itemType || DEFAULT_ITEM_TYPE,
    })),
    payments: calc.payments,
    total: calc.total,
    taxGroups: calc.taxGroups,
    totalTax: calc.totalTax,
    totalNoTax: calc.totalNoTax,
    referenceNo: type === 'SALE' ? 0 : referenceNo,
    transactionNo: 0,
    totalDiscount: calc.totalDiscount,
  }

  const citizen: ProtoCitizenCoupon = {
    businessId: meta.businessId, couponId, branchId: meta.branchId, posId: meta.posId,
    verificationNo, type, time,
    total: calc.total, taxGroups: calc.taxGroups, totalTax: calc.totalTax, totalNoTax: calc.totalNoTax,
  }

  const posSigned = signProto(encodePosCoupon(pos), args.privateKeyPem)
  const citizenSigned = signProto(encodeCitizenCoupon(citizen), args.privateKeyPem)

  return {
    couponId, type, referenceNo: pos.referenceNo, time, verificationNo, pos, citizen,
    posPayload: posSigned.base64Data,
    posSignature: posSigned.base64Sig,
    qrCode: `${citizenSigned.base64Data}|${citizenSigned.base64Sig}`,
  }
}
