import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PRIORITY, STATUS, timeAgo } from "@/lib/format";

export default function Tickets() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/tickets").then((r) => setItems(r.data)).finally(() => setLoading(false)); }, []);

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Support Tickets</h1>
        <p className="text-sm text-muted-foreground">{items.length} tickets across all channels</p>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-xs text-muted-foreground uppercase tracking-wider">
              <tr><th className="p-3 text-left">Title</th><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Channel</th><th className="p-3 text-left">Priority</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Created</th></tr>
            </thead>
            <tbody>
              {loading && Array(6).fill(0).map((_, i) => <tr key={i} className="border-t border-border"><td colSpan={6} className="p-3"><div className="skeleton h-8 rounded-lg" /></td></tr>)}
              {!loading && items.map((t) => {
                const p = PRIORITY[t.priority]; const s = STATUS[t.status];
                return (
                  <tr key={t.id} className="border-t border-border hover:bg-white/[0.03] transition" data-testid={`ticket-row-${t.id}`}>
                    <td className="p-3 font-medium">{t.title}</td>
                    <td className="p-3">
                      {t.customer && (<div className="flex items-center gap-2"><Avatar className="w-6 h-6"><AvatarImage src={t.customer.avatar} /><AvatarFallback className="text-[9px] bg-primary/20">{t.customer.name?.slice(0,2).toUpperCase()}</AvatarFallback></Avatar><span>{t.customer.name}</span></div>)}
                    </td>
                    <td className="p-3 capitalize text-muted-foreground">{t.channel}</td>
                    <td className="p-3"><span className={`chip border ${p.color}`}><span className={`dot ${p.dot}`} />{p.label}</span></td>
                    <td className="p-3"><span className={`chip border ${s.color}`}><span className={`dot ${s.dot}`} />{s.label}</span></td>
                    <td className="p-3 text-muted-foreground">{timeAgo(t.created_at)}</td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No tickets yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
