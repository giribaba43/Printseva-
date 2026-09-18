import { useState } from "react";
import { X, MapPin, Camera, RefreshCcw, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { inputCls, mockGeo, PROOF_PHOTOS, submitProof, fmtDateTime, inr, platformFee, netPayout } from "@/lib/api";

export default function ProofSubmitModal({ job, open, onClose, onSubmitted }) {
  const [draft, setDraft] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open || !job) return null;

  const capture = () => {
    setDraft({
      photo_url: PROOF_PHOTOS[Math.floor(Math.random() * PROOF_PHOTOS.length)],
      ...mockGeo(job.city),
      captured_at: new Date().toISOString(),
    });
  };
  if (!draft) capture();

  const submit = async () => {
    setBusy(true);
    try {
      await submitProof(job.id, { ...draft, note: note.trim() });
      toast.success("Proof submitted", { description: "Client has been notified to verify & release payment" });
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit proof");
    } finally {
      setBusy(false);
    }
  };

  const acceptedBid = job.bids?.find((b) => b.id === job.accepted_bid_id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      data-testid="proof-modal-overlay"
    >
      <div
        data-testid="proof-modal"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl animate-fade-up sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="font-display text-lg font-extrabold text-slate-900">Submit Live Pasting Proof</div>
            <p className="text-sm text-slate-500">{job.title}</p>
          </div>
          <button onClick={onClose} data-testid="proof-modal-close" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
          GPS LOCK ACQUIRED — {job.city}
        </div>

        {draft && (
          <div className="relative mb-4 overflow-hidden rounded-xl border border-slate-200" data-testid="proof-preview">
            <img src={draft.photo_url} alt="Site capture" className="h-52 w-full object-cover" />
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold text-slate-900">
              <MapPin className="h-3 w-3" /> GEO-TAGGED • TIMESTAMPED
            </div>
            <div className="absolute bottom-0 w-full bg-gradient-to-t from-slate-900/85 to-transparent px-3 pb-2 pt-8">
              <p className="mono text-[11px] text-white/90">
                LAT {draft.lat} • LNG {draft.lng}
              </p>
              <p className="mono text-[11px] text-amber-300">{fmtDateTime(draft.captured_at)}</p>
            </div>
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-[11px] font-semibold uppercase text-slate-400">Latitude</div>
            <div className="mono font-bold text-slate-900" data-testid="proof-lat">{draft?.lat}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-[11px] font-semibold uppercase text-slate-400">Longitude</div>
            <div className="mono font-bold text-slate-900" data-testid="proof-lng">{draft?.lng}</div>
          </div>
          <div className="col-span-2 rounded-lg bg-slate-50 p-3">
            <div className="text-[11px] font-semibold uppercase text-slate-400">Location</div>
            <div className="font-semibold text-slate-900">{draft?.address}</div>
          </div>
        </div>

        <input
          data-testid="proof-note-input"
          className={`${inputCls} mb-4`}
          placeholder="Note for client (optional) — e.g. both panels pasted, edges sealed"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {acceptedBid && (
          <p className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5 text-amber-500" />
            On approval you receive <b>{inr(netPayout(acceptedBid.quote))}</b> (75%) — platform fee {inr(platformFee(acceptedBid.quote))}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            data-testid="recapture-proof-photo"
            onClick={capture}
            className="flex-1 rounded-xl border-slate-200 py-3"
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Retake
          </Button>
          <Button
            data-testid="proof-submit-button"
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-bold hover:bg-blue-700"
          >
            <Camera className="mr-2 h-4 w-4" /> {busy ? "Submitting…" : "Submit Proof"}
          </Button>
        </div>
      </div>
    </div>
  );
}
