// Encoder Protobuf (proto3) për skemën zyrtare ATK — pa varësi të jashtme.
// Skema: https://github.com/fiskalizimi/pos-golang/blob/main/models.proto (kopje: ./proto/models.proto)
//
// Rregulla proto3 që respektohen:
//  - fushat me vlerë default (0, "", 0.0) NUK serializohen
//  - int64 negativ → varint 10-bajtësh (two's complement)
//  - float → wire type 5 (fixed32, little-endian IEEE-754)
//  - izomorfik: punon në server (Node) dhe në shfletues (offline) — vetëm Uint8Array

import { COUPON_TYPE, PAYMENT_TYPE, type CouponType, type PaymentKind, type TaxRate } from './constants'

export interface ProtoCouponItem {
  name: string
  price: number     // €0.0001
  unit: string
  quantity: number  // float
  total: number     // cent
  taxRate: TaxRate
  type: string
}
export interface ProtoPayment { type: PaymentKind; amount: number } // cent
export interface ProtoTaxGroup { taxRate: TaxRate; totalForTax: number; totalTax: number } // cent

export interface ProtoPosCoupon {
  businessId: number; couponId: number; branchId: number; location: string
  operatorId: string; posId: number; applicationId: number; verificationNo: string
  type: CouponType; time: number
  items: ProtoCouponItem[]; payments: ProtoPayment[]
  total: number; taxGroups: ProtoTaxGroup[]; totalTax: number; totalNoTax: number
  referenceNo: number; transactionNo: number; totalDiscount: number
}

export interface ProtoCitizenCoupon {
  businessId: number; couponId: number; branchId: number; posId: number
  verificationNo: string; type: CouponType; time: number
  total: number; taxGroups: ProtoTaxGroup[]; totalTax: number; totalNoTax: number
}

const UTF8 = new TextEncoder()
const ZERO = BigInt(0), SEVEN = BigInt(7), MASK7 = BigInt(0x7f), TWO_64 = BigInt(2) ** BigInt(64)

class Writer {
  private bytes: number[] = []

  private varint(value: bigint) {
    let v = value < ZERO ? value + TWO_64 : value // two's complement 64-bit
    while (v > MASK7) { this.bytes.push(Number(v & MASK7) | 0x80); v >>= SEVEN }
    this.bytes.push(Number(v))
  }
  private tag(field: number, wire: number) { this.varint(BigInt((field << 3) | wire)) }

  int(field: number, value: number) {
    if (!Number.isInteger(value)) throw new Error(`Fusha ${field}: pritet numër i plotë, u mor ${value}`)
    if (value === 0) return this
    this.tag(field, 0); this.varint(BigInt(value)); return this
  }
  string(field: number, value: string) {
    if (!value) return this
    const b = UTF8.encode(value)
    this.tag(field, 2); this.varint(BigInt(b.length)); this.bytes.push(...b); return this
  }
  float(field: number, value: number) {
    if (value === 0) return this
    const b = new Uint8Array(4); new DataView(b.buffer).setFloat32(0, value, true)
    this.tag(field, 5); this.bytes.push(...b); return this
  }
  message(field: number, value: Uint8Array) {
    this.tag(field, 2); this.varint(BigInt(value.length)); this.bytes.push(...value); return this
  }
  finish(): Uint8Array { return Uint8Array.from(this.bytes) }
}

const encodeItem = (i: ProtoCouponItem) => new Writer()
  .string(1, i.name).int(2, i.price).string(3, i.unit).float(4, i.quantity)
  .int(5, i.total).string(6, i.taxRate).string(7, i.type).finish()

const encodePayment = (p: ProtoPayment) => new Writer()
  .int(1, PAYMENT_TYPE[p.type]).int(2, p.amount).finish()

const encodeTaxGroup = (t: ProtoTaxGroup) => new Writer()
  .string(1, t.taxRate).int(2, t.totalForTax).int(3, t.totalTax).finish()

export function encodePosCoupon(c: ProtoPosCoupon): Uint8Array {
  const w = new Writer()
    .int(1, c.businessId).int(2, c.couponId).int(3, c.branchId).string(4, c.location)
    .string(5, c.operatorId).int(6, c.posId).int(7, c.applicationId).string(8, c.verificationNo)
    .int(9, COUPON_TYPE[c.type]).int(10, c.time)
  c.items.forEach(i => w.message(11, encodeItem(i)))
  c.payments.forEach(p => w.message(12, encodePayment(p)))
  w.int(13, c.total)
  c.taxGroups.forEach(t => w.message(14, encodeTaxGroup(t)))
  return w.int(15, c.totalTax).int(16, c.totalNoTax).int(17, c.referenceNo)
    .int(18, c.transactionNo).int(19, c.totalDiscount).finish()
}

export function encodeCitizenCoupon(c: ProtoCitizenCoupon): Uint8Array {
  const w = new Writer()
    .int(1, c.businessId).int(2, c.couponId).int(3, c.branchId).int(4, c.posId)
    .string(5, c.verificationNo).int(6, COUPON_TYPE[c.type]).int(7, c.time).int(8, c.total)
  c.taxGroups.forEach(t => w.message(9, encodeTaxGroup(t)))
  return w.int(10, c.totalTax).int(11, c.totalNoTax).finish()
}

/** base64 izomorfik (server + shfletues) */
export function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
