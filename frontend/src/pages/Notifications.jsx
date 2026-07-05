import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import api from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

const SEV = { info: "bg-primary/15 text-primary border-primary/30", success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", warning: "bg-amber-500/15 text-amber-300 border-amber-500/30", error: "bg-red-500/15 text-red-300 border-red-500/30" };

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => api.get("/notifications").then((r) => setItems(r.data.items)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const readAll = async () => { await api.post("/notifications/read-all"); toast.success("All marked read"); load(); };
  const readOne = async (id) => { await api.post(`/notifications/${id}/read`); load(); };

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-3xl font-extrabold tracking-tight">Notifications</h1><p className="text-sm text-muted-foreground">All system events and updates</p></div>
        <Button onClick={readAll} className="rounded-xl bg-primary hover:bg-blue-500" data-testid="mark-all-read"><CheckCheck className="w-4 h-4 mr-1" /> Mark all read</Button>
      </div>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {loading && Array(5).fill(0).map((_, i) => <div key={i} className="p-4"><div className="skeleton h-6 rounded-lg" /></div>)}
        {!loading && items.map((n) => (
          <div key={n.id} className="p-4 flex items-start gap-3 hover:bg-white/[0.02]">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${SEV[n.severity] || SEV.info}`}><Bell className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{n.message}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</div>
            </div>
            {!n.read && <button onClick={() => readOne(n.id)} className="text-xs text-primary hover:underline">Mark read</button>}
          </div>
        ))}
        {!loading && items.length === 0 && <div className="p-12 text-center text-muted-foreground">You're all caught up.</div>}
      </div>
    </div>
  );
}
