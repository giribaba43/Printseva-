import { ShieldCheck, Droplets, MapPin } from "lucide-react";

export default function TrustBanner() {
  const items = [
    { icon: ShieldCheck, label: "Safe Escrow Protection", sub: "Payment held until you approve the work" },
    { icon: Droplets, label: "Auto-Watermarked Drafts", sub: "Every draft carries a PrintSeva watermark" },
    { icon: MapPin, label: "Verified GPS Pasting Proofs", sub: "Geo-tagged + timestamped site evidence" },
  ];
  return (
    <footer data-testid="trust-banner" className="mt-12 bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {items.map((i) => {
            const Icon = i.icon;
            return (
              <div key={i.label} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-white">{i.label}</div>
                  <div className="text-xs text-slate-400">{i.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <span>PrintSeva — Hyperlocal Print & Installation Marketplace</span>
          <span>25% platform commission funds escrow insurance & dispute support</span>
        </div>
      </div>
    </footer>
  );
}
