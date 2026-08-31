import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { InvoiceDetailClient } from "@/components/invoices/invoice-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const isAccountant = profile.role === 'accountant' || profile.role === 'admin'

  // Fetch invoice without company filter first for accountants
  const { data: invoice } = await supabase
    .from("invoices")
    .select(`*, invoice_items(*)`)
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  // For regular users: must be their company
  if (!isAccountant && invoice.company_id !== profile.company_id) notFound();

  // For accountants: verify they manage this company
  if (profile.role === 'accountant') {
    const { data: rel } = await supabase
      .from('accountant_clients')
      .select('id')
      .eq('accountant_id', user.id)
      .eq('company_id', invoice.company_id)
      .maybeSingle();
    if (!rel) notFound();
  }

  const targetCompanyId = isAccountant ? invoice.company_id : profile.company_id

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", targetCompanyId)
    .single();

  // Pre-fetch logo as base64 for PDF (server-side, no CORS)
  let logoBase64: string | null = null
  if (company?.logo_url) {
    try {
      // Clean URL: remove ?t=timestamp cache-buster
      const cleanUrl = company.logo_url.split('?')[0]
      const res = await fetch(cleanUrl, { 
        cache: 'no-store',
        headers: { 'Accept': 'image/*' }
      })
      if (res.ok) {
        const buf = await res.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        logoBase64 = `data:image/png;base64,${btoa(binary)}`
      }
    } catch {}
    // Fallback: try Supabase storage SDK
    if (!logoBase64) {
      try {
        const urlParts = company.logo_url.split('/logos/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0]
          const { data: fileData } = await supabase.storage.from('logos').download(filePath)
          if (fileData) {
            const buf = await fileData.arrayBuffer()
            const bytes = new Uint8Array(buf)
            let binary = ''
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
            logoBase64 = `data:${fileData.type || 'image/png'};base64,${btoa(binary)}`
          }
        }
      } catch {}
    }
  }

    const { data: userProfile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const isAccountantView = ['accountant'].includes(userProfile?.role || '')

  return <InvoiceDetailClient invoice={invoice} company={company!} logoBase64={logoBase64} isAccountantView={isAccountantView} />;
}
