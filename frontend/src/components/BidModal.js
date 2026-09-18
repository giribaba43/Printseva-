import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { inputCls, placeBid, platformFee, netPayout, inr, VENDOR_TYPES, setVendorName } from "@/lib/api";

export default function BidModal({ job, open, onClose, onSubmitted }) {
  const [vendorName, setVendor] = useState(localStorage.getItem("printseva_vendor") || "");
  const [vendorType, setVendorType] = useState("designer");
  const [quote, setQuote] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open || !job) return null;

  const q = Number(quote) || 0;

  const submit = async () => {
    if (!vendorName.trim() || !q || !deliveryDays) {
      toast.error("Business name, quote and delivery time are required");
      return;
    }
    setBusy(true);
    try {
      setVendorName(vendorName.trim());
      await placeBid(job.id, {
        vendor_name: vendorName.trim(),
        vendor_type: vendorType,
        quote: q,
        delivery_days: Number(deliveryDays),
        message: message.trim(),
      });
      toast.success(`Bid placed on "${job.title}"`, { description: `You keep ${inr(netPayout(q))} after the 25% platform fee` });
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to place bid");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      data-testid="bid-modal-overlay"
    >
      <div
        data-testid="bid-modal"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl animate-fade-up sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="font-display text-lg font-extrabold text-slate-900">Place Your Bid</div>
            <p className="text-sm text-slate-500">{job.title} • {job.city}</p>
          </div>
          <button onClick={onClose} data-testid="bid-modal-close" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Business / Vendor Name</span>
            <input data-testid="bid-vendor-name-input" className={inputCls} placeholder="e.g. Sharma Graphics" value={vendorName} onChange={(e) => setVendor(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Quoted Price (₹)</span>
            <input data-testid="bid-quote-input" type="number" min="1" className={inputCls} placeholder="e.g. 2200" value={quote} onChange={(e) => setQuote(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery Time (days)</span>
            <input data-testid="bid-delivery-input" type="number" min="1" className={inputCls} placeholder="e.g. 3" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Vendor Type</span>
            <select data-testid="bid-vendor-type-select" className={inputCls} value={vendorType} onChange={(e) => setVendorType(e.target.value)}>
              {VENDOR_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Message (optional)</span>
            <input data-testid="bid-message-input" className={inputCls} placeholder="e.g. Includes lamination + delivery" value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
        </div>

        <div className="mb-5 rounded-xl bg-slate-900 p-4 text-white" data-testid="payout-breakdown">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">25% Commission Rule</div>
          <div className="flex items-center justify-between py-0.5 text-sm">
            <span className="text-slate-300">Total Quoted Amount</span>
            <span className="mono font-bold" data-testid="quoted-amount">{inr(q)}</span>
          </div>
          <div className="flex items-center justify-between py-0.5 text-sm">
            <span className="text-amber-400">Platform Fee (25% auto-deducted)</span>
            <span className="mono font-bold text-amber-400" data-testid="platform-fee-amount">− {inr(platformFee(q))}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-sm">
            <span className="font-semibold">Net Vendor Payout (75%)</span>
            <span className="mono text-base font-extrabold text-emerald-400" data-testid="net-payout-amount">{inr(netPayout(q))}</span>
          </div>
        </div>

        <Button
          data-testid="bid-submit-button"
          onClick={submit}
          disabled={busy}
          className="w-full rounded-xl bg-blue-600 py-3 font-display font-bold hover:bg-blue-700"
        >
          {busy ? "Placing…" : "Confirm Bid"}
        </Button>
      </div>
    </div>
  );
}
