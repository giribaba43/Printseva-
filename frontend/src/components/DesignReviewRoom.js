import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck, Bell, CheckCircle2, Circle, Download, Factory, FileImage, Lock,
  Upload, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fileUrl, inr, uploadDesignVersion, addDesignPin, setPinStatus,
  approveDesign, forwardToPress, fmtDateTime, inputCls,
} from "@/lib/api";

const WATERMARK = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='460' height='340'><text x='230' y='178' transform='rotate(-24 230 170)' text-anchor='middle' font-family='Arial, sans-serif' font-size='24' font-weight='700' fill='rgba(255,255,255,0.30)' stroke='rgba(15,23,42,0.22)' stroke-width='0.6'>PRINTSEVA PREVIEW - DO NOT PRINT</text></svg>`
)}`;

function UploadBox({ file, setFile, onUpload, busy, nextVersion }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="design-upload-box">
      <div className="mb-1 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
        <Upload className="h-4 w-4 text-amber-600" /> Upload Draft {nextVersion}
      </div>
      <p className="mb-3 text-[11px] text-slate-500">
        JPG or PNG, max 10 MB. Clients see a watermarked preview — originals unlock only after approval.
      </p>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-amber-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:border-amber-400">
        <FileImage className="h-4 w-4 text-amber-600" /> {file ? file.name : "Choose design file (JPG / PNG)"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          data-testid="design-file-input"
          className="hidden"
          onChange={(e) => setFile(e.target.files[0] || null)}
        />
      </label>
      <Button
        data-testid="design-upload-button"
        onClick={onUpload}
        disabled={busy || !file}
        className="mt-2 w-full rounded-lg bg-amber-500 font-bold text-slate-900 hover:bg-amber-600"
        size="sm"
      >
        {busy ? "Uploading…" : `Upload ${nextVersion}`}
      </Button>
    </div>
  );
}

