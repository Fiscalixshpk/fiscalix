#!/usr/bin/env ts-node
// ============================================================
// scripts/atk-pretest.ts — ATK Pre-Testing Suite
// Ekzekuto: npx ts-node scripts/atk-pretest.ts
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'fs'
import {
  encodePosCoupon, signData, generateVerificationNo
} from '../src/lib/atk/fiscalizer'

const CONFIG = {
  privateKeyPath: './private-key.pem',
  businessNui:    810948231,    // ← ndrysho me NUI-n tënd
  posId:          1,
  branchId:       1,
  applicationId:  0,
  locationCity:   'Pejë',
  operatorName:   'Test Operator',
  environment:    'TEST' as const,
  atkUrl:         'https://fiskalizimi-test.atk-ks.org',
}

interface TestItem {
  productId: string; name: string; emoji: string
  price: number; unit: string; quantity: number
  taxRate: string; total: number
}

const ITEMS: Record<string, TestItem> = {
  espresso: { productId: 'e1', name: 'Espresso',     emoji: '☕', price: 15000, unit: 'cope', quantity: 1, taxRate: 'E', total: 15000 },
  sandviq:  { productId: 's1', name: 'Sanduiç Pule', emoji: '🥪', price: 35000, unit: 'cope', quantity: 1, taxRate: 'D', total: 35000 },
  uje:      { productId: 'u1', name: 'Ujë Rugove',   emoji: '💧', price:  8000, unit: 'cope', quantity: 1, taxRate: 'E', total:  8000 },
  libra:    { productId: 'l1', name: 'Libër',        emoji: '📚', price: 50000, unit: 'cope', quantity: 1, taxRate: 'A', total: 50000 },
}

function calcTotals(items: TestItem[]) {
  const TAX: Record<string, number> = { A: 0, C: 0, D: 0.08, E: 0.18 }
  let total = 0, tax = 0
  for (const item of items) {
    const rate = TAX[item.taxRate] ?? 0.18
    const eur  = item.total / 10000
    tax   += eur - eur / (1 + rate)
    total += eur
  }
  return {
    subtotal: Math.round(total * 100), tax: Math.round(tax * 100),
    noTax: Math.round((total - tax) * 100), discount: 0, total: Math.round(total * 100),
  }
}

let couponCounter = 10000

async function runTest(name: string, items: TestItem[], type: 'SALE'|'CANCEL'|'RETURN' = 'SALE', refNo = 0) {
  const couponId = ++couponCounter
  const issuedAt = new Date()
  const verNo    = generateVerificationNo()
  const totals   = calcTotals(items)
  const pem      = readFileSync(CONFIG.privateKeyPath, 'utf8')

  const input = {
    businessNui: CONFIG.businessNui, locationCity: CONFIG.locationCity,
    posId: CONFIG.posId, branchId: CONFIG.branchId, applicationId: CONFIG.applicationId,
    privateKeyPem: pem, environment: CONFIG.environment,
    couponId, couponType: type, referenceNo: refNo,
    operatorName: CONFIG.operatorName, paymentMethod: 'cash',
    items, totals, issuedAt,
  }

  const buf  = encodePosCoupon(input, verNo)
  const b64  = buf.toString('base64')
  const sig  = signData(buf, pem)

  console.log(`\n▶ ${name} | CouponId: ${couponId} | €${(totals.total/100).toFixed(2)}`)

  try {
    const res  = await fetch(`${CONFIG.atkUrl}/pos/coupon`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ details: b64, signature: sig }),
      signal: AbortSignal.timeout(15_000),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      console.log(`  ✓ PASS — tx: ${body.transaction_id}`)
      return { name, status: 'PASS' as const, txId: body.transaction_id, request: { couponId, type }, response: body }
    }
    console.log(`  ✗ FAIL — ${body.error ?? res.status}`)
    return { name, status: 'FAIL' as const, error: body.error ?? `HTTP ${res.status}`, request: { couponId, type }, response: body }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    console.log(`  ⚠ SKIP — ${msg}`)
    return { name, status: 'SKIP' as const, error: msg, request: { couponId, type }, response: {} }
  }
}

async function main() {
  console.log('═══ FISCALIX ATK Pre-Testing ═══')
  console.log(`Environment: ${CONFIG.environment} | NUI: ${CONFIG.businessNui}`)

  if (!existsSync(CONFIG.privateKeyPath)) {
    console.error('✗ private-key.pem nuk u gjet! Ekzekuto: ./onboarder -env=TEST')
    process.exit(1)
  }

  const results = []

  const t1 = await runTest('SALE Normal (E=18%)',    [ITEMS.espresso, ITEMS.uje])
  results.push(t1)
  const t2 = await runTest('SALE TaxRate D (8%)',    [ITEMS.sandviq])
  results.push(t2)
  results.push(await runTest('SALE Mixed (D+E)',     [{ ...ITEMS.espresso, quantity: 2, total: 30000 }, ITEMS.sandviq]))
  results.push(await runTest('SALE Exempt (A=0%)',   [ITEMS.libra]))
  results.push(await runTest('SALE Sasi të shumta',  [{ ...ITEMS.espresso, quantity: 5, total: 75000 }]))

  if (t1.status === 'PASS') results.push(await runTest(`CANCEL (ref #10001)`, [ITEMS.espresso], 'CANCEL', 10001))
  if (t2.status === 'PASS') results.push(await runTest(`RETURN (ref #10002)`, [ITEMS.sandviq],  'RETURN', 10002))

  const pass = results.filter(r => r.status === 'PASS').length
  const fail = results.filter(r => r.status === 'FAIL').length
  const skip = results.filter(r => r.status === 'SKIP').length

  console.log('\n═══ REZULTATET ═══')
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '⚠'
    console.log(`  ${icon} ${r.name}${r.txId ? ` (tx:${r.txId})` : ''}${r.error ? ` — ${r.error}` : ''}`)
  }
  console.log(`\n  PASS:${pass} FAIL:${fail} SKIP:${skip}`)

  const logFile = `atk-pretest-${Date.now()}.json`
  writeFileSync(logFile, JSON.stringify({ generated: new Date().toISOString(), environment: CONFIG.environment, businessNui: CONFIG.businessNui, summary: { pass, fail, skip }, tests: results }, null, 2))
  console.log(`\n  Log: ${logFile}`)
  console.log('  Ngarko te: https://apps.atk-ks.org/sefaplikimi/PreApplication/Create')

  if (fail > 0) process.exit(1)
}

main().catch(err => { console.error(err); process.exit(1) })
