"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import type { ExpenseCategory } from "@/types";
import {
  Upload, Loader2, X, Image as ImageIcon,
  Calendar, DollarSign, Building, FileText,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  categories: ExpenseCategory[];
  defaultValues?: {
    vendor_name?: string;
    amount?: number;
    expense_date?: string;
    category_id?: string;
    description?: string;
  };
  onSuccess?: () => void;
}

export function ExpenseForm({ categories, defaultValues, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    vendor_name: defaultValues?.vendor_name || "",
    amount: defaultValues?.amount?.toString() || "",
    expense_date: defaultValues?.expense_date || defaultValues?.date || new Date().toISOString().split("T")[0],
    category_id: defaultValues?.category_id || "",
    description: defaultValues?.description || "",
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setReceiptFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vendor_name || !form.amount || !form.expense_date) {
      toast.error("Plotëso fushat e detyrueshme");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (receiptFile) fd.append("receipt", receiptFile);

      const res = await fetch("/api/expenses", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gabim");
      }
      toast.success("Shpenzimi u ruajt");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/expenses");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ndodhi një gabim");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="glass rounded-2xl p-6 border border-[var(--border)] space-y-5">
        {/* Vendor + Amount */}
        <div className="expense-form-grid">
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider">
              Shitësi *
            </label>
            <div className="relative expense-input-wrap">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)] pointer-events-none z-10" />
              <input
                value={form.vendor_name}
                onChange={(e) => update("vendor_name", e.target.value)}
                placeholder="Emri i shitësit"
                required
                className="finex-input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider">
              Shuma (€) *
            </label>
            <div className="relative expense-input-wrap">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)] pointer-events-none z-10" />
              <input
                type="number"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                placeholder="0.00"
                required
                min="0"
                step="0.01"
                className="finex-input pl-10"
              />
            </div>
          </div>
        </div>

        {/* Date + Category */}
        <div className="expense-form-grid">
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider">
              Data *
            </label>
            <div className="relative expense-input-wrap">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)] pointer-events-none z-10" />
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => update("expense_date", e.target.value)}
                required
                className="finex-input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider">
              Kategoria
            </label>
            <input
              list="expense-categories"
              value={form.category_id}
              onChange={(e) => { update("category_id", e.target.value); update("category_text", e.target.value) }}
              placeholder="p.sh. Qiraja, Rrymi, Mallrat..."
              className="finex-input"
            />
            <datalist id="expense-categories">
              <option value="Qiraja" />
              <option value="Rrymi" />
              <option value="Uji" />
              <option value="Interneti" />
              <option value="Mallrat" />
              <option value="Paga" />
              <option value="Transporti" />
              <option value="Mirëmbajtja" />
              <option value="Furnitori" />
              <option value="Reklama" />
              <option value="Taksat" />
              <option value="Tjetër" />
              {categories.map((c) => (
                <option key={c.id} value={c.name_sq || c.name} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Payment method + Reference */}
        <div className="expense-form-grid">
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider">
              Mënyra e Pagesës
            </label>
            <select
              value={form.payment_method}
              onChange={(e) => update("payment_method", e.target.value)}
              className="finex-input"
            >
              <option value="cash">Kesh</option>
              <option value="bank_transfer">Transfer Bankar</option>
              <option value="card">Kartë</option>
              <option value="other">Tjetër</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider">
              Nr. Referencës
            </label>
            <input
              value={form.reference_number}
              onChange={(e) => update("reference_number", e.target.value)}
              placeholder="Fatura / Fatura #"
              className="finex-input"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider">
            Përshkrimi
          </label>
          <div className="relative expense-input-wrap">
            <FileText className="absolute left-3 top-3.5 w-4 h-4 text-[var(--text-3)] pointer-events-none" />
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Përshkrim i shkurtër..."
              rows={2}
              className="finex-input pl-10 resize-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider">
            Shënime
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Shënime shtesë..."
            rows={2}
            className="finex-input resize-none"
          />
        </div>
      </div>

      {/* Receipt Upload */}
      <div className="glass rounded-2xl p-6 border border-[var(--border)]">
        <label className="block text-xs font-medium mb-3 uppercase tracking-wider">
          Ngarko Faturë (opsionale)
        </label>
        {previewUrl ? (
          <div className="relative expense-input-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="w-full max-h-48 object-cover rounded-xl"
            />
            <button
              type="button"
              onClick={() => {
                setReceiptFile(null);
                setPreviewUrl(null);
              }}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-[var(--text-1)] hover:bg-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <ImageIcon className="w-3.5 h-3.5" />
              {receiptFile?.name}
            </div>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-white/40 bg-white/5"
                : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-white/[0.02]"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
            <p className="text-[var(--text-3)] text-sm">
              Tërhiq imazhin këtu ose{" "}
              <span className="text-[var(--text-2)] underline">kliko</span>
            </p>
            <p className="text-zinc-600 text-xs mt-1">PNG, JPG, WEBP deri 10MB</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="finex-button-secondary flex-1 py-3 font-medium"
        >
          Anulo
        </button>
        <button
          type="submit"
          disabled={loading}
          className="finex-button-primary flex-1 py-3 font-semibold flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Duke ruajtur...
            </>
          ) : (
            "Ruaj Shpenzimin"
          )}
        </button>
      </div>
    </form>
  );
}

export default ExpenseForm
