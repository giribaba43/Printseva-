import { Lock, Percent, Wallet } from "lucide-react";

export default function WalletWidget({ wallet, role }) {
  if (!wallet) {
    return <div data-testid="wallet-widget-loading" className="h-64 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />;
  }

  const stats = [
    {
      id: "stat-escrow-balance",
      icon: Lock,
      iconCls: "bg-blue-50 text-blue-600",
      label: "Total Escrow Protected",
      value: wallet.escrow_balance,
      sub: `${wallet.escrow_count} active job${wallet.escrow_count === 1 ? "" : "s"} held securely`,
    },
    {
      id: "stat-platform-fees",
      icon: Percent,
      iconCls: "bg-amber-50 text-amber-600",
      label: "Platform 25% Cut Record",
      value: wallet.platform_fees,
      sub: `from ${wallet.completed_jobs} settled job${wallet.completed_jobs === 1 ? "" : "s"}`,
    },
    {
      id: "stat-withdrawable",
      icon: Wallet,
      iconCls: "bg-emerald-50 text-emerald-600",
      label: "Ready to Withdraw",
      value: wallet.vendor_payouts,
      sub: "75% net payouts credited to vendors",
    },
  ];

  const emphasis = role === "client" ? "stat-escrow-balance" : "stat-withdrawable";
  const settled = wallet.released_total || 0;

  return (
    <div data-testid="wallet-widget" className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-1 font-display text-lg font-extrabold tracking-tight text-slate-900">
        {role === "client" ? "Escrow Summary" : "Wallet & Payouts"}
      </div>
      <p className="mb-5 text-xs text-slate-500">
        {role === "client"
          ? "Funds are debited on bid acceptance and released only on your approval."
          : "Track your 75% net payouts and the platform's 25% commission record."}
      </p>

      <div className="space-y-3">
        {stats.map((s) => {
          const Icon = s.icon;
          const hot = s.id === emphasis;
          return (
            <div
              key={s.id}
              data-testid={s.id}
              className={`flex items-center gap-4 rounded-xl border p-4 transition ${
                hot ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50"
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${hot ? "bg-amber-400 text-slate-900" : s.iconCls}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className={`text-[11px] font-bold uppercase tracking-wide ${hot ? "text-amber-400" : "text-slate-400"}`}>
                  {s.label}
                </div>
                <div className="mono text-xl font-extrabold leading-tight">
                  ₹{(s.value / 1).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
                <div className={`text-[11px] ${hot ? "text-slate-300" : "text-slate-500"}`}>{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {settled > 0 && (
        <div className="mt-4" data-testid="commission-split">
          <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-500">
            <span>Vendor 75%</span>
            <span>Platform 25%</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-blue-600" style={{ width: "75%" }} />
            <div className="h-full bg-amber-400" style={{ width: "25%" }} />
          </div>
        </div>
      )}
    </div>
  );
}
