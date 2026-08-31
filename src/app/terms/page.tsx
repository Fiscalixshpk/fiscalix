import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Kushtet e Përdorimit — Fiscalix' }

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#9B5CF8', fontSize: 13, marginBottom: 24, textDecoration: 'none' }}>
          <ArrowLeft size={15} /> Kthehu te Fiscalix
        </Link>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text-1)', marginBottom: 24 }}>
          Kushtet e Përdorimit
        </h1>
        <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
{`Përditësuar më: 27 Qershor 2026

1. RRETH FISCALIX

Fiscalix është platformë cloud për kontabilitet, faturim dhe bashkëpunim financiar, e ofruar nga Fiscalix SHPK ("ne", "ofruesi"). Fiscalix lejon biznese dhe kontabilistë në Kosovë të menaxhojnë fatura, shpenzime, dokumente financiare, dhe të bashkëpunojnë mes tyre brenda një hapësire të vetme dixhitale.

Duke krijuar llogari ose duke përdorur Fiscalix në çfarëdo forme, ju pranoni këto Kushte të Përdorimit në tërësinë e tyre. Nëse nuk pajtoheni me ndonjë pjesë të tyre, ju lutemi mos e përdorni platformën.

2. LLOJET E LLOGARIVE

Fiscalix ofron tre lloje llogarish:
- Biznes (Business Owner) — për kompani që krijojnë fatura, ndjekin shpenzime, dhe menaxhojnë financat e tyre.
- Kontabilist (Accountant) — për profesionistë kontabël që menaxhojnë një ose më shumë klientë biznesi nga një llogari e vetme.
- Administrator — i kufizuar për ekipin e Fiscalix SHPK, për qëllime mbikëqyrjeje dhe mbështetjeje teknike.

Çdo llogari duhet të krijohet me informacion të vërtetë dhe të saktë. Jeni përgjegjës për ruajtjen e konfidencialitetit të fjalëkalimit tuaj dhe për çdo veprim që ndodh nën llogarinë tuaj.

3. MARRËDHËNIA BIZNES–KONTABILIST

Fiscalix lejon një kontabilist të kërkojë qasje te llogaria e një biznesi përmes një ftese me email. Kjo qasje:
- Jepet vetëm pas pranimit explicit nga ana e biznesit — kurrë automatikisht.
- Mund të anulohet nga vetë kontabilisti (duke hequr klientin) ose, sipas rrethanave, nga ndërhyrja e administratorit.
- I jep kontabilistit qasje te faturat, shpenzimet, dokumentet dhe komunikimi i lidhur me kompaninë përkatëse, për kohën që marrëdhënia është aktive.

Biznesi mban të drejtën të refuzojë ose të heqë në çdo moment qasjen e një kontabilisti.

4. PAGESAT DHE ABONIMET

4.1. Modeli i pagesës
Fiscalix nuk përdor pagesa automatike me kartë. Pagesat pranohen me transfer bankar ose në para të gatshme (kesh), dhe konfirmohen manualisht nga ekipi i Fiscalix SHPK pasi të verifikohet pagesa.

4.2. Aktivizimi i llogarisë
Llogaritë e reja (biznes ose kontabilist) krijohen në gjendje "në pritje të pagesës" dhe nuk kanë qasje funksionale te platforma derisa pagesa të konfirmohet nga administratori. Ky proces zakonisht përfundon brenda 24 orëve nga njoftimi i pagesës.

4.3. Pakot dhe çmimet
Pakot aktuale dhe çmimet e tyre publikohen brenda platformës dhe mund të ndryshojnë me njoftim paraprak. Përdorimi i vazhdueshëm i platformës pas një ndryshimi çmimi nënkupton pranimin e çmimit të ri për periudhat e ardhshme të faturimit.

4.4. Anulimi
Përdoruesi mund të kërkojë anulimin e abonimit në çdo kohë duke kontaktuar Fiscalix SHPK. Anulimi ndalon rinovimet e ardhshme; nuk garantohet rimbursim i pagesave të kryera tashmë për periudhën aktuale, përveç rasteve të miratuara individualisht.

5. PËRDORIMI I LEJUAR

Ju pranoni të:
- Përdorni Fiscalix vetëm për qëllime të ligjshme biznesi dhe kontabël.
- Mos përpiqeni të anashkaloni masat e sigurisë, kontrollet e qasjes, ose kufizimet e planit tuaj të abonimit.
- Mos ngarkoni përmbajtje që shkel të drejta autoriale, ligje, ose që është mashtruese.
- Mos përdorni llogarinë tuaj për të dhënë qasje te të dhëna që nuk keni autorizim t'i ndani.

Ne mbajmë të drejtën të pezullojmë ose mbyllim llogari që shkelin këto kushte, pas njoftimi paraprak kur është e mundshme.

6. SKANIMI I DOKUMENTEVE (FUNKSIONI "AI SCANNER")

Fiscalix ofron një funksion për nxjerrjen automatike të informacionit nga foto faturash dhe kuponë (vendor, shumë, datë, kategori). Ky funksion synon të lehtësojë hyrjen e të dhënave, por nuk garanton saktësi të plotë. Përdoruesi mbetet përgjegjës për verifikimin e të dhënave të nxjerra para se t'i ruajë ose t'i përdorë për qëllime financiare a tatimore.

7. PËRGJEGJËSIA PËR SAKTËSINË FINANCIARE DHE TATIMORE

Fiscalix është mjet organizimi dhe regjistrimi — nuk zëvendëson këshillimin profesional kontabël apo ligjor, dhe nuk garanton pajtueshmëri automatike me ligjet tatimore të Republikës së Kosovës. Përdoruesi (biznesi ose kontabilisti) mbetet i vetmi përgjegjës për saktësinë e të dhënave të futura, për deklarimet tatimore, dhe për pajtueshmërinë me Administratën Tatimore të Kosovës (ATK) ose çdo autoritet tjetër kompetent.

8. DISPONIBILITETI I SHËRBIMIT

Përpiqemi të mbajmë Fiscalix të disponueshëm vazhdimisht, por nuk garantojmë funksionim pa ndërprerje. Mirëmbajtja, përditësimet, ose rrethana jashtë kontrollit tonë mund të shkaktojnë ndërprerje të përkohshme.

9. KUFIZIMI I PËRGJEGJËSISË

Fiscalix ofrohet "siç është". Në masën maksimale të lejuar nga ligji, Fiscalix SHPK nuk mban përgjegjësi për dëme indirekte, humbje fitimi, ose pasoja financiare që rezultojnë nga përdorimi ose pamundësia e përdorimit të platformës, përveç rasteve të neglizhencës së rëndë ose qëllimit të keq nga ana jonë.

10. NDRYSHIMET NË KËTO KUSHTE

Këto Kushte të Përdorimit mund të përditësohen herë pas here. Ndryshimet thelbësore do të njoftohen brenda platformës.

11. LIGJI I ZBATUESHËM

Këto Kushte rregullohen nga ligjet e Republikës së Kosovës. Çdo mosmarrëveshje që nuk zgjidhet me mirëkuptim do t'i nënshtrohet juridiksionit të gjykatave kompetente në Kosovë.

12. KONTAKTI

Për pyetje rreth këtyre Kushteve, na kontaktoni:
Fiscalix SHPK
Telefoni: +383 43 81 31 21`}
        </div>
      </div>
    </div>
  )
}
