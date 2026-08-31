import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Politika e Privatësisë — Fiscalix' }

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#9B5CF8', fontSize: 13, marginBottom: 24, textDecoration: 'none' }}>
          <ArrowLeft size={15} /> Kthehu te Fiscalix
        </Link>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text-1)', marginBottom: 24 }}>
          Politika e Privatësisë
        </h1>
        <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
{`Përditësuar më: 27 Qershor 2026

1. HYRJE

Kjo Politikë e Privatësisë shpjegon si Fiscalix, i ofruar nga Bearix Agency, mbledh, përdor, ruan dhe mbron të dhënat tuaja personale dhe financiare. Duke përdorur Fiscalix, ju pranoni praktikat e përshkruara këtu.

2. TË DHËNAT QË MBLEDHIM

2.1. Të dhëna identifikimi dhe llogarie
Emri i plotë, adresa e email-it, numri i telefonit, roli (biznes, kontabilist, ose administrator), dhe fjalëkalimi (i ruajtur i enkriptuar, jo në tekst të thjeshtë).

2.2. Të dhëna të kompanisë
Emri i biznesit, adresa, qyteti, numri fiskal (NUI), statusi i regjistrimit në TVSH, numri i llogarisë bankare (IBAN), emri i bankës, dhe logoja e ngarkuar nga përdoruesi.

2.3. Të dhëna financiare
Fatura (me detaje klienti, artikuj, shuma, statuse pagese), shpenzime (vendor, shumë, kategori, data), dhe dokumente të ngarkuara në vault (foto faturash, ekstrakte bankare, kontrata, etj).

2.4. Të dhëna komunikimi
Mesazhet e shkëmbyera mes biznesit dhe kontabilistit brenda platformës, kërkesat për dokumente, dhe shënimet private që kontabilisti mban për klientët e tij.

2.5. Të dhëna pagese
Plani i abonimit, statusi i pagesës, metoda e pagesës (transfer bankar ose kesh), dhe referencat e transfertave të dorëzuara për konfirmim. Fiscalix nuk ruajt detaje kartash bankare, pasi nuk pranon pagesa me kartë.

2.6. Të dhëna teknike dhe aktiviteti
Regjistrime të veprimeve kryesore (krijim/modifikim/fshirje e faturave, shpenzimeve, dhe dokumenteve) me kohën dhe autorin e veprimit, për qëllime sigurie dhe auditimi.

3. SI I PËRDORIM TË DHËNAT

Ne i përdorim të dhënat tuaja për të:
- Ofruar funksionalitetin themelor të platformës (krijim faturash, ndjekje shpenzimesh, raportim financiar).
- Mundësuar bashkëpunimin mes biznesit dhe kontabilistit (chat, ndarje dokumentesh, kërkesa).
- Konfirmuar dhe administruar pagesat e abonimit.
- Dërguar njoftime të lidhura me llogarinë (aktivizim, kërkesa dokumentesh, mesazhe të reja).
- Mbajtur regjistrime auditimi për qëllime sigurie dhe për të mundësuar gjurmimin e veprimeve në rast problemi.

4. SKANIMI I DOKUMENTEVE

Kur përdorni funksionin e skanimit të faturave, fotot e ngarkuara përpunohen për të nxjerrë informacion (vendor, shumë, datë, kategori), me qëllim plotësimin automatik të të dhënave të shpenzimit tuaj brenda Fiscalix.

5. NDARJA E TË DHËNAVE

5.1. Mes biznesit dhe kontabilistit
Kur një biznes pranon ftesën e një kontabilisti, kontabilisti merr qasje te faturat, shpenzimet, dhe dokumentet e lidhura me atë kompani, për kohën që marrëdhënia është aktive.

5.2. Me palë të treta
Ne NUK shesim, nuk huazojmë, dhe nuk ndajmë të dhënat tuaja financiare me palë të treta për qëllime marketingu apo komercialë. Të dhënat mund të ndahen vetëm me ofruesin e infrastrukturës cloud (ruajtja e bazës së të dhënave), ose me autoritetet shtetërore, vetëm nëse kërkohet ligjërisht.

6. RUAJTJA E TË DHËNAVE

Të dhënat tuaja ruhen për sa kohë llogaria juaj është aktive. Nëse kërkoni mbylljen e llogarisë, të dhënat tuaja financiare bazë mund të ruhen për një periudhë shtesë sipas kërkesave ligjore të arkivimit kontabël në Kosovë.

7. SIGURIA E TË DHËNAVE

- Fjalëkalimet ruhen të enkriptuara, jo në tekst të lexueshëm.
- Qasja te të dhënat e një kompanie kufizohet vetëm te përdoruesit e autorizuar.
- Veprimet kryesore mbi të dhëna financiare regjistrohen me autorin dhe kohën.
- Backup-e të rregullta automatike kryhen për të parandaluar humbjen e të dhënave.

8. TË DREJTAT TUAJA

Ju keni të drejtë të kërkoni një kopje të të dhënave tuaja, korrigjimin e të dhënave të pasakta, fshirjen e llogarisë (sipas kufizimeve ligjore), dhe tërheqjen e qasjes së dhënë një kontabilisti.

9. FËMIJËT

Fiscalix nuk është menduar për përdorim nga persona nën 18 vjeç.

10. NDRYSHIMET NË KËTË POLITIKË

Kjo Politikë mund të përditësohet periodikisht. Ndryshimet thelbësore do të njoftohen brenda platformës.

11. KONTAKTI

Për pyetje rreth kësaj Politike, na kontaktoni:
Bearix Agency
Telefoni: +383 43 81 31 21`}
        </div>
      </div>
    </div>
  )
}
