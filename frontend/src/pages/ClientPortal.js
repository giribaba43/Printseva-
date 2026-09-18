import { Megaphone, Inbox } from "lucide-react";
import PostJobCard from "@/components/PostJobCard";
import JobCard from "@/components/JobCard";
import WalletWidget from "@/components/WalletWidget";

export default function ClientPortal({ jobs, wallet, onRefresh, loading }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Client / Agency Portal
          </h1>
          <p className="text-sm text-slate-500">Post requirements, review local bids, pay via protected escrow.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PostJobCard onPosted={onRefresh} />
        </div>
        <div>
          <WalletWidget wallet={wallet} role="client" />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-slate-900">
          <Inbox className="h-5 w-5 text-blue-600" /> Your Posted Jobs
          <span data-testid="client-job-count" className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            {jobs.length}
          </span>
        </h2>

        {loading && <div className="h-24 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />}

        {!loading && jobs.length === 0 && (
          <div data-testid="client-empty-state" className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <p className="font-display text-lg font-bold text-slate-700">No jobs posted yet</p>
            <p className="mt-1 text-sm text-slate-500">Use the form above to post your first requirement — it takes under a minute.</p>
          </div>
        )}

        <div className="space-y-5">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} role="client" onRefresh={onRefresh} />
          ))}
        </div>
      </div>
    </div>
  );
}
