import { useState } from "react";
import { PenTool, Printer, MapPinned, FileStack, Send } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, createJob, inputCls, fmtDate, OWNER_EMAIL } from "@/lib/api";
import { Button } from "@/components/ui/button";

const ICONS = { design: PenTool, flex: Printer, pasting: MapPinned, offset: FileStack };

export default function PostJobCard({ onPosted }) {
  const [category, setCategory] = useState("design");
  const [title, setTitle] = useState("");
  const [dimension, setDimension] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const defaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      title: title.trim(), category, dimension: dimension.trim(), city: city.trim(),
      pincode: pincode.trim(), budget: Number(budget), deadline: deadline || defaultDeadline(),
      description: description.trim(), client_name: OWNER_EMAIL || "Client / Agency",
    };
    if (!payload.title || !payload.dimension || !payload.city || !payload.pincode || !payload.budget) {
      toast.error("Please fill title, dimension, city, pin code and budget");
      return;
    }
    setBusy(true);
    try {
      const job = await createJob(payload);
      toast.success(`Job posted: ${job.title}`, { description: "Vendors near you can now bid on it" });
      setTitle(""); setDimension(""); setCity(""); setPincode(""); setBudget(""); setDescription(""); setDeadline("");
      onPosted();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to post job");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      data-testid="post-job-form"
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
    >
      <div className="mb-1 font-display text-xl font-extrabold tracking-tight text-slate-900">
        Post a New Job Requirement
      </div>
      <p className="mb-5 text-sm text-slate-500">
        Pick a category, add specs — verified local vendors start bidding within minutes.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="category-pills">
        {CATEGORIES.map((c) => {
          const Icon = ICONS[c.id];
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              data-testid={`category-pill-${c.id}`}
              onClick={() => setCategory(c.id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-all ${
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-amber-400" : "text-blue-600"}`} />
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Job Title</span>
          <input
            data-testid="job-title-input"
            className={inputCls}
            placeholder="e.g. Diwali sale flex banner for storefront"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Dimension / Size
          </span>
          <input
            data-testid="job-dimension-input"
            className={inputCls}
            placeholder="e.g. 10x4 ft"
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Expected Budget (₹)
          </span>
          <input
            data-testid="job-budget-input"
            type="number"
            min="1"
            className={inputCls}
            placeholder="e.g. 2500"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">City</span>
          <input
            data-testid="job-city-input"
            className={inputCls}
            placeholder="e.g. Jaipur"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Pin Code</span>
          <input
            data-testid="job-pincode-input"
            className={inputCls}
            placeholder="e.g. 302001"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Target Deadline
          </span>
          <input
            data-testid="job-deadline-input"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            className={inputCls}
            value={deadline}
            placeholder={fmtDate(defaultDeadline())}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Details (optional)
          </span>
          <input
            data-testid="job-description-input"
            className={inputCls}
            placeholder="e.g. Vinyl 440 GSM, install before 6 PM"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>

      <Button
        type="submit"
        disabled={busy}
        data-testid="post-job-submit-button"
        className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-display text-base font-bold hover:bg-blue-700"
      >
        {busy ? "Posting…" : "Post Job to Marketplace"}
        {!busy && <Send className="ml-2 h-4 w-4" />}
      </Button>
      <p className="mt-3 text-center text-xs text-slate-400">
        Escrow is debited only when you accept a bid — released only after your approval.
      </p>
    </form>
  );
}
