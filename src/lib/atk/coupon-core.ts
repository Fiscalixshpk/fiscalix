// Ndërtimi i PosCoupon + CitizenCoupon — izomorfik (server + shfletues/offline).
// Të dy kuponët dalin nga i njëjti rezultat llogaritjeje → përputhen gjithmonë.

import { DEFAULT_ITEM_TYPE, type CouponType } from './constants'
import type { CalcResult } from './calc'
import {
  encodeCitizenCoupon, encodePosCoupon, toBase64,
  type ProtoCitizenCoupon, type ProtoPosCoupon,
} from './proto'

export interface CouponMeta {
  businessId: number     // NUI
  branchId: number
  posId: number
  applicationId: number
  location: string
  operatorId: string
}

export interface CouponModels {
  couponId: number
  type: CouponType
  referenceNo: number
  time: number
  verificationNo: string
  pos: ProtoPosCoupon
  citizen: ProtoCitizenCoupon
  posPayload: string      // base64 i protobuf-it → "details" për ATK
  citizenPayload: string  // base64 i CitizenCoupon → pjesa e parë e QR-së
}

/** 16 shifra, unik për çdo kupon (NUIKF, Neni 26.10) */
export function generateVerificationNo(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  let s = String(1 + (bytes[0] % 9))
  for (let i = 1; i < 16; i++) s += String(bytes[i] % 10)
  return s
}

export function buildCouponModels(args: {
  meta: CouponMeta
  calc: CalcResult
  couponId: number
  type: CouponType
  referenceNo: number
  time: number
  verificationNo?: string
}): CouponModels {
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
  return {
    couponId, type, referenceNo: pos.referenceNo, time, verificationNo, pos, citizen,
    posPayload: toBase64(encodePosCoupon(pos)),
    citizenPayload: toBase64(encodeCitizenCoupon(citizen)),
  }
}
