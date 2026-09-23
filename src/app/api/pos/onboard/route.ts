// POST /api/pos/onboard
// Onboarding automatik ATK — pa tool manual
// 1. Gjeneron ECDSA P-256 key pair
// 2. Krijon CSR me të dhënat e biznesit
// 3. Dërgon te ATK CA → merr certifikatën
// 4. Ruan te pos_devices → pajisja aktive

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import * as forge                    from 'node-forge'
import { encryptPrivateKey }         from '@/lib/atk/keys'

const ATK_CA = {
  TEST: 'https://fiskalizimi-test.atk-ks.org',
  PROD: 'https://fiskalizimi.atk-ks.org',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { branchId = 1, deviceName = 'Arka 1', cashierName, applicationId, fiscalizationNo: bodyFiscNo, environment } = body

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()

  // posId automatik — merr numrin e radhës që nuk ekziston te ATK
  // pos_id 1,2,3 janë të zënë — fillo nga 10 për të shmangur konflikte
  const { data: existingDevices } = await supabase
    .from('pos_devices').select('pos_id').eq('company_id', userData?.company_id)
  const usedIds = new Set((existingDevices || []).map((d: any) => d.pos_id))
  let posId = Math.floor(Math.random() * 9000) + 1000
  while (usedIds.has(posId)) posId = Math.floor(Math.random() * 9000) + 1000
  if (!userData?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const { data: company } = await supabase
    .from('companies').select('name, nui, tax_number, location_city').eq('id', userData.company_id).single()

  const nui = company?.nui || company?.tax_number || ''

  if (!nui) {
    return NextResponse.json({
      error: 'NUI mungon. Shko te Cilësimet → Kompania dhe vendos Numrin Fiskal.',
    }, { status: 422 })
  }

  const env = ((environment || process.env.ATK_ENVIRONMENT || 'TEST') as 'TEST' | 'PROD')
  const baseUrl = ATK_CA[env]

  try {
    // ── STEP 1: Gjenero ECDSA P-256 key pair (kërkohet nga ATK) ─
    const { generateKeyPairSync } = await import('crypto')
    const { privateKey: ecPrivKey, publicKey: ecPubKey } = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    })
    const privateKeyPem = ecPrivKey as string
    const publicKeyPem  = ecPubKey as string

    // ── STEP 2: Krijon CSR ECDSA P-256 me openssl ──────────────
    let businessName = company?.name || ''
    const csrPem = await (async () => {
      const { execSync } = require('child_process')
      const fs = require('fs')
      const os = require('os')
      const tmpDir = os.tmpdir()
      const tmpKey = `${tmpDir}/atk-key-${Date.now()}.pem`
      const tmpCsr = `${tmpDir}/atk-csr-${Date.now()}.csr`
      try {
        fs.writeFileSync(tmpKey, privateKeyPem, { mode: 0o600 })
        const subj = `/C=XK/O=${nui}/OU=${posId}/L=${branchId}/CN=${posId}`
        execSync(`openssl req -new -key "${tmpKey}" -out "${tmpCsr}" -subj "${subj}" -sha256`)
        const result = fs.readFileSync(tmpCsr, 'utf8')
        return result.trim()
      } finally {
        try { fs.unlinkSync(tmpKey) } catch {}
        try { fs.unlinkSync(tmpCsr) } catch {}
      }
    })()

    // ── STEP 3: Dërgo te ATK CA ──────────────────────────────
    let certificatePem: string
    let verificationCode: string | null = null

    const { data: companyFull } = await supabase
      .from('companies').select('name, nui, tax_number, atk_fiscalization_no').eq('id', userData.company_id).single()

    if (false) {
      certificatePem = ''
    } else {
      const fiscalizationNo = companyFull?.atk_fiscalization_no || bodyFiscNo || ''

      if (!fiscalizationNo) {
        return NextResponse.json({ error: 'Nr. Fiskalizimit mungon — vendose te forma' }, { status: 422 })
      }

      // ── STEP 2b: Merr verification_code nga ATK ─────────────
      const verifyBody = {
        fiscalization_no: fiscalizationNo,
        pos_id:           posId,
        branch_id:        branchId,
        application_id:   parseInt(applicationId) || 857345132322,
      }
      console.log('ATK Verify sending:', JSON.stringify(verifyBody), 'URL:', `${baseUrl}/ca/verify/${nui}`)
      const verifyRes = await fetch(`${baseUrl}/ca/verify/${nui}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(verifyBody),
        signal: AbortSignal.timeout(30_000),
      })

      if (verifyRes.status !== 200 && verifyRes.status !== 201) {
        const errText = await verifyRes.text().catch(() => '')
        console.log('ATK Verify error:', verifyRes.status, errText)
        let errMsg = `HTTP ${verifyRes.status}`
        try {
          const j = JSON.parse(errText)
          errMsg = (typeof j.error === 'string' ? j.error : j.error?.message) || j.message || errMsg
        } catch {}
        return NextResponse.json({ error: `ATK Verify: ${errMsg}` }, { status: 422 })
      }

      const verifyData = await verifyRes.json()
      verificationCode = verifyData.verification_code ?? null
      businessName = verifyData.business_name || businessName
      
      console.log('ATK Verify OK:', { verificationCode, businessName })

      // csrPem u gjenerua tashmë me openssl — e përdorim direkt
      const caRes = await fetch(`${baseUrl}/ca/signcsr`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          business_name:     businessName,
          business_id:       parseInt(nui),
          branch_id:         branchId,
          verification_code: verificationCode,
          pos_id:            posId,
          application_id:    parseInt(applicationId) || 857345132322,
          csr:               csrPem,
        }),
        signal:  AbortSignal.timeout(30_000),
      })

      if (!caRes.ok) {
        const errData = await caRes.json().catch(() => ({}))
        return NextResponse.json({
          error:    `ATK CA: ${errData.error || errData.message || `HTTP ${caRes.status}`}`,
          fallback: caRes.status >= 500,
        }, { status: 422 })
      }

      const caData   = await caRes.json()
      certificatePem = caData.certificate || caData.cert || caData.signed_certificate

      if (!certificatePem) {
        return NextResponse.json({ error: 'ATK nuk ktheu certifikatë' }, { status: 422 })
      }
    }

    // ── STEP 4: Ruaj te Supabase ──────────────────────────────
    const { data: existing } = await supabase
      .from('pos_devices').select('id')
      .eq('company_id', userData.company_id).eq('pos_id', posId).maybeSingle()

    const deviceData = {
      company_id:        userData.company_id,
      pos_id:            posId,
      branch_id:         branchId,
      device_name:       deviceName,
      cashier_name:      cashierName || null,
      // Enkriptohet kur ATK_KEY_ENCRYPTION_SECRET është vendosur (decryptPrivateKey pranon të dyja format)
      private_key_enc:   process.env.ATK_KEY_ENCRYPTION_SECRET ? encryptPrivateKey(privateKeyPem) : privateKeyPem,
      certificate_pem:   certificatePem,
      application_id:    applicationId || null,
      environment:       env,
      status:            'active',
      verification_code: verificationCode || null,
      updated_at:        new Date().toISOString(),
    }

    if (existing) {
      await supabase.from('pos_devices').update(deviceData).eq('id', existing.id)
    } else {
      await supabase.from('pos_devices').insert({ ...deviceData, created_at: new Date().toISOString() })
    }

    return NextResponse.json({
      success:     true,
      message:     `Pajisja "${deviceName}" u aktivizua me sukses`,
      environment: env,
      isMock:      false,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gabim i panjohur'
    const isNetwork = msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('timeout')
    return NextResponse.json({
      error:    isNetwork ? 'ATK CA server nuk arrihet momentalisht' : msg,
      fallback: isNetwork,
    }, { status: isNetwork ? 503 : 500 })
  }
}

// ── BUILD EC CSR ──────────────────────────────────────────────
// Krijon CSR sipas ATK spec (PKCS#10, ECDSA P-256, SHA-256)
function buildECCSR(privateKeyPem: string, subject: {
  country: string; organization: string; organizationalUnit: string
  locality: string; commonName: string
}): string {
  try {
    const { createSign } = require('crypto')
    const { X509Certificate } = require('crypto')

    // Ndërtojmë CSR ASN.1 structure manualisht
    // Subject: C, O, OU, L, CN

    // Kjo është implementation e thjeshtëzuar
    // Për production: përdor 'selfsigned' ose 'node-forge' me EC support

    const subjectLines = [
      `C=${subject.country}`,
      `O=${subject.organization}`,
      `OU=${subject.organizationalUnit}`,
      `L=${subject.locality}`,
      `CN=${subject.commonName}`,
    ].join('\n')

    // Placeholder CSR — do të zëvendësohet me implementim të plotë
    // pas konfirmimit se ATK CA endpoint funksionon
    return [
      '-----BEGIN CERTIFICATE REQUEST-----',
      Buffer.from(JSON.stringify({
        subject: subjectLines,
        publicKey: 'EC_P256',
        signature: 'ECDSA_SHA256',
      })).toString('base64'),
      '-----END CERTIFICATE REQUEST-----',
    ].join('\n')
  } catch {
    throw new Error('CSR generation failed')
  }
}

// ── MOCK CERTIFICATE ──────────────────────────────────────────
function generateMockCertificate(nui: string, companyName: string): string {
  const mockData = {
    mock: true,
    nui,
    companyName,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }
  return [
    '-----BEGIN CERTIFICATE-----',
    Buffer.from(JSON.stringify(mockData)).toString('base64'),
    '-----END CERTIFICATE-----',
  ].join('\n')
}
