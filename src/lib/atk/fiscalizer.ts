import { createHash } from 'crypto'
import * as forge from 'node-forge'

// ATK Signing — sipas dokumentacionit golang:
// 1. Serialize protobuf → bytes
// 2. base64.StdEncoding.EncodeToString(bytes) → string
// 3. sha256.Sum256([]byte(base64String)) → hash
// 4. ecdsa.SignASN1(rand, privateKey, hash[:]) → DER signature
// 5. base64.StdEncoding.EncodeToString(signature) → base64Sig
// QR Code: base64Data + "|" + base64Sig

// ── ATK ENDPOINTS ─────────────────────────────────────────────
const ATK_BASE: Record<string, string> = {
  TEST: 'https://fiskalizimi-test.atk-ks.org',
  PROD: 'https://fiskalizimi.atk-ks.org',
}

// ── TYPES ──────────────────────────────────────────────────────
export interface CartItem {
  name:     string
  price:    number  // in cents (e.g. €1.50 = 150)
  unit:     string
  quantity: number
  total:    number  // in cents
  taxRate:  string  // 'A','C','D','E'
}

export interface CartTotals {
  total:    number  // in cents
  tax:      number  // in cents
  noTax:    number  // in cents
  discount: number  // in cents
}

export interface FiscalizeInput {
  businessNui:    number
  locationCity:   string
  posId:          number
  branchId:       number
  applicationId:  number
  privateKeyPem:  string
  certificatePem?: string
  environment:    'TEST' | 'PROD'
  couponId:       number
  couponType:     'SALE' | 'CANCEL' | 'RETURN'
  referenceNo:    number
  operatorName:   string
  paymentMethod:  string
  items:          CartItem[]
  totals:         CartTotals
  issuedAt:       Date
  forceMock?:     boolean
  verificationNo?: string
}

export interface FiscalizeOutput {
  status:        'fiscalized' | 'offline' | 'failed'
  transactionId?: number
  qrCodeData?:   string
  receiptNumber?: string
  error?:        string
}

export interface ATKSubmitResult {
  success:        boolean
  transactionId?: number
  isOffline:      boolean
  error?:         string
}

// ── PAYMENT TYPE ──────────────────────────────────────────────
function getPaymentType(method: string): number {
  if (method === 'card') return 2
  return 1 // cash
}

// ── PROTOBUF ENCODING ─────────────────────────────────────────
function writeVarint(buf: number[], value: number): void {
  let v = BigInt(Math.round(value))
  while (v > 0x7Fn) {
    buf.push(Number(v & 0x7Fn) | 0x80)
    v >>= 7n
  }
  buf.push(Number(v & 0x7Fn))
}

function writeField(buf: number[], fieldNum: number, wireType: number, value: number | Buffer | string): void {
  const tag = (fieldNum << 3) | wireType
  writeVarint(buf, tag)
  if (wireType === 0) {
    writeVarint(buf, value as number)
  } else if (wireType === 2) {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value as string, 'utf8')
    writeVarint(buf, bytes.length)
    for (const b of bytes) buf.push(b)
  }
}

// ── ENCODE CITIZEN COUPON (for QR Code) ───────────────────────
// CitizenCoupon fields per models.proto:
// 1: business_id (uint64)
// 2: pos_id (uint64) 
// 3: branch_id (uint64)
// 4: coupon_id (uint64)
// 5: type (enum)
// 6: time (int64)
// 7: total (uint64)
// 8: tax_groups (repeated TaxGroup)
// 9: total_tax (uint64)
// 10: total_no_tax (uint64)
function encodeTaxGroup(taxRate: string, totalForTax: number, totalTax: number): Buffer {
  const buf: number[] = []
  writeField(buf, 1, 2, taxRate)
  writeField(buf, 2, 0, totalForTax)
  writeField(buf, 3, 0, totalTax)
  return Buffer.from(buf)
}

function encodeCitizenCoupon(input: FiscalizeInput): Buffer {
  const buf: number[] = []
  const couponType = input.couponType === 'SALE' ? 1 : input.couponType === 'CANCEL' ? 2 : 3
  const unixTime = Math.floor(input.issuedAt.getTime() / 1000)

  writeField(buf, 1, 0, input.businessNui)
  writeField(buf, 2, 0, input.posId)
  writeField(buf, 3, 0, input.branchId)
  writeField(buf, 4, 0, input.couponId)
  writeField(buf, 5, 0, couponType)
  writeField(buf, 6, 0, unixTime)
  writeField(buf, 7, 0, input.totals.total)

  // TaxGroups
  const taxGroupE = encodeTaxGroup('E', input.totals.total, input.totals.tax)
  writeField(buf, 8, 2, taxGroupE)

  writeField(buf, 9, 0, input.totals.tax)
  writeField(buf, 10, 0, input.totals.noTax)

  return Buffer.from(buf)
}

