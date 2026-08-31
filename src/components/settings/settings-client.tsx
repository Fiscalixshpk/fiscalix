"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Company, Subscription, ExpenseCategory, Payment } from "@/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate, PLAN_COLORS } from "@/lib/utils";
import {
  Building2, User as UserIcon, CreditCard, Tag, Package,
  Save, Loader2, Plus, Trash2, Eye, EyeOff,
  Crown, AlertCircle, ShoppingBag, Shield, CheckCircle, Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import ServicesManager from "./services-manager";
import POSOnboardWizard from "@/components/pos/pos-onboard-wizard";
import POSDevicesManager from "@/components/pos/pos-devices-manager";
import WaitersManager    from "@/components/pos/waiters-manager";
import CashiersManager   from "@/components/settings/cashiers-manager";
import { RESTAURANT_TYPES, SALON_TYPES, HEALTH_TYPES } from '@/lib/business-categories'

interface ProfileData {
  full_name: string;
  role: string;
  company_id: string;
  companies: Company;
}

interface Props {
  user: User;
  profile: ProfileData;
  company: Company;
  subscription: Subscription | null;
  categories: ExpenseCategory[];
  payments: Payment[];
  posDevices?: { id: string; pos_id: number; device_name: string; cashier_name: string | null; status: string; environment: string; private_key_enc: string | null; application_id: number | null }[];
  initialWaiters?: { id: string; name: string; pin: string; color: string; rfid_tag?: string | null }[];
}

type Tab = "company" | "profile" | "billing" | "categories" | "services" | "pos" | "cashiers";

const PLAN_NAMES: Record<string, string> = {
  basic: "Business",
  starter: "Starter",
  professional: "Professional",
  premium: "Pro",
  advanced: "Advanced",
  enterprise: "Enterprise",
};

export function SettingsClient({ user, profile, company, subscription, categories, payments, posDevices = [], initialWaiters = [] }: Props) {
  const [tab, setTab] = useState<Tab>("company");
  const [loading, setLoading] = useState(false);
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const supabase = createClient();

  // Company form
  const [companyForm, setCompanyForm] = useState({
    name: company?.name || "",
    email: company?.email || "",
    phone: company?.phone || "",
    address: company?.address || "",
    city: company?.city || "",
    country: company?.country || "Kosovo",
    vat_number: company?.vat_number || "",
    tax_number: (company as Record<string,unknown>)?.tax_number as string || "",
    invoice_prefix: company?.invoice_prefix || "INV",
    iban: company?.iban || "",
    bank_name: company?.bank_name || "",
    atk_application_id: (company as any)?.atk_application_id || "",
    atk_fiscalization_no: (company as any)?.atk_fiscalization_no || "",
    website: company?.website || "",
    default_tax_rate: String(company?.default_tax_rate || 18),
    invoice_color: (company as Record<string,unknown>)?.invoice_color as string || "#5A1FD6",
  });
  const [isVatRegistered, setIsVatRegistered] = useState(
    (company as Record<string,unknown>)?.is_vat_registered !== false
  );

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || "",
    old_password: "",
    new_password: "",
  });

  // Logo upload
  const [logoUrl, setLogoUrl] = useState(company?.logo_url || "");
  const [logoLoading, setLogoLoading] = useState(false);

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formati duhet të jetë PNG, JPG, WEBP ose SVG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo duhet të jetë max 2MB"); return; }
    setLogoLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/${company?.id || "unknown"}.${ext}`;
      const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: publicUrl }),
      });
      setLogoUrl(publicUrl);
      toast.success("Logo u ngarkua me sukses!");
    } catch (err) {
      console.error('Logo upload error:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('mime type') || msg.toLowerCase().includes('not allowed')) {
        toast.error("Ky format (SVG?) nuk lejohet nga ruajtja e skedarëve. Provo PNG ose JPG, ose kontrollo cilësimet e bucket-it 'logos' në Supabase Storage.");
      } else {
        toast.error(msg || "Gabim gjatë ngarkimit të logos");
      }
    } finally {
      setLogoLoading(false);
    }
  }

  // Category form
  const [catForm, setCatForm] = useState({ name: "", icon: "📦", color: "#ffffff" });
  const [cats, setCats] = useState(categories);
  const [newCatLoading, setNewCatLoading] = useState(false);

  async function saveCompany() {
    setLoading(true);
    try {
      // Clean form data before sending
      const cleanForm = {
        ...companyForm,
        default_tax_rate: Number(companyForm.default_tax_rate) || 18,
        is_vat_registered: isVatRegistered,
      }
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Ndodhi një gabim");
        return;
      }
      toast.success("Kompania u ruajt!");
    } catch (err) {
      console.error("saveCompany error:", err);
      toast.error("Ndodhi një gabim");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setLoading(true);
    try {
      await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: profileForm.full_name }),
      });
      if (profileForm.new_password) {
        const { error } = await supabase.auth.updateUser({
          password: profileForm.new_password,
        });
        if (error) throw error;
        toast.success("Fjalëkalimi u ndryshua");
      }
      toast.success("Profili u ruajt");
    } catch {
      toast.error("Ndodhi një gabim");
    } finally {
      setLoading(false);
    }
  }

  async function addCategory() {
    if (!catForm.name) return;
    setNewCatLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCats((prev) => [...prev, data]);
      setCatForm({ name: "", icon: "📦", color: "#ffffff" });
      toast.success("Kategoria u shtua");
    } catch {
      toast.error("Ndodhi një gabim");
    } finally {
      setNewCatLoading(false);
    }
  }

  async function deleteCategory(id: string) {
    try {
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      setCats((prev) => prev.filter((c) => c.id !== id));
      toast.success("Kategoria u fshi");
    } catch {
      toast.error("Ndodhi një gabim");
    }
  }

  const isRestaurantBiz = RESTAURANT_TYPES.includes(company?.business_type || '')
  const isSalonBiz = [...SALON_TYPES, ...HEALTH_TYPES].includes(company?.business_type || '')
  const isMarketBiz = company?.business_type === 'market'

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "company", label: "Kompania", icon: Building2 },
    { id: "profile", label: "Profili", icon: UserIcon },
    { id: "billing", label: "Faturimi", icon: CreditCard },
    ...(!isRestaurantBiz ? [] : [{ id: "categories" as Tab, label: "Kategoritë", icon: Tag }]),
    ...(!isRestaurantBiz ? [{ id: "services" as Tab, label: "Shërbimet", icon: Package }] : []),
    ...(company?.pos_enabled ? [{ id: "pos" as Tab, label: isSalonBiz ? "Arka Fiskale" : "Pajisjet POS", icon: ShoppingBag }] : []),
    ...(isMarketBiz ? [{ id: "cashiers" as Tab, label: "Kasierët", icon: UserIcon }] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">Cilësimet</h1>
        <p className="text-sm mt-0.5">Menaxho kompaninë dhe llogarinë</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-input)] rounded-xl p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === id ? '' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`}
            style={{
              background: tab === id ? '#7C3AED' : 'transparent',
              color: tab === id ? '#ffffff' : undefined,
              border: 'none', cursor: 'pointer',
            }}
          >
            <Icon className="w-4 h-4" style={{ color: 'inherit' }} />
            <span className="hidden sm:inline" style={{ color: 'inherit' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Company Tab */}
      {tab === "company" && (
        <div className="glass rounded-2xl p-6 border border-[var(--border)] space-y-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Informacioni i Kompanisë</h3>

          {/* Logo Upload */}
          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-muted)', marginBottom:8 }}>
            <div style={{ width:72, height:72, borderRadius:12, border:'2px dashed var(--border)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-card)' }}>
              {logoUrl
                ? <img src={logoUrl} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
                : <span style={{ fontSize:28 }}>🏪</span>
              }
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:4 }}>Logo e Biznesit</p>
              <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:10 }}>Shfaqet mbi kuponin fiskal · PNG, JPG, max 2MB</p>
              <label style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, background:'#7C3AED', color:'white', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                {logoLoading ? 'Duke ngarkuar...' : logoUrl ? 'Ndrysho Logon' : 'Ngarko Logon'}
                <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={uploadLogo} style={{ display:'none' }}/>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 12, background: isVatRegistered ? 'var(--purple)' : 'var(--bg-card)', border: isVatRegistered ? '1px solid var(--purple)' : '1px solid var(--border)', marginBottom: 20, transition: 'all 0.2s', gridColumn:'1/-1' }}>
              <input type="checkbox" checked={isVatRegistered} onChange={e => setIsVatRegistered(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: 'white', cursor: 'pointer' }} />
              <span style={{ fontSize: 12.5, color: isVatRegistered ? 'white' : 'var(--text-2)', lineHeight: 1.5 }}>
                Jam i regjistruar në TVSH
                <span style={{ display: 'block', fontSize: 11, color: isVatRegistered ? 'var(--bg-muted)' : 'var(--text-3)', marginTop: 2 }}>
                  Çkyç nëse biznesi nuk është (ende) në TVSH — faturat krijohen pa TVSH automatikisht.
                  {' '}<strong>Shënim:</strong> nëse e kalon pragun e €30,000 qarkullim 12-mujor, ky aktivizohet automatikisht nga sistemi.
                </span>
              </span>
            </label>

            {[
              { key: "name", label: "Emri i Kompanisë", required: true },
              { key: "email", label: "Email", type: "email" },
              { key: "phone", label: "Telefoni" },
              { key: "tax_number", label: "Numri Fiskal (NUI)" },
              { key: "vat_number", label: "Numri i TVSH" },
              { key: "address", label: "Adresa" },
              { key: "city", label: "Qyteti" },
              { key: "country", label: "Shteti" },
              { key: "website", label: "Website" },
              { key: "iban", label: "IBAN" },
              { key: "bank_name", label: "Banka" },
              { key: "invoice_prefix", label: "Prefiksi i Faturës" },
              { key: "atk_application_id", label: "Nr. Aplikimit ATK (ApplicationID)" },
              { key: "atk_fiscalization_no", label: "Nr. Fiskalizimit ATK" },
              ...(isVatRegistered ? [{ key: "default_tax_rate", label: "TVSH Default (%)", type: "number" }] : []),
            ].map(({ key, label, type = "text", required }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "Poppins,sans-serif", fontWeight: 600 }}>
                  {label} {required && "*"}
                </label>
                <input
                  type={type}
                  value={companyForm[key as keyof typeof companyForm]}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="finex-input"
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveCompany}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-colors text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Ruaj ndryshimet
          </button>
        </div>
      )}

      {/* Profile Tab */}
      {tab === "profile" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 border border-[var(--border)] space-y-4">
            <h3 className="font-semibold text-[var(--text-1)]">Të dhënat personale</h3>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "Poppins,sans-serif", fontWeight: 600 }}>Emri i plotë</label>
              <input
                value={profileForm.full_name}
                onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                className="finex-input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "Poppins,sans-serif", fontWeight: 600 }}>Email</label>
              <input
                value={user.email}
                disabled
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-3)] text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-[var(--border)] space-y-4">
            <h3 className="font-semibold text-[var(--text-1)]">Ndrysho Fjalëkalimin</h3>
            {[
              { key: "new_password", label: "Fjalëkalimi i ri", show: showNewPw, toggle: () => setShowNewPw(!showNewPw) },
            ].map(({ key, label, show, toggle }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "Poppins,sans-serif", fontWeight: 600 }}>{label}</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={profileForm[key as keyof typeof profileForm]}
                    onChange={(e) => setProfileForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-3 pr-10 py-2.5 text-[var(--text-1)] text-sm focus:outline-none focus:border-[var(--purple)]"
                  />
                  <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={saveProfile}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-colors text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Ruaj
            </button>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {tab === "billing" && (
        <div className="space-y-4">
          {/* Current plan */}
          <div className="glass rounded-2xl p-6 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-1)]">Plani Aktual</h3>
              {subscription && (
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${PLAN_COLORS[subscription.plan as keyof typeof PLAN_COLORS]}`}>
                  {PLAN_NAMES[subscription.plan]}
                </span>
              )}
            </div>
            {subscription ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-3)] text-xs">Statusi</p>
                  <StatusBadge status={subscription.status} />
                </div>
                <div>
                  <p className="text-[var(--text-3)] text-xs">Skadon</p>
                  <p className="text-[var(--text-1)] font-medium">
                    {formatDate(subscription.current_period_end || '')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                Nuk ka subscription aktiv
              </div>
            )}
          </div>


          {/* Payment history */}
          <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text-1)]">Historia e Pagesave</h3>
            </div>
            {payments.length === 0 ? (
              <div className="py-8 text-center text-zinc-600 text-sm">
                Nuk ka pagesa të regjistruara
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Data", "Shuma", "Plani", "Statusi"].map((h) => (
                      <th key={h} className="text-left text-xs text-[var(--text-3)] font-medium uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border)]">
                      <td className="px-5 py-3 text-sm">
                        {p.status === 'confirmed' && p.updated_at
                          ? formatDate(p.updated_at)
                          : formatDate(p.submitted_at || p.created_at)}
                      </td>
                      <td className="px-5 py-3 text-[var(--text-1)] font-semibold text-sm">{formatCurrency(Number(p.amount))}</td>
                      <td className="px-5 py-3 text-sm capitalize">
                        {p.plan === 'basic' ? 'Business' : p.plan === 'starter' ? 'Starter' : p.plan === 'professional' ? 'Professional' : p.plan}
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {tab === "categories" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 border border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-1)] mb-4">Shto Kategori</h3>
            <div className="mb-3">
              <p style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Zgjidh Ngjyrën</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {['#7C3AED','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899','#0EA5E9','#8B5CF6','#F97316','#06B6D4','#84CC16','#6366F1'].map(color => (
                  <button key={color} type="button" onClick={() => setCatForm(f => ({ ...f, icon: color }))}
                    style={{ width:32, height:32, borderRadius:8, border: catForm.icon===color ? '3px solid var(--text-1)' : '2px solid transparent', background: color, cursor:'pointer' }}>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <input
                value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Emri i kategorisë"
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-1)] text-sm focus:outline-none focus:border-[var(--purple)]"
              />
              <button
                onClick={addCategory}
                disabled={newCatLoading || !catForm.name}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-colors text-sm disabled:opacity-50"
              >
                {newCatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Shto
              </button>
            </div>
          </div>

          <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
            {cats.length === 0 ? (
              <div className="py-8 text-center text-zinc-600 text-sm">
                Nuk ka kategori. Shto të parat!
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {cats.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[var(--text-1)] text-sm font-medium">{(cat as {name_sq?:string;name?:string}).name_sq || cat.name || "—"}</span>
                    </div>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-3)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "services" && (
        <div className="space-y-6">
          <ServicesManager companyId={company.id} businessType={company.business_type || ''} />
        </div>
      )}

      {/* ── POS TAB ── */}
      {tab === "pos" && (
        <div className="space-y-6">
          <POSDevicesManager
            companyId={company?.id || ''}
            companyNui={(company as any)?.tax_number || company?.nui || companyForm.tax_number || ''}
            companyName={company?.name || ''}
            initialDevices={posDevices}
          />
          {RESTAURANT_TYPES.includes(company?.business_type || '') && (
            <WaitersManager initialWaiters={initialWaiters} />
          )}
        </div>
      )}

      {/* ── KASIERËT TAB ── */}
      {tab === "cashiers" && company?.id && (
        <CashiersManager companyId={company.id} />
      )}
    </div>
  );
}

export default SettingsClient
