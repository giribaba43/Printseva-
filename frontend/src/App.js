import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import TrustBanner from "@/components/TrustBanner";
import ClientPortal from "@/pages/ClientPortal";
import VendorDashboard from "@/pages/VendorDashboard";
import { fetchAllJobs, fetchWallet, fetchNotifications, markNotificationsRead } from "@/lib/api";

export default function App() {
  const [role, setRole] = useState("client");
  const [jobs, setJobs] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [j, w, n] = await Promise.all([fetchAllJobs(), fetchWallet(), fetchNotifications()]);
      setJobs(j);
      setWallet(w);
      setNotifications(n);
    } catch (e) {
      console.error("Refresh failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 25000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleMarkRead = useCallback(async () => {
    await markNotificationsRead();
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header role={role} setRole={setRole} notifications={notifications} onMarkRead={handleMarkRead} />
      <main>
        {role === "client" ? (
          <ClientPortal jobs={jobs} wallet={wallet} onRefresh={refresh} loading={loading} />
        ) : (
          <VendorDashboard jobs={jobs} wallet={wallet} onRefresh={refresh} loading={loading} />
        )}
      </main>
      <TrustBanner />
      <Toaster position="top-center" richColors />
    </div>
  );
}
