import { useState, useEffect, useRef } from "react";
import { Bell, Printer, ShieldCheck, CheckCheck } from "lucide-react";
import { fmtDateTime } from "@/lib/api";

function Pill({ active, children, onClick, testid }) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
        active ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

export default function Header({ role, setRole, notifications, onMarkRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = Array.isArray(notifications)
  ? notifications.filter((n) => !n.read).length
  : 0;

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 shadow-sm">
            <Printer className="h-5 w-5 text-slate-900" strokeWidth={2.4} />
          </div>
          <div className="min-w-0" data-testid="header-logo">
            <div className="font-display text-lg font-extrabold leading-tight tracking-tight text-slate-900">
              PrintSeva
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              25% Escrow Protected
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            data-testid="role-switcher"
            className="flex items-center rounded-full border border-slate-200 bg-slate-100 p-1"
          >
            <Pill testid="role-switcher-client" active={role === "client"} onClick={() => setRole("client")}>
              Client Mode
            </Pill>
            <Pill testid="role-switcher-vendor" active={role === "vendor"} onClick={() => setRole("vendor")}>
              Vendor Mode
            </Pill>
          </div>

          <div className="relative" ref={ref}>
            <button
              data-testid="notification-bell"
              onClick={() => setOpen((o) => !o)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span
                  data-testid="notification-count"
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900"
                >
                  {unread}
                </span>
              )}
            </button>

            {open && (
              <div
                data-testid="notification-panel"
                className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-fade-up"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <span className="font-display text-sm font-bold text-slate-900">Notifications</span>
                  {notifications.length > 0 && (
                    <button
                      data-testid="mark-notifications-read"
                      onClick={onMarkRead}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</div>
                  )}
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      data-testid="notification-item"
                      className={`border-b border-slate-50 px-4 py-3 ${!n.read ? "bg-blue-50/50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">{n.title}</span>
                        {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        {fmtDateTime(n.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
