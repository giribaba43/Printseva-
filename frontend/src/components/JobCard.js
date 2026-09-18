import { useState } from "react";
import { ChevronDown, Ruler, MapPin, Navigation, Calendar, Users, IndianRupee, Award } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_META, STATUS_META, BID_STATUS_META, inr, platformFee, netPayout,
  acceptBid, rejectBid, fmtDate, pseudoDistance, getVendorName,
} from "@/lib/api";
import ProofCard from "./ProofCard";
import ProofSubmitModal from "./ProofSubmitModal";
import BidModal from "./BidModal";
import DesignReviewRoom from "./DesignReviewRoom";

function Chip({ children, cls }) {
  return <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${cls}`}>{children}</span>;
}

export default function JobCard({ job, role, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [bidOpen, setBidOpen] = useState(false);
  const cat = CATEGORY_META[job.category] || CATEGORY_META.design;
  const status = STATUS_META[job.status];
  const bids = job.bids || [];
  const acceptedBid = bids.find((b) => b.id === job.accepted_bid_id);
  const myName = getVendorName().trim().toLowerCase();
  const myAwarded = role === "vendor" && acceptedBid && acceptedBid.vendor_name.trim().toLowerCase() === myName;

  const act = (fn, bidId, msg) => async () => {
    try {
      await fn(job.id, bidId);
      toast.success(msg);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  return (
    <div data-testid={`job-card-${job.id}`} className="card-lift rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Chip cls={cat.badge}>{cat.label}</Chip>
        <Chip cls={status.cls}>{status.label}</Chip>
        <span className="ml-auto text-[11px] font-medium text-slate-400">Posted {fmtDate(job.created_at)}</span>
      </div>

      <h3 data-testid={`job-card-title-${job.id}`} className="font-display text-lg font-bold leading-snug text-slate-900">
        {job.title}
      </h3>
      {job.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{job.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
        <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5 text-blue-600" /> {job.dimension}</span>
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-blue-600" /> {job.city} — {job.pincode}</span>
        <span className="flex items-center gap-1"><Navigation className="h-3.5 w-3.5 text-blue-600" /> ~{pseudoDistance(job)}</span>
        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-blue-600" /> Due {fmtDate(job.deadline)}</span>
        <span className="flex items-center gap-1 font-bold text-slate-900"><IndianRupee className="h-3.5 w-3.5 text-amber-500" /> {inr(job.budget)}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span data-testid={`bid-count-${job.id}`} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          <Users className="h-3.5 w-3.5" /> {bids.length} Bid{bids.length === 1 ? "" : "s"}
        </span>

        <button
          data-testid={`toggle-bids-${job.id}`}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
        >
          {role === "client" ? "Incoming bids" : "View bids"}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {role === "vendor" && job.status === "open" && (
          <Button
            data-testid={`place-bid-${job.id}`}
            onClick={() => setBidOpen(true)}
            className="ml-auto rounded-xl bg-blue-600 px-5 font-bold hover:bg-blue-700"
            size="sm"
          >
            Place Bid
          </Button>
        )}
        {role === "vendor" && myAwarded && job.category === "pasting" && job.status === "in_progress" && (
          <Button
            data-testid={`submit-proof-${job.id}`}
            onClick={() => setProofOpen(true)}
            className="ml-auto rounded-xl bg-amber-500 px-5 font-bold text-slate-900 hover:bg-amber-600"
            size="sm"
          >
            Submit Pasting Proof
          </Button>
        )}
        {role === "client" && job.status === "open" && (
          <span className="ml-auto text-[11px] font-semibold text-slate-400">Accept a bid to lock escrow</span>
        )}
      </div>

      {acceptedBid && job.status !== "open" && job.status !== "completed" && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          <Award className="h-4 w-4" />
          Awarded: {acceptedBid.vendor_name} at {inr(acceptedBid.quote)} —{" "}
          {role === "client"
            ? `${inr(acceptedBid.quote)} held in escrow, releases on your approval`
            : `You receive ${inr(netPayout(acceptedBid.quote))} after 25% fee (${inr(platformFee(acceptedBid.quote))})`}
        </div>
      )}

      {open && (
        <div data-testid={`bids-drawer-${job.id}`} className="mt-4 space-y-2 border-t border-slate-100 pt-4 animate-fade-up">
          {bids.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
              No bids yet {role === "vendor" ? "— be the first to bid!" : "— vendors are reviewing your job."}
            </p>
          )}
          {bids.map((b) => (
            <div
              key={b.id}
              data-testid={`bid-item-${b.id}`}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                b.id === job.accepted_bid_id ? "border-blue-200 bg-blue-50/60" : "border-slate-100 bg-slate-50/60"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
                  {b.vendor_name}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${BID_STATUS_META[b.status].cls}`}>
                    {BID_STATUS_META[b.status].label}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Delivers in {b.delivery_days} day{b.delivery_days === 1 ? "" : "s"}{b.message ? ` • ${b.message}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="mono text-base font-extrabold text-slate-900">{inr(b.quote)}</div>
                <div className="text-[11px] text-slate-500">net {inr(netPayout(b.quote))} after 25% fee</div>
              </div>
              {role === "client" && b.status === "pending" && job.status === "open" && (
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    data-testid={`accept-bid-${b.id}`}
                    onClick={act(acceptBid, b.id, "Bid accepted — escrow locked, job in progress")}
                    size="sm"
                    className="flex-1 rounded-lg bg-blue-600 font-bold hover:bg-blue-700 sm:flex-none"
                  >
                    Accept
                  </Button>
                  <Button
                    data-testid={`reject-bid-${b.id}`}
                    onClick={act(rejectBid, b.id, "Bid rejected")}
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-lg border-slate-200 font-bold text-slate-600 sm:flex-none"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(job.proof || (role === "vendor" && myAwarded && job.category === "pasting" && job.status === "in_progress")) && (
        <div className="mt-4">
          {job.proof ? (
            <ProofCard job={job} role={role} onRefresh={onRefresh} />
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              Live proof module active — submit a geo-tagged site photo to trigger payment release.
            </div>
          )}
        </div>
      )}

      {job.category === "design" && job.status !== "open" && (role === "client" || myAwarded) && (
        <div className="mt-4">
          <DesignReviewRoom job={job} role={role} onRefresh={onRefresh} />
        </div>
      )}

      {job.status === "completed" && job.released_amount != null && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          Settled: {inr(job.released_amount)} quoted • Platform fee {inr(job.platform_fee)} • Vendor payout {inr(job.vendor_payout)}
        </div>
      )}

      <ProofSubmitModal job={job} open={proofOpen} onClose={() => setProofOpen(false)} onSubmitted={onRefresh} />
      <BidModal job={job} open={bidOpen} onClose={() => setBidOpen(false)} onSubmitted={onRefresh} />
    </div>
  );
}
