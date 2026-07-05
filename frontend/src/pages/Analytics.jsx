import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const PALETTE = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#F472B6"];

export default function Analytics() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/dashboard/stats").then((r) => setStats(r.data)); }, []);
  if (!stats) return <div className="grid grid-cols-4 gap-4">{Array(8).fill(0).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>;

  // Fake heatmap grid (weeks x days)
  const heat = Array.from({ length: 7 }, (_, r) => Array.from({ length: 24 }, (_, c) => Math.round(Math.abs(Math.sin(r * c + 2)) * 100)));

  return (
    <div className="space-y-6 fade-up">
      <div><h1 className="font-heading text-3xl font-extrabold tracking-tight">Analytics</h1><p className="text-sm text-muted-foreground">Deep dive into performance and trends</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Customer growth" subtitle="Last 6 months">
          <div className="h-72"><ResponsiveContainer><AreaChart data={stats.monthly}>
            <defs><linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563EB" stopOpacity={0.6}/><stop offset="1" stopColor="#2563EB" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{background:"#0F172A",border:"1px solid #1e293b",borderRadius:12}} />
            <Area dataKey="customers" stroke="#2563EB" fill="url(#a1)" strokeWidth={2} />
          </AreaChart></ResponsiveContainer></div>
        </Card>

        <Card title="Complaint categories" subtitle="Distribution">
          <div className="h-72"><ResponsiveContainer><PieChart><Pie data={stats.categories} dataKey="count" nameKey="category" innerRadius={60} outerRadius={100} paddingAngle={3}>
            {stats.categories.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie><Tooltip contentStyle={{background:"#0F172A",border:"1px solid #1e293b",borderRadius:12}} /></PieChart></ResponsiveContainer></div>
        </Card>

        <Card title="Complaint volume vs resolution" subtitle="Bar + line">
          <div className="h-72"><ResponsiveContainer><BarChart data={stats.monthly.map((m,i)=>({...m, resolution: 4 + Math.round(Math.sin(i)*3+5)}))}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{background:"#0F172A",border:"1px solid #1e293b",borderRadius:12}} cursor={{fill:"#1e293b40"}} />
            <Bar dataKey="complaints" fill="#F59E0B" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div>
        </Card>

        <Card title="Avg resolution time" subtitle="Trend (hours)">
          <div className="h-72"><ResponsiveContainer><LineChart data={stats.monthly.map((m,i)=>({month: m.month, hours: 4+Math.round(Math.sin(i)*3+5)}))}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="#64748b" fontSize={12} /><YAxis stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{background:"#0F172A",border:"1px solid #1e293b",borderRadius:12}} />
            <Line type="monotone" dataKey="hours" stroke="#10B981" strokeWidth={2} dot={{fill:"#10B981"}} />
          </LineChart></ResponsiveContainer></div>
        </Card>
      </div>

      <Card title="Complaint activity heatmap" subtitle="7 days × 24 hours">
        <div className="mt-4 grid gap-1" style={{ gridTemplateColumns: "auto repeat(24, minmax(0, 1fr))" }}>
          <div />
          {Array.from({ length: 24 }, (_, i) => <div key={i} className="text-[9px] text-muted-foreground text-center">{i}</div>)}
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, r) => (
            <>
              <div key={d} className="text-[10px] text-muted-foreground pr-2 self-center">{d}</div>
              {heat[r].map((v, c) => (
                <div key={c} className="aspect-square rounded-[3px] border border-border/40" style={{ background: `hsl(220 90% 55% / ${v / 100})` }} title={`${v}%`} />
              ))}
            </>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between"><div><h3 className="font-heading font-bold text-lg">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></div></div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
