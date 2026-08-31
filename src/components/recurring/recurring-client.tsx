"use client";

import { useState } from "react";
import type { RecurringInvoice, Company } from "@/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus, RefreshCw, Pause, Play, Trash2,
  Calendar, Clock, Loader2, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  recurring: RecurringInvoice[];
  company: Company;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Çdo Javë",
  monthly: "Çdo Muaj",
  quarterly: "Çdo Tremujor",
  yearly: "Çdo Vit",
};

export function RecurringClient({ recurring, company }: Props) {
  const [items, setItems] = useState(recurring);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    amount: "",
    description: "",
    frequency: "monthly",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notes: "",
  });

  async function handleToggle(id: string, status: string) {
    setLoading(id);
    try {
      const newStatus = status === "active" ? "paused" : "active";
      const res = await fetch(`/api/recurring/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      toast.success(newStatus === "active" ? "U aktivizua" : "U pezullua");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ndodhi një gabim");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Fshi këtë faturë periodike?")) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((r) => r.id !== id));
      toast.success("U fshi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ndodhi një gabim");
    } finally {
      setLoading(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading("new");
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gabim');
      setItems((prev) => [data, ...prev]);
      setShowForm(false);
      toast.success("Fatura periodike u krijua");
      setForm({
        client_name: "", client_email: "", amount: "",
        description: "", frequency: "monthly",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "", notes: "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ndodhi një gabim");
    } finally {
      setLoading(null);
    }
  }

  const activeCount = items.filter((r) => r.status === "active").length;
  const monthlyRevenue = items
    .filter((r) => r.status === "active" && r.frequency === "monthly")
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">Faturat Periodike</h1>
          <p className="text-sm mt-0.5">
            {activeCount} aktive · {formatCurrency(monthlyRevenue)}/muaj
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Faturë e Re Periodike
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 border border-[var(--border)]">
          <h3 className="font-semibold text-[var(--text-1)] mb-4">Faturë Periodike e Re</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-wider">Klienti *</label>
              <input
                value={form.client_name}
                onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                placeholder="Emri i klientit"
                required
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-1)] text-sm focus:outline-none focus:border-[var(--purple)]"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-wider">Email Klientit</label>
              <input
                type="email"
                value={form.client_email}
                onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))}
                placeholder="klient@email.com"
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-1)] text-sm focus:outline-none focus:border-[var(--purple)]"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-wider">Shuma (€) *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                required
                min="0"
                step="0.01"
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-1)] text-sm focus:outline-none focus:border-[var(--purple)]"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-wider">Frekuenca *</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-1)] text-sm focus:outline-none focus:border-[var(--purple)]"
              >
                {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              <option value="yearly">Vjetore</option>
</select>
            </div>
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-wider">Data e Fillimit *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                required
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-1)] text-sm focus:outline-none focus:border-[var(--purple)] "
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-wider">Data e Mbarimit</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-1)] text-sm focus:outline-none focus:border-[var(--purple)] "
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs mb-1.5 uppercase tracking-wider">Përshkrimi *</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Shërbimi / Produkti..."
                required
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-1)] text-sm focus:outline-none focus:border-[var(--purple)]"
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-muted)] transition-colors text-sm"
              >
                Anulo
              </button>
              <button
                type="submit"
                disabled={loading === "new"}
                className="flex-1 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Krijo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="glass rounded-2xl p-12 border border-[var(--border)] text-center">
          <RefreshCw className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="font-medium">Nuk ka fatura periodike</p>
          <p className="text-zinc-600 text-sm mt-1">
            Krijo faturën e parë periodike për retainerët tuaj
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass rounded-2xl p-5 border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.status === "active" ? "bg-emerald-500/10" : "bg-[var(--bg-muted)]"
                  }`}>
                    <RefreshCw className={`w-5 h-5 ${
                      item.status === "active" ? "text-emerald-400" : "text-zinc-600"
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-1)]">{item.client_name}</span>
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                    <p className="text-[var(--text-3)] text-sm">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <p className="text-[var(--text-1)] font-bold">{formatCurrency(Number(item.amount))}</p>
                    <p className="text-[var(--text-3)] text-xs">{FREQUENCY_LABELS[item.frequency]}</p>
                  </div>
                  <div className="text-right hidden lg:block">
                    <div className="flex items-center gap-1 text-[var(--text-3)] text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Fillon: {formatDate(item.start_date)}</span>
                    </div>
                    {item.next_invoice_date && (
                      <div className="flex items-center gap-1 text-xs mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Tjetra: {formatDate(item.next_invoice_date)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(item.id, item.status)}
                      disabled={loading === item.id}
                      className={`p-2 rounded-lg transition-colors ${
                        item.status === "active"
                          ? "hover:bg-amber-500/10 hover:text-amber-400":"hover:bg-emerald-500/10 hover:text-emerald-400"}`}
                    >
                      {loading === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : item.status === "active" ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={loading === item.id}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-3)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecurringClient
