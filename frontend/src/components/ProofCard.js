import { MapPin, BadgeCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { verifyJob, inr, platformFee, netPayout, fmtDateTime } from "@/lib/api";

export default function ProofCard({ job, role, onRefresh }) {
  const proof = job.proof;
  const acceptedBid = job.bids?.find((b) => b.id === job.accepted_bid_id);
  if (!proof) return null;

  const verify = async () => {
    try {
      const res = await verifyJob(job.id);
      toast.success(`Payment released: ${inr(res.released_amount)}`, {
        description: `Platform fee ${inr(res.platform_fee)} • Vendor payout ${inr(res.vendor_payout)}`,
      });
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to verify");
    }
  };

  return (
    <div data-testid="proof-card" className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="relative" data-testid="proof-photo">
        <img src={proof.photo_url} alt="Geo-tagged site proof" className="h-56 w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/30" />

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-slate-900 shadow">
          <MapPin className="h-3.5 w-3.5" /> GPS VERIFIED
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 font-display text-2xl font-extrabold uppercase tracking-widest text-white/25 sm:text-3xl">
            PrintSeva • Verified Proof
          </span>
        </div>

        <div className="absolute bottom-3 right-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-400/90 bg-slate-900/50 text-center text-[8px] font-bold uppercase leading-tight text-amber-300 backdrop-blur-sm">
          PrintSeva<br />GPS<br />Seal
        </div>

        <div className="absolute bottom-3 left-3">
          <p className="mono text-xs font-semibold text-white">
            {proof.lat}, {proof.lng}
          </p>
          <p className="mono text-[11px] text-amber-300">{fmtDateTime(proof.captured_at)}</p>
          <p className="text-[11px] text-white/80">{proof.address}</p>
        </div>
      </div>

      {proof.note && <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">“{proof.note}”</p>}

      {job.status === "proof_submitted" && (
        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            {role === "client" ? (
              <>
                Releasing pays <b className="text-slate-900">{inr(netPayout(acceptedBid?.quote))}</b> to the vendor —
                platform keeps <b className="text-amber-600">{inr(platformFee(acceptedBid?.quote))}</b> (25%).
              </>
            ) : (
              "Awaiting client verification. Payment releases automatically after approval."
            )}
          </div>
          {role === "client" && (
            <Button
              data-testid="verify-release-payment-button"
              onClick={verify}
              className="shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold hover:bg-emerald-700"
            >
              <BadgeCheck className="mr-2 h-4 w-4" /> Verify & Release Payment
            </Button>
          )}
        </div>
      )}

      {job.status === "completed" && (
        <div className="flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">
          <Lock className="h-3.5 w-3.5" />
          Escrow settled — {inr(job.released_amount)} released on {fmtDateTime(job.released_at)}
        </div>
      )}
    </div>
  );
}
