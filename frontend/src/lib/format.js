export const PRIORITY = {
  low: { label: "Low", color: "bg-slate-500/15 text-slate-300 border-slate-500/30", dot: "bg-slate-400" },
  medium: { label: "Medium", color: "bg-blue-500/15 text-blue-300 border-blue-500/30", dot: "bg-blue-400" },
  high: { label: "High", color: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  critical: { label: "Critical", color: "bg-red-500/15 text-red-300 border-red-500/30", dot: "bg-red-500" },
};

export const STATUS = {
  open: { label: "Open", color: "bg-blue-500/15 text-blue-300 border-blue-500/30", dot: "bg-blue-400" },
  pending: { label: "Pending", color: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  in_progress: { label: "In Progress", color: "bg-violet-500/15 text-violet-300 border-violet-500/30", dot: "bg-violet-400" },
  resolved: { label: "Resolved", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  closed: { label: "Closed", color: "bg-slate-500/15 text-slate-300 border-slate-500/30", dot: "bg-slate-400" },
};

export const CUSTOMER_STATUS = {
  active: { label: "Active", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  inactive: { label: "Inactive", color: "bg-slate-500/15 text-slate-300 border-slate-500/30", dot: "bg-slate-400" },
  vip: { label: "VIP", color: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
};

export function Chip({ tone = "default", children, className = "" }) {
  const map = tone.color ? tone : { color: "bg-slate-500/15 text-slate-300 border-slate-500/30", dot: "bg-slate-400" };
  return (
    <span className={`chip border ${map.color} ${className}`}>
      <span className={`dot ${map.dot}`} />
      {children}
    </span>
  );
}

export function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd}d ago`;
  const mo = Math.floor(dd / 30);
  return `${mo}mo ago`;
}
