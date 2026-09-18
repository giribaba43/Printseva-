import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export const CATEGORIES = [
  { id: "design", label: "Graphic Design" },
  { id: "flex", label: "Flex / Banner Printing" },
  { id: "pasting", label: "Pasting / Installation" },
  { id: "offset", label: "Offset / Bill Book" },
];

export const CATEGORY_META = {
  design: { label: "Graphic Design", badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-600" },
  flex: { label: "Flex / Banner Printing", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  pasting: { label: "Pasting / Installation", badge: "bg-slate-900 text-white border-slate-900", dot: "bg-slate-900" },
  offset: { label: "Offset / Bill Book", badge: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-600" },
};

export const STATUS_META = {
  open: { label: "Open for Bids", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "Work In Progress", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  proof_submitted: { label: "Proof Submitted", cls: "bg-slate-900 text-white border-slate-900" },
  completed: { label: "Completed & Paid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export const BID_STATUS_META = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
  accepted: { label: "Accepted", cls: "bg-blue-600 text-white" },
  rejected: { label: "Rejected", cls: "bg-slate-100 text-slate-500" },
};

export const VENDOR_TYPES = [
  { id: "designer", label: "Designer Studio" },
  { id: "press", label: "Printing Press" },
  { id: "pasting", label: "Pasting / Installation Team" },
  { id: "offset", label: "Offset Printer" },
];

export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
export const platformFee = (q) => Math.round((Number(q) || 0) * 0.25);
export const netPayout = (q) => Math.max((Number(q) || 0) - platformFee(q), 0);

export const getVendorName = () => localStorage.getItem("printseva_vendor") || "";
export const setVendorName = (n) => localStorage.setItem("printseva_vendor", n);

export const fetchAllJobs = async () => (await axios.get(`${API}/jobs`)).data;
export const createJob = async (payload) => (await axios.post(`${API}/jobs`, payload)).data;
export const placeBid = async (jobId, payload) => (await axios.post(`${API}/jobs/${jobId}/bids`, payload)).data;
export const acceptBid = async (jobId, bidId) => (await axios.post(`${API}/jobs/${jobId}/bids/${bidId}/accept`)).data;
export const rejectBid = async (jobId, bidId) => (await axios.post(`${API}/jobs/${jobId}/bids/${bidId}/reject`)).data;
export const submitProof = async (jobId, payload) => (await axios.post(`${API}/jobs/${jobId}/proof`, payload)).data;
export const verifyJob = async (jobId) => (await axios.post(`${API}/jobs/${jobId}/verify`)).data;
export const fetchWallet = async () => (await axios.get(`${API}/wallet`)).data;
export const fetchNotifications = async () => (await axios.get(`${API}/notifications`)).data;
export const markNotificationsRead = async () => (await axios.post(`${API}/notifications/read`)).data;

const CITY_COORDS = {
  jaipur: [26.9124, 75.7873], delhi: [28.6139, 77.209], "new delhi": [28.6139, 77.209],
  mumbai: [19.076, 72.8777], pune: [18.5204, 73.8567], ahmedabad: [23.0225, 72.5714],
  surat: [21.1702, 72.8311], indore: [22.7196, 75.8577], lucknow: [26.8467, 80.9462],
  bengaluru: [12.9716, 77.5946], bangalore: [12.9716, 77.5946], hyderabad: [17.385, 78.4867],
  kolkata: [22.5726, 88.3639], chennai: [13.0827, 80.2707], nagpur: [21.1458, 79.0882],
};

export function mockGeo(city) {
  const key = (city || "").trim().toLowerCase();
  const base = CITY_COORDS[key] || [23.2599, 77.4126];
  const jitter = () => (Math.random() - 0.5) * 0.02;
  const areas = ["Main Market Road", "Station Road", "Ring Road Junction", "Bus Stand Marg", "Industrial Area Phase 2", "GT Road"];
  return {
    lat: Number((base[0] + jitter()).toFixed(6)),
    lng: Number((base[1] + jitter()).toFixed(6)),
    address: `${areas[Math.floor(Math.random() * areas.length)]}, ${city}`,
  };
}

export const PROOF_PHOTOS = [
  "https://images.unsplash.com/photo-1639054515827-41fb52f3058d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHxiaWxsYm9hcmQlMjBpbnN0YWxsYXRpb24lMjBwYXN0aW5nJTIwY2l0eSUyMHN0cmVldHxlbnwwfHx8fDE3ODk2NjI2MjJ8MA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1603712482537-3d4bd4b04572?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwyfHx3b3JrZXIlMjBpbnN0YWxsaW5nJTIwYmlsbGJvYXJkJTIwc3RyZWV0fGVufDB8fHx8MTc4OTY2MjYzOHww&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1763256552751-db613582fb2c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwxfHx3b3JrZXIlMjBpbnN0YWxsaW5nJTIwYmlsbGJvYXJkJTIwc3RyZWV0fGVufDB8fHx8MTc4OTY2MjYzOHww&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1693031630369-bd429a57f115?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHwyfHxwcmludGluZyUyMHByZXNzJTIwYmFubmVyJTIwcHJpbnRpbmclMjBtYWNoaW5lfGVufDB8fHx8MTc4OTY2MjYzOHww&ixlib=rb-4.1.0&q=85",
];

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export function pseudoDistance(job) {
  const s = `${job.city || ""}${job.title || ""}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `${3 + (h % 34)} km`;
}

export const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const fileUrl = (rel) => `${BACKEND}${rel}`;
export const OWNER_EMAIL = process.env.REACT_APP_OWNER_EMAIL || "";

export const uploadDesignVersion = async (jobId, file) => {
  const fd = new FormData();
  fd.append("file", file);
  return (await axios.post(`${API}/jobs/${jobId}/design/versions`, fd)).data;
};
export const addDesignPin = async (jobId, payload) => (await axios.post(`${API}/jobs/${jobId}/design/pins`, payload)).data;
export const setPinStatus = async (jobId, pinId, status) => (await axios.patch(`${API}/jobs/${jobId}/design/pins/${pinId}`, { status })).data;
export const approveDesign = async (jobId) => (await axios.post(`${API}/jobs/${jobId}/design/approve`)).data;
export const forwardToPress = async (jobId) => (await axios.post(`${API}/jobs/${jobId}/design/forward-press`)).data;
