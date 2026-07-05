import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { Phone, Mail, Users, StickyNote, MessageCircle } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const ICONS = { call: Phone, email: Mail, meeting: Users, note: StickyNote, chat: MessageCircle };

export default function Interactions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/interactions").then((r) => setItems(r.data)).finally(() => setLoading(false)); }, []);

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Interactions</h1>
        <p className="text-sm text-muted-foreground">{items.length} customer touchpoints logged</p>
      </div>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {loading && Array(6).fill(0).map((_, i) => <div key={i} className="p-4"><div className="skeleton h-6 rounded-lg" /></div>)}
        {!loading && items.map((i) => {
          const Icon = ICONS[i.kind] || StickyNote;
          return (
            <div key={i.id} className="p-4 flex gap-3 hover:bg-white/[0.02] transition" data-testid={`interaction-${i.id}`}>
              <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0"><Icon className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{i.summary}</div>
                  <div className="text-xs text-muted-foreground shrink-0">{timeAgo(i.created_at)}</div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <span className="capitalize">{i.kind}</span>
                  {i.customer && (<>
                    <span>·</span>
                    <Avatar className="w-4 h-4"><AvatarImage src={i.customer.avatar} /><AvatarFallback className="text-[7px] bg-primary/20">{i.customer.name?.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                    <span>{i.customer.name}</span>
                  </>)}
                </div>
                {i.body && <div className="text-sm text-muted-foreground mt-1.5">{i.body}</div>}
              </div>
            </div>
          );
        })}
        {!loading && items.length === 0 && <div className="p-12 text-center text-muted-foreground">No interactions yet.</div>}
      </div>
    </div>
  );
}