// ── ENCODE COUPON ITEM ────────────────────────────────────────
// Price in €0.0001 units (10000 = €1.00), Total in cents (100 = €1.00)
function encodeCouponItem(item: CartItem): Buffer {
  const buf: number[] = []
  const quantityInt = Math.round(item.quantity * 10000)

  writeField(buf, 1, 2, item.name)
  writeField(buf, 2, 0, item.price)   // €0.0001 units
  writeField(buf, 3, 2, item.unit || 'cope')
  writeField(buf, 4, 0, quantityInt)
  writeField(buf, 5, 0, item.total)   // cents
  writeField(buf, 6, 2, item.taxRate || 'E')
  writeField(buf, 7, 2, 'TT')
  return Buffer.from(buf)
}

// ── ENCODE POS COUPON ─────────────────────────────────────────
// PosCoupon fields per models.pb.go:
// 1: BusinessId, 2: CouponId, 3: BranchId, 4: Location
// 5: OperatorId, 6: PosId, 7: ApplicationId, 8: VerificationNo
// 9: Type, 10: Time, 11: Items, 12: Payments
// 13: Total, 14: TaxGroups, 15: TotalTax, 16: TotalNoTax
// 17: ReferenceNo, 18: TransactionNo, 19: TotalDiscount
function encodePosCoupon(input: FiscalizeInput, verificationNo: string): Buffer {
  const buf: number[] = []
  const couponType = input.couponType === 'SALE' ? 1 : input.couponType === 'CANCEL' ? 2 : 3
  const unixTime   = Math.floor(input.issuedAt.getTime() / 1000)
  const totalCents = input.totals.total

  writeField(buf, 1, 0, input.businessNui)      // BusinessId
  writeField(buf, 2, 0, input.couponId)          // CouponId
  writeField(buf, 3, 0, input.branchId)          // BranchId
  writeField(buf, 4, 2, input.locationCity)      // Location
  writeField(buf, 5, 2, input.operatorName)      // OperatorId
  writeField(buf, 6, 0, input.posId)             // PosId
  writeField(buf, 7, 0, input.applicationId)     // ApplicationId
  writeField(buf, 8, 2, verificationNo)          // VerificationNo
  writeField(buf, 9, 0, couponType)              // Type

  // Items
  for (const item of input.items) {
    const itemBuf = encodeCouponItem(item)
    writeField(buf, 11, 2, itemBuf)              // Items
  }

  // Payment
  const payBuf: number[] = []
  writeField(payBuf, 1, 0, getPaymentType(input.paymentMethod))
  writeField(payBuf, 2, 0, totalCents)          // Amount (already in €0.0001 units)
  writeField(buf, 12, 2, Buffer.from(payBuf))   // Payments

  writeField(buf, 10, 0, unixTime)              // Time
  writeField(buf, 13, 0, totalCents)            // Total (already in €0.0001 units)
  writeField(buf, 14, 0, totalCents)

  // TaxGroup
  const taxGroupE = encodeTaxGroup('E', totalCents, input.totals.tax)
  writeField(buf, 15, 2, taxGroupE)

  writeField(buf, 16, 0, input.totals.tax)
  writeField(buf, 17, 0, input.totals.noTax)
  writeField(buf, 18, 0, (input.totals.discount || 0))

  return Buffer.from(buf)
}

