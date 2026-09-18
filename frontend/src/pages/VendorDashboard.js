import { useState } from "react";
import { Store, Search, ClipboardList } from "lucide-react";
import JobCard from "@/components/JobCard";
import WalletWidget from "@/components/WalletWidget";
import ProofSubmitModal from "@/components/ProofSubmitModal";
import { CATEGORIES, CATEGORY_META, BID_STATUS_META, inr, netPayout, platformFee, getVendorName } from "@/lib/api";

function MyBids({ jobs, onRefresh }) {
  const myName = getVendorName().trim().toLowerCase();
  const [proofJob, setProofJob] = useState(null);

  const mine = [];
  jobs.forEach((j) => (j.bids || []).forEach((b) => {
    if (myName && b.vendor_name.trim().toLowerCase() === myName) mine.push({ job: j, bid: b });
  }));

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 font-display text-base font-extrabold text-slate-900">
        <ClipboardList className="h-4 w-4 text-blue-600" /> My Bid Tracker
      </h3>
      <p className="mb-4 text-xs text-slate-500">Live status of every bid you submit.</p>

      {!myName && (
        <p className="rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-400">
          Place your first bid to start tracking it here.
        </p>
      )}

      {myName && mine.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-400">
          No bids yet from “{getVendorName()}”. Bid on jobs from the feed.
        </p>
      )}

      <div className="space-y-2">
        {mine.map(({ job, bid }) => {
          const label =
            bid.status === "accepted"
              ? job.status === "completed" ? "Completed" : "Work In Progress"
              : BID_STATUS_META[bid.status].label;
          const cls =
            bid.status === "accepted"
              ? job.status === "completed" ? BID_STATUS_META.accepted.cls : "bg-emerald-100 text-emerald-800"
              : BID_STATUS_META[bid.status].cls;
          const canProof = bid.status === "accepted" && job.category === "pasting" && job.status === "in_progress";
          return (
            <div key={bid.id} data-testid="my-bid-item" className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold text-slate-900">{job.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>{CATEGORY_META[job.category].label}</span>
                <span className="mono font-bold text-slate-900">{inr(bid.quote)}</span>
              </div>
              <div className="mt-0.5 text-right text-[11px] text-slate-500">
                payout {inr(netPayout(bid.quote))} • fee {inr(platformFee(bid.quote))}
              </div>
              {canProof && (
                <button
                  data-testid={`my-bid-submit-proof-${job.id}`}
                  onClick={() => setProofJob(job)}
                  className="mt-2 w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-slate-900 hover:bg-amber-600"
                >
                  Submit Pasting Proof
                </button>
              )}
            </div>
          );
        })}
      </div>

      <ProofSubmitModal job={proofJob} open={!!proofJob} onClose={() => setProofJob(null)} onSubmitted={onRefresh} />
    </div>
  );
}

export default function VendorDashboard({ jobs, wallet, onRefresh, loading }) {
  const [cat, setCat] = useState("all");
  const [cityQ, setCityQ] = useState("");

  const filtered = jobs.filter(
    (j) =>
      (cat === "all" || j.category === cat) &&
      (!cityQ.trim() || j.city.toLowerCase().includes(cityQ.trim().toLowerCase()))
  );
  const openCount = jobs.filter((j) => j.status === "open").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-slate-900">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Vendor Bidding Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            {openCount} open job{openCount === 1 ? "" : "s"} near you • 75% net payout on every award
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2" data-testid="feed-category-filter">
              <button
                data-testid="feed-filter-all"
                onClick={() => setCat("all")}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  cat === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-blue-300"
                }`}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  data-testid={`feed-filter-${c.id}`}
                  onClick={() => setCat(c.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                    cat === c.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-blue-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="relative sm:ml-auto sm:w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                data-testid="feed-city-search"
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Filter by city"
                value={cityQ}
                onChange={(e) => setCityQ(e.target.value)}
              />
            </div>
          </div>

          {loading && <div className="h-40 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />}

          {!loading && filtered.length === 0 && (
            <div data-testid="feed-empty-state" className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
              <p className="font-display text-lg font-bold text-slate-700">No matching jobs</p>
              <p className="mt-1 text-sm text-slate-500">Try clearing the city filter or picking another category.</p>
            </div>
          )}

          <div className="space-y-5">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} role="vendor" onRefresh={onRefresh} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <WalletWidget wallet={wallet} role="vendor" />
          <MyBids jobs={jobs} onRefresh={onRefresh} />
        </div>
      </div>
    </div>
  );
}