export default function DesignReviewRoom({ job, role, onRefresh }) {
  const design = job.design || { versions: [], pins: [], approved: false, forwarded_to_press: false };
  const versions = design.versions || [];
  const pins = design.pins || [];
  const approved = design.approved;

  const [viewIdx, setViewIdx] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [draftPin, setDraftPin] = useState(null);
  const [pinComment, setPinComment] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const commentRef = useRef(null);

  useEffect(() => {
    if (draftPin && commentRef.current) commentRef.current.focus();
  }, [draftPin]);

  const idx = viewIdx == null ? versions.length - 1 : Math.min(viewIdx, versions.length - 1);
  const cur = versions[idx] || null;
  const finalVersion = versions[versions.length - 1];

  const vLabel = (i) => (i === versions.length - 1 && versions.length > 1 ? "Final" : `V${versions[i].version_no}`);
  const verLabelById = (vid) => {
    const i = versions.findIndex((v) => v.id === vid);
    return i < 0 ? "V?" : vLabel(i);
  };

  const dropPin = (e) => {
    if (role !== "client" || approved || !cur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDraftPin({
      x_pct: Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10,
      y_pct: Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10,
    });
  };

  const savePin = async () => {
    if (!pinComment.trim()) {
      toast.error("Type the feedback comment for this pin");
      return;
    }
    setBusy(true);
    try {
      await addDesignPin(job.id, {
        version_id: cur.id, x_pct: draftPin.x_pct, y_pct: draftPin.y_pct, comment: pinComment.trim(),
      });
      toast.success(`Pin #${pins.length + 1} sent to the designer`);
      setDraftPin(null);
      setPinComment("");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add pin");
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (pin) => {
    const next = pin.status === "pending" ? "resolved" : "pending";
    try {
      await setPinStatus(job.id, pin.id, next);
      toast.success(next === "resolved" ? "Pin marked resolved" : "Pin reopened");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update pin");
    }
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadDesignVersion(job.id, file);
      toast.success(`Draft V${versions.length + 1} uploaded`, { description: "Client notified for review" });
      setFile(null);
      setViewIdx(versions.length);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const doApprove = async () => {
    setBusy(true);
    try {
      const r = await approveDesign(job.id);
      toast.success(`Payment settled: ${inr(r.released_amount)}`, {
        description: `Platform fee ${inr(r.platform_fee)} • Designer payout ${inr(r.vendor_payout)}`,
      });
      setApproveOpen(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Approval failed");
    } finally {
      setBusy(false);
    }
  };

  const doForward = async () => {
    setBusy(true);
    try {
      await forwardToPress(job.id);
      toast.success("Design forwarded to the printing press for production");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Forward failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="design-review-room" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="font-display text-base font-extrabold text-slate-900">Design Review Room</div>
        {approved ? (
          <span data-testid="room-status" className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">Approved & Settled</span>
        ) : versions.length ? (
          <span data-testid="room-status" className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
            Review in progress • {pins.filter((p) => p.status === "pending").length} pending pin(s)
          </span>
        ) : (
          <span data-testid="room-status" className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">Awaiting first draft</span>
        )}
      </div>

      {!versions.length ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center lg:col-span-2" data-testid="design-empty-state">
            <Lock className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 font-display font-bold text-slate-700">No draft uploaded yet</p>
            <p className="text-sm text-slate-500">
              {role === "client"
                ? "The awarded designer will upload draft V1 here — you'll review it with watermark protection."
                : "Upload draft V1 to open the interactive review room."}
            </p>
            {role === "client" && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                <Bell className="h-3.5 w-3.5" /> You'll get a notification the moment a draft arrives
              </p>
            )}
          </div>
          {role === "vendor" && <UploadBox file={file} setFile={setFile} onUpload={upload} busy={busy} nextVersion="V1" />}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div data-testid="version-switcher" className="flex rounded-lg border border-slate-200 bg-white p-1">
                {versions.map((v, i) => (
                  <button
                    key={v.id}
                    data-testid={`version-tab-${i + 1}`}
                    onClick={() => setViewIdx(i)}
                    className={`rounded-md px-3 py-1 text-xs font-bold transition ${i === idx ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {vLabel(i)}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                <button data-testid="design-zoom-out" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="rounded p-1.5 hover:bg-slate-100">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span data-testid="zoom-level" className="mono w-10 text-center text-xs font-bold">{Math.round(zoom * 100)}%</span>
                <button data-testid="design-zoom-in" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} className="rounded p-1.5 hover:bg-slate-100">
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div data-testid="proof-viewer" className="max-h-[560px] overflow-auto rounded-xl border border-slate-200 bg-slate-100">
              <div className="relative inline-block min-w-full cursor-crosshair" onClick={dropPin}>
                <img
                  src={fileUrl(cur.url)}
                  alt={`Draft V${cur.version_no}`}
                  data-testid="design-canvas"
                  className="block"
                  style={{ width: `${zoom * 100}%` }}
                />
                <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: WATERMARK }} data-testid="watermark-overlay" />
                {pins.map((p, i) => p.version_id === cur.id && (
                  <div
                    key={p.id}
                    data-testid={`pin-marker-${p.id}`}
                    className={`pointer-events-none absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 border-white text-[10px] font-extrabold text-white shadow ${p.status === "resolved" ? "bg-emerald-500" : "bg-red-600"}`}
                    style={{ left: `${p.x_pct}%`, top: `${p.y_pct}%` }}
                  >
                    {i + 1}
                  </div>
                ))}
                {draftPin && (
                  <div
                    className="pulse-dot pointer-events-none absolute z-10 h-8 w-8 -translate-x-1/2 -translate-y-full rounded-full border-2 border-dashed border-red-500"
                    style={{ left: `${draftPin.x_pct}%`, top: `${draftPin.y_pct}%` }}
                  />
                )}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400" data-testid="viewer-hint">
              {role === "client" && !approved
                ? "Click anywhere on the design to drop a red feedback pin."
                : "Watermarked preview — original print files unlock after client approval."}
            </p>
          </div>

          <div className="space-y-4">
            {role === "vendor" && !approved && (
              <UploadBox file={file} setFile={setFile} onUpload={upload} busy={busy} nextVersion={`V${versions.length + 1}`} />
            )}

            {role === "client" && !approved && draftPin && (
              <div className="animate-fade-up rounded-xl border border-red-200 bg-white p-3" data-testid="pin-comment-box">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-red-600">Pin #{pins.length + 1} — describe the change</span>
                  <button onClick={() => setDraftPin(null)} data-testid="pin-cancel-button" className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input
                  ref={commentRef}
                  data-testid="pin-comment-input"
                  className={inputCls}
                  placeholder='e.g. "Change contact number to 98123xxxxx"'
                  value={pinComment}
                  onChange={(e) => setPinComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && savePin()}
                />
                <Button data-testid="pin-save-button" onClick={savePin} disabled={busy} size="sm" className="mt-2 w-full rounded-lg bg-red-600 font-bold hover:bg-red-700">
                  Add Pin
                </Button>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-3" data-testid="pins-panel">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-sm font-bold text-slate-900">Feedback Pins</span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {pins.filter((p) => p.status === "resolved").length}/{pins.length} resolved
                </span>
              </div>
              {pins.length === 0 && (
                <p className="p-2 text-xs text-slate-400">
                  {role === "client" ? "No pins yet — click on the design to add your first." : "Client feedback pins will appear here."}
                </p>
              )}
              <div className="space-y-2">
                {pins.map((p, i) => (
                  <div
                    key={p.id}
                    data-testid={`pin-item-${p.id}`}
                    className={`rounded-lg border p-2.5 ${p.status === "resolved" ? "border-emerald-100 bg-emerald-50/60" : "border-slate-100 bg-slate-50"}`}
                  >
                    <div className="flex items-start gap-2">
                      <button data-testid={`pin-toggle-${p.id}`} onClick={() => togglePin(p)} title="Toggle resolved / pending">
                        {p.status === "resolved" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-red-500" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900">
                          Pin #{i + 1}
                          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            on {verLabelById(p.version_id)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">{p.comment}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {p.status === "resolved" ? "Resolved" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {role === "client" && !approved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" data-testid="approval-box">
                <div className="mb-1 flex items-center gap-2 font-display text-sm font-bold text-emerald-800">
                  <BadgeCheck className="h-4 w-4" /> Happy with the design?
                </div>
                <p className="mb-3 text-[11px] text-emerald-700">
                  Approval settles 75% to the designer (25% platform fee) and unlocks high-resolution print files.
                </p>
                <Button
                  data-testid="approve-final-design-button"
                  onClick={() => setApproveOpen(true)}
                  className="w-full rounded-xl bg-emerald-600 py-3 font-display font-bold hover:bg-emerald-700"
                >
                  Approve Final Design
                </Button>
              </div>
            )}

            {approved && (
              <div className="rounded-xl border border-emerald-200 bg-white p-4" data-testid="post-approval-panel">
                <div className="mb-1 flex items-center gap-2 font-display text-sm font-bold text-emerald-700">
                  <BadgeCheck className="h-4 w-4" /> Approved {fmtDateTime(design.approved_at)}
                </div>
                <p className="mb-3 text-[11px] text-slate-500">
                  Original high-resolution print files unlocked. Payment settled to the designer.
                </p>
                <div className="space-y-2">
                  <a
                    data-testid="download-print-files-button"
                    href={`${fileUrl(`/api/files/${finalVersion.storage_path}`)}?download=1`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-center text-sm font-bold text-white hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" /> Download Original Print Files (CDR / High-Res PDF)
                  </a>
                  {design.forwarded_to_press ? (
                    <div data-testid="forwarded-press-chip" className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-bold text-emerald-700">
                      <Factory className="h-4 w-4" /> Forwarded to press {fmtDateTime(design.forwarded_at)}
                    </div>
                  ) : (
                    <Button
                      data-testid="forward-press-button"
                      onClick={doForward}
                      disabled={busy}
                      className="w-full rounded-xl bg-slate-900 py-2.5 font-bold hover:bg-slate-800"
                    >
                      <Factory className="mr-2 h-4 w-4" /> Forward Directly to Printing Press for Production
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {approveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setApproveOpen(false)} data-testid="approve-modal-overlay">
          <div data-testid="approve-modal" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-up">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-display text-lg font-extrabold text-slate-900">Approve Final Design?</div>
              <button onClick={() => setApproveOpen(false)} className="text-slate-400 hover:text-slate-600" data-testid="approve-modal-close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p data-testid="approve-modal-text" className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              Once approved, payment will be settled to the designer and original high-resolution print files will be unlocked.
            </p>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" data-testid="approve-cancel-button" onClick={() => setApproveOpen(false)} className="flex-1 rounded-xl border-slate-200 font-bold text-slate-600">
                Cancel
              </Button>
              <Button data-testid="approve-confirm-button" onClick={doApprove} disabled={busy} className="flex-1 rounded-xl bg-emerald-600 font-bold hover:bg-emerald-700">
                Yes, Approve & Settle
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