// ── DIGITAL SIGNING (ECDSA P-256) ─────────────────────────────
// Per ATK docs:
// 1. Serialize coupon to Protobuf binary
// 2. Base64 encode the binary (StdEncoding)
// 3. SHA256 hash the base64 bytes
// 4. ECDSA SignASN1 the hash
// 5. Base64 encode the signature
function signData(data: Buffer, privateKeyPem: string): { base64Data: string; base64Sig: string } {
  // Step 2: Base64 encode protobuf bytes
  const base64Data = data.toString('base64')
  const msgBytes = Buffer.from(base64Data, 'utf8')

  // Step 3: Extract private key scalar from PEM
  const pemBody = privateKeyPem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/[\r\n\s]/g, '')
  const der = Buffer.from(pemBody, 'base64')
  
  let privKeyBytes: Buffer
  if (privateKeyPem.includes('EC PRIVATE KEY')) {
    let offset = 5
    for (let i = 0; i < der.length - 1; i++) {
      if (der[i] === 0x04 && der[i+1] === 0x20) { offset = i + 2; break }
    }
    privKeyBytes = der.slice(offset, offset + 32)
  } else {
    privKeyBytes = der.slice(der.length - 32)
  }

  // Step 4: SHA256 hash then ECDSA sign (matching Go: sha256.Sum256 + ecdsa.SignASN1)
  const hash = createHash('sha256').update(msgBytes).digest()
  const { p256 } = require('@noble/curves/p256')
  const sig = p256.sign(hash, privKeyBytes, { prehash: false })
  const base64Sig = Buffer.from(sig.toDERHex(), 'hex').toString('base64')

  return { base64Data, base64Sig }
}


// ── ENCODE COUPON ITEM ────────────────────────────────────────
// Price and Total in €0.0001 units (cents * 100)
export function generateQRCode(input: FiscalizeInput, verificationNo: string, privateKeyPem: string): string {
  const citizenBuf = encodeCitizenCoupon(input)
  const { base64Data, base64Sig } = signData(citizenBuf, privateKeyPem)
  // Format: base64EncodedProto|signature — skanoj me app-in e ATK
  return `${base64Data}|${base64Sig}`
}

// ── SUBMIT TO ATK ─────────────────────────────────────────────
export async function submitToATK(
  posCouponBuf:    Buffer,
  privateKeyPem:   string,
  environment:     'TEST' | 'PROD' = 'TEST',
  _certificatePem?: string
): Promise<ATKSubmitResult> {
  if (false && privateKeyPem === 'MOCK_KEY') {
    await new Promise(r => setTimeout(r, 500))
    return { success: true, transactionId: Math.floor(Math.random() * 9000000) + 1000000, isOffline: false }
  }

  const baseUrl = ATK_BASE[environment]
  const { base64Data, base64Sig } = signData(posCouponBuf, privateKeyPem)

  console.log('ATK Submit to:', `${baseUrl}/pos/coupon`)
  console.log('Details length:', base64Data.length, 'Sig length:', base64Sig.length)

  try {
    const response = await fetch(`${baseUrl}/pos/coupon`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ details: base64Data, signature: base64Sig }),
      signal:  AbortSignal.timeout(15_000),
    })

    const responseText = await response.text()
    console.log('ATK Response:', response.status, responseText.substring(0, 200))

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`
      try { const j = JSON.parse(responseText); errMsg = j.error ?? errMsg } catch {}
      return { success: false, error: errMsg, isOffline: false }
    }

    const data = JSON.parse(responseText)
    return { success: true, transactionId: data.transaction_id, isOffline: false }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg, isOffline: msg.includes('timeout') || msg.includes('ECONN') }
  }
}

// ── MAIN FISCALIZE ────────────────────────────────────────────
export async function fiscalize(input: FiscalizeInput): Promise<FiscalizeOutput> {
  console.log('Fiscalize:', {
    nui: input.businessNui, posId: input.posId,
    appId: input.applicationId, env: input.environment,
    items: input.items.length, total: input.totals.total
  })

  // Mock mode — vetëm nëse forced ose nuk ka pajisje reale
  const shouldMock = input.forceMock === true
  if (shouldMock) {
    return {
      status:        'fiscalized',
      transactionId: Math.floor(Math.random() * 9000000) + 1000000,
      qrCodeData:    `MOCK|${Math.random().toString(36).substring(2)}`,
      receiptNumber: `KF-${new Date().getFullYear()}-${input.couponId}`,
    }
  }

  // VerificationNo — nga onboarding ose random
  const verificationNo = input.verificationNo || Math.floor(Math.random() * 9e15).toString().padStart(16, '0').substring(0, 16)
  const posBuf = encodePosCoupon(input, verificationNo)
  const result = await submitToATK(posBuf, input.privateKeyPem, input.environment, input.certificatePem)

  if (!result.success) {
    return result.isOffline
      ? { status: 'offline', error: result.error }
      : { status: 'failed',  error: result.error }
  }

  const qrCodeData = generateQRCode(input, verificationNo, input.privateKeyPem)
  return {
    status:        'fiscalized',
    transactionId: result.transactionId,
    qrCodeData,
    receiptNumber: `KF-${new Date().getFullYear()}-${input.couponId}`,
  }
}
