import { useEffect, useState } from "react";
import {
  Users, UserCheck, UserX, MessageSquareWarning, CheckCircle2, Timer, AlertOctagon, IndianRupee,
  ArrowUpRight, ArrowDownRight, TrendingUp, Sparkles,
} from "lucide-react";
import api from "@/lib/apiClient";
import { STATUS, PRIORITY, timeAgo } from "@/lib/format";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";

const CAT_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#F472B6"];

function Kpi({ label, value, delta, icon: Icon, tone = "primary", testId }) {
  const tones = {
    primary: "from-primary/20 to-transparent text-primary",
    success: "from-emerald-500/20 to-transparent text-emerald-400",
    warning: "from-amber-500/20 to-transparent text-amber-400",
    danger: "from-red-500/20 to-transparent text-red-400",
    slate: "from-slate-500/20 to-transparent text-slate-300",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-lift relative overflow-hidden" data-testid={testId}>
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${tones[tone]} blur-2xl opacity-70`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
          <Icon className={`w-4 h-4 ${tones[tone].split(" ").pop()}`} />
        </div>
        <div className="mt-3 font-heading text-3xl font-extrabold tracking-tight">{value}</div>
        {delta != null && (
          <div className={`mt-2 inline-flex items-center gap-1 text-xs ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(delta)}% vs last week
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState({ complaints: [], interactions: [], upcoming: [] });
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([api.get("/dashboard/stats"), api.get("/dashboard/activity")])
      .then(([s, a]) => { setStats(s.data); setActivity(a.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
    );
  }

  const satisfaction = [
    { name: "Promoter", value: 68, fill: "#10B981" },
    { name: "Passive", value: 24, fill: "#F59E0B" },
    { name: "Detractor", value: 8, fill: "#EF4444" },
  ];

  const resolutionData = stats.monthly.map((m, i) => ({ month: m.month, hours: 4 + Math.round(Math.sin(i) * 3 + 5) }));

  return (
    <div className="space-y-6 fade-up">
      {/* Hero */}
      <div className="rounded-3xl border border-border hero-gradient p-6 md:p-8 relative overflow-hidden">
        <div className="grain" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="w-3 h-3" /> Welcome back
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight mt-3">Your command center.</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              {stats.complaints.open + stats.complaints.pending} complaints need attention. Your team's median resolution is <span className="text-white font-semibold">{stats.avg_resolution_hours}h</span>.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => nav("/complaints")} className="rounded-xl bg-white/[0.06] border border-border px-4 py-2 text-sm hover:border-primary/50 transition" data-testid="dashboard-view-complaints">View Complaints</button>
            <button onClick={() => nav("/customers")} className="rounded-xl bg-primary hover:bg-blue-500 px-4 py-2 text-sm font-medium transition" data-testid="dashboard-view-customers">Manage Customers</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Customers" value={stats.customers.total} delta={12} icon={Users} tone="primary" testId="kpi-total-customers" />
        <Kpi label="Active" value={stats.customers.active} delta={5} icon={UserCheck} tone="success" testId="kpi-active" />
        <Kpi label="Inactive" value={stats.customers.inactive} delta={-3} icon={UserX} tone="slate" testId="kpi-inactive" />
        <Kpi label="VIP" value={stats.customers.vip} delta={8} icon={Sparkles} tone="warning" testId="kpi-vip" />
        <Kpi label="Open Complaints" value={stats.complaints.open} delta={-2} icon={MessageSquareWarning} tone="primary" testId="kpi-open" />
        <Kpi label="Pending" value={stats.complaints.pending} delta={4} icon={Timer} tone="warning" testId="kpi-pending" />
        <Kpi label="Resolved" value={stats.complaints.resolved} delta={9} icon={CheckCircle2} tone="success" testId="kpi-resolved" />
        <Kpi label="Critical" value={stats.complaints.critical} delta={-1} icon={AlertOctagon} tone="danger" testId="kpi-critical" />
      </div>

      {/* Revenue + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-lg">Customer & complaint trend</h3>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Customers</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Complaints</span>
            </div>
          </div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthly} margin={{ left: -10, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="gCust" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563EB" stopOpacity={0.5} /><stop offset="1" stopColor="#2563EB" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gComp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F59E0B" stopOpacity={0.4} /><stop offset="1" stopColor="#F59E0B" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #1e293b", borderRadius: 12 }} />
                <Area type="monotone" dataKey="customers" stroke="#2563EB" fill="url(#gCust)" strokeWidth={2} />
                <Area type="monotone" dataKey="complaints" stroke="#F59E0B" fill="url(#gComp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-heading font-bold text-lg">Complaint categories</h3>
          <p className="text-xs text-muted-foreground">Distribution</p>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.categories} dataKey="count" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {stats.categories.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #1e293b", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {stats.categories.map((c, i) => (
              <div key={c.category} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                <span className="text-muted-foreground">{c.category}</span>
                <span className="ml-auto font-mono">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-lg">Monthly revenue</h3>
              <p className="text-xs text-muted-foreground">Placeholder metric</p>
            </div>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 font-heading text-3xl font-extrabold">₹{stats.revenue_placeholder.toLocaleString()}</div>
          <div className="inline-flex items-center gap-1 text-xs text-emerald-400 mt-1"><TrendingUp className="w-3 h-3" /> +18.2% vs last month</div>
          <div className="h-32 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthly}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #1e293b", borderRadius: 12 }} cursor={{ fill: "#1e293b40" }} />
                <Bar dataKey="customers" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-heading font-bold text-lg">Customer satisfaction</h3>
          <p className="text-xs text-muted-foreground">CSAT breakdown • {stats.csat}%</p>
          <div className="h-40 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={satisfaction} dataKey="value" innerRadius={40} outerRadius={65}>
                  {satisfaction.map((s, i) => <Cell key={i} fill={s.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #1e293b", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-xs text-muted-foreground">
            {satisfaction.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: s.fill }} />{s.name}</div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-heading font-bold text-lg">Avg resolution time</h3>
          <p className="text-xs text-muted-foreground">Hours per complaint</p>
          <div className="h-40 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={resolutionData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid #1e293b", borderRadius: 12 }} />
                <Line type="monotone" dataKey="hours" stroke="#2563EB" strokeWidth={2} dot={{ fill: "#2563EB" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-lg">Recent complaints</h3>
            <button onClick={() => nav("/complaints")} className="text-xs text-primary hover:underline">View all →</button>
          </div>
          <div className="space-y-2">
            {activity.complaints.map((c) => {
              const s = STATUS[c.status]; const p = PRIORITY[c.priority];
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-white/[0.03] transition">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.subject}</div>
                    <div className="text-xs text-muted-foreground">{timeAgo(c.created_at)} • {c.category}</div>
                  </div>
                  <span className={`chip border ${p.color}`}><span className={`dot ${p.dot}`} />{p.label}</span>
                  <span className={`chip border ${s.color}`}><span className={`dot ${s.dot}`} />{s.label}</span>
                </div>
              );
            })}
            {activity.complaints.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No recent complaints.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-heading font-bold text-lg mb-4">Upcoming follow-ups</h3>
          <div className="space-y-3">
            {activity.upcoming.slice(0, 5).map((i) => (
              <div key={i.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold capitalize">{i.kind[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{i.summary}</div>
                  <div className="text-xs text-muted-foreground capitalize">{i.kind} • {timeAgo(i.created_at)}</div>
                </div>
              </div>
            ))}
            {activity.upcoming.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Nothing on the horizon.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
