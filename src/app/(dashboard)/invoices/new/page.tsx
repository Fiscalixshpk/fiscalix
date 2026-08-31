import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import InvoiceForm from "@/components/invoices/invoice-form"
import MedicalInvoiceForm from "@/components/invoices/medical-invoice-form"
import ConstructionInvoiceForm from "@/components/invoices/construction-invoice-form"
import LegalInvoiceForm from "@/components/invoices/legal-invoice-form"
import AgencyInvoiceForm from "@/components/invoices/agency-invoice-form"
import ITInvoiceForm from "@/components/invoices/it-invoice-form"
import TransportInvoiceForm from "@/components/invoices/transport-invoice-form"
import EducationInvoiceForm from "@/components/invoices/education-invoice-form"
import ImportExportInvoiceForm from "@/components/invoices/import-export-invoice-form"
import TourismInvoiceForm from "@/components/invoices/tourism-invoice-form"

export const metadata = { title: "Faturë e Re – Fiscalix" }

export default async function NewInvoicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users").select("company_id, id").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const { data: company } = await supabase
    .from("companies").select("*").eq("id", profile.company_id).single()

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("company_id", profile.company_id)

  const seq = (count || 0) + 1
  const prefix = company?.invoice_prefix || 
    (company?.business_type === 'health' ? 'RPT' : 
     company?.business_type === 'construction' ? 'SIT' :
     company?.business_type === 'legal' ? 'HON' :
     company?.business_type === 'agency' ? 'AGJ' :
     company?.business_type === 'it' ? 'TEC' :
     company?.business_type === 'transport' ? 'TRN' :
     company?.business_type === 'education' ? 'EDU' :
     company?.business_type === 'import_export' ? 'IMP' :
     company?.business_type === 'tourism' ? 'TUR' : 'INV')
  const nextInvoiceNumber = `${prefix}-${String(seq).padStart(4, "0")}`

  const isMedical = company?.business_type === 'health'
  const isConstruction = company?.business_type === 'construction'
  const isLegal = company?.business_type === 'legal'
  const isAgency = company?.business_type === 'agency'
  const isIT = company?.business_type === 'it'
  const isTransport = company?.business_type === 'transport'
  const isEducation = company?.business_type === 'education'
  const isImportExport = company?.business_type === 'import_export'
  const isTourism = company?.business_type === 'tourism'

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-1)]" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {isMedical ? 'Raport i Ri Mjekësor' : isConstruction ? 'Situatë / Faturë e Re' : isLegal ? 'Faturë Honorari e Re' : isAgency ? 'Faturë / Retainer i Ri' : isIT ? 'Faturë IT e Re' : 'Faturë e Re'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
          {isMedical ? 'Lësho raport mjekësor për pacient' : 
           isConstruction ? 'Lësho situatë ose faturë ndërtimi' : 
           isLegal ? 'Lësho faturë honorari për klient' :
           isAgency ? 'Lësho faturë projekti ose retainer mujor' :
           isIT ? 'Lësho faturë zhvillimi ose mirëmbajtjeje' :
           'Krijo faturë të re për klientët tuaj'}
        </p>
      </div>
      {isMedical
        ? <MedicalInvoiceForm company={company} userId={profile.id} nextInvoiceNumber={nextInvoiceNumber} />
        : isConstruction
        ? <ConstructionInvoiceForm company={company} userId={profile.id} nextInvoiceNumber={nextInvoiceNumber} />
        : isLegal
        ? <LegalInvoiceForm company={company} userId={profile.id} nextInvoiceNumber={nextInvoiceNumber} />
        : isAgency
        ? <AgencyInvoiceForm company={company} userId={profile.id} nextInvoiceNumber={nextInvoiceNumber} />
        : isIT
        ? <ITInvoiceForm company={company} userId={profile.id} nextInvoiceNumber={nextInvoiceNumber} />
        : isTransport
        ? <TransportInvoiceForm company={company} userId={profile.id} nextInvoiceNumber={nextInvoiceNumber} />
        : isEducation
        ? <EducationInvoiceForm company={company} userId={profile.id} nextInvoiceNumber={nextInvoiceNumber} />
        : isImportExport
        ? <ImportExportInvoiceForm company={company} userId={profile.id} nextInvoiceNumber={nextInvoiceNumber} />
        : isTourism
        ? <TourismInvoiceForm company={company} userId={profile.id} nextInvoiceNumber={nextInvoiceNumber} />
        : <InvoiceForm company={company} userId={profile.id} nextInvoiceNumber={nextInvoiceNumber} />
      }
    </div>
  )
}
