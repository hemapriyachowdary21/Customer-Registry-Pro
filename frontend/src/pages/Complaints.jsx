import { useEffect, useState } from "react";
import { LayoutGrid, ListIcon as List, Filter, Search, Plus, Paperclip, MessageSquare } from "lucide-react";
import api, { formatError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { PRIORITY, STATUS, timeAgo } from "@/lib/format";

const COLUMNS = [
  { key: "open", label: "Open" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

export default function Complaints() {
  const [view, setView] = useState("kanban");
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState(null);
  const [drag, setDrag] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/complaints`, { params: { q, priority, status: statusF } });
      setItems(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, priority, statusF]);

  const move = async (id, status) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    try { await api.put(`/complaints/${id}`, { status }); toast.success("Status updated"); }
    catch (e) { toast.error(formatError(e)); load(); }
  };

  const grouped = COLUMNS.reduce((acc, col) => { acc[col.key] = items.filter((c) => c.status === col.key); return acc; }, {});

  return (
    <div className="space-y-6 fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">Complaints</h1>
          <p className="text-sm text-muted-foreground">Track, prioritize and resolve complaints — {items.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-border p-0.5 bg-black/30 flex">
            <button onClick={() => setView("kanban")} data-testid="view-kanban" className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${view === "kanban" ? "bg-primary text-white" : "text-muted-foreground"}`}><LayoutGrid className="w-3.5 h-3.5" /> Kanban</button>
            <button onClick={() => setView("table")} data-testid="view-table" className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${view === "table" ? "bg-primary text-white" : "text-muted-foreground"}`}><List className="w-3.5 h-3.5" /> Table</button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search subject or description…" className="pl-9 rounded-xl bg-black/30" value={q} onChange={(e) => setQ(e.target.value)} data-testid="complaints-search" />
        </div>
        <Select value={priority} onValueChange={setPriority}><SelectTrigger className="w-full sm:w-40 rounded-xl bg-black/30"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All priorities</SelectItem>{Object.keys(PRIORITY).map(k => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}</SelectContent></Select>
        <Select value={statusF} onValueChange={setStatusF}><SelectTrigger className="w-full sm:w-40 rounded-xl bg-black/30"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.keys(STATUS).map(k => <SelectItem key={k} value={k} className="capitalize">{STATUS[k].label}</SelectItem>)}</SelectContent></Select>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key}
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={() => drag && move(drag, col.key)}
                 className="rounded-2xl border border-border bg-black/20 p-3 min-h-[300px]" data-testid={`kanban-col-${col.key}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><span className={`dot ${STATUS[col.key].dot}`} /><span className="font-heading font-bold text-sm">{col.label}</span></div>
                <span className="text-xs text-muted-foreground font-mono">{grouped[col.key].length}</span>
              </div>
              <div className="space-y-2">
                {grouped[col.key].map((c) => {
                  const p = PRIORITY[c.priority];
                  return (
                    <div key={c.id} draggable onDragStart={() => setDrag(c.id)} onDragEnd={() => setDrag(null)}
                         onClick={() => setFocus(c)}
                         className="rounded-xl bg-card border border-border p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition group" data-testid={`kanban-card-${c.id}`}>
                      <div className="flex items-center justify-between">
                        <span className={`chip border ${p.color}`}><span className={`dot ${p.dot}`} />{p.label}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{c.category}</span>
                      </div>
                      <div className="font-medium text-sm mt-2 line-clamp-2">{c.subject}</div>
                      <div className="flex items-center justify-between mt-3">
                        {c.customer && (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="w-5 h-5"><AvatarImage src={c.customer.avatar} /><AvatarFallback className="text-[9px] bg-primary/20">{c.customer.name?.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">{c.customer.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                          {c.comments?.length > 0 && <span className="inline-flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{c.comments.length}</span>}
                          {c.attachments?.length > 0 && <span className="inline-flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{c.attachments.length}</span>}
                          <span>{timeAgo(c.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {grouped[col.key].length === 0 && (<div className="text-xs text-muted-foreground text-center py-6">Drop cards here</div>)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-xs text-muted-foreground uppercase tracking-wider">
                <tr><th className="p-3 text-left">Subject</th><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Priority</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Created</th></tr>
              </thead>
              <tbody>
                {loading && Array(6).fill(0).map((_, i) => <tr key={i} className="border-t border-border"><td colSpan={6} className="p-3"><div className="skeleton h-8 rounded-lg" /></td></tr>)}
                {!loading && items.map((c) => {
                  const p = PRIORITY[c.priority]; const s = STATUS[c.status];
                  return (
                    <tr key={c.id} onClick={() => setFocus(c)} className="border-t border-border hover:bg-white/[0.03] cursor-pointer transition" data-testid={`complaint-row-${c.id}`}>
                      <td className="p-3 font-medium">{c.subject}</td>
                      <td className="p-3 text-muted-foreground">{c.customer?.name || "—"}</td>
                      <td className="p-3 text-muted-foreground">{c.category}</td>
                      <td className="p-3"><span className={`chip border ${p.color}`}><span className={`dot ${p.dot}`} />{p.label}</span></td>
                      <td className="p-3"><span className={`chip border ${s.color}`}><span className={`dot ${s.dot}`} />{s.label}</span></td>
                      <td className="p-3 text-muted-foreground">{timeAgo(c.created_at)}</td>
                    </tr>
                  );
                })}
                {!loading && items.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No complaints match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ComplaintDrawer focus={focus} onOpenChange={(v) => !v && setFocus(null)} onUpdated={load} />
    </div>
  );
}

function ComplaintDrawer({ focus, onOpenChange, onUpdated }) {
  const [comp, setComp] = useState(null);
  const [comment, setComment] = useState("");
  const [resolution, setResolution] = useState("");

  useEffect(() => {
    if (!focus) return;
    api.get(`/complaints/${focus.id}`).then((r) => { setComp(r.data); setResolution(r.data.resolution || ""); });
  }, [focus]);

  if (!focus) return null;

  const update = async (patch) => {
    try { const { data } = await api.put(`/complaints/${focus.id}`, patch); setComp(data); onUpdated?.(); toast.success("Updated"); }
    catch (e) { toast.error(formatError(e)); }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    try { await api.post(`/complaints/${focus.id}/comments`, { body: comment, internal: false }); setComment(""); const { data } = await api.get(`/complaints/${focus.id}`); setComp(data); }
    catch (e) { toast.error(formatError(e)); }
  };

  const upload = async (file) => {
    const fd = new FormData(); fd.append("file", file);
    try { await api.post(`/complaints/${focus.id}/attachments`, fd, { headers: { "Content-Type": "multipart/form-data" } }); toast.success("Uploaded"); const { data } = await api.get(`/complaints/${focus.id}`); setComp(data); }
    catch (e) { toast.error(formatError(e)); }
  };

  const c = comp || focus;
  const p = PRIORITY[c.priority]; const s = STATUS[c.status];

  return (
    <Sheet open={!!focus} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-full sm:max-w-2xl overflow-y-auto" data-testid="complaint-drawer">
        <SheetHeader><SheetTitle className="font-heading">Complaint</SheetTitle></SheetHeader>
        <div className="mt-6 space-y-5">
          <div>
            <h2 className="font-heading text-xl font-bold">{c.subject}</h2>
            <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
            <div className="flex gap-2 mt-3">
              <span className={`chip border ${p.color}`}><span className={`dot ${p.dot}`} />{p.label}</span>
              <span className={`chip border ${s.color}`}><span className={`dot ${s.dot}`} />{s.label}</span>
              <span className="chip border border-border bg-white/[0.03] text-muted-foreground">{c.category}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={c.status} onValueChange={(v) => update({ status: v })}><SelectTrigger data-testid="complaint-status-select"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(STATUS).map(k => <SelectItem key={k} value={k}>{STATUS[k].label}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Priority</label>
              <Select value={c.priority} onValueChange={(v) => update({ priority: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(PRIORITY).map(k => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>

          {c.customer && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-black/20">
              <Avatar className="w-9 h-9"><AvatarImage src={c.customer.avatar} /><AvatarFallback className="bg-primary/20 text-xs">{c.customer.name?.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
              <div><div className="text-sm font-medium">{c.customer.name}</div><div className="text-xs text-muted-foreground">{c.customer.email}</div></div>
            </div>
          )}

          <Tabs defaultValue="comments">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="attachments">Files</TabsTrigger>
              <TabsTrigger value="resolution">Resolution</TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="space-y-3 pt-3">
              <div className="space-y-2">
                {(c.comments || []).map((cm) => (
                  <div key={cm.id} className="p-3 rounded-xl border border-border">
                    <div className="text-xs text-muted-foreground flex justify-between"><span className="font-semibold text-foreground">{cm.by}</span><span>{timeAgo(cm.at)}</span></div>
                    <div className="text-sm mt-1">{cm.body}</div>
                  </div>
                ))}
                {(c.comments || []).length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No comments yet.</div>}
              </div>
              <div className="flex gap-2">
                <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" />
                <Button onClick={addComment} className="bg-primary hover:bg-blue-500 self-end">Post</Button>
              </div>
            </TabsContent>
            <TabsContent value="timeline" className="pt-3">
              <div className="space-y-3">
                {(c.timeline || []).map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    <div className="text-sm"><span className="font-medium">{t.by}</span> <span className="text-muted-foreground">{t.event}</span> · <span className="text-xs text-muted-foreground">{timeAgo(t.at)}</span></div>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="attachments" className="pt-3 space-y-2">
              <label className="rounded-xl border border-dashed border-border p-4 flex items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition">
                <Paperclip className="w-4 h-4" /><span className="text-sm">Click to upload (max 5MB)</span>
                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
              {(c.attachments || []).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-lg border border-border text-sm">
                  <span className="truncate">{a.filename}</span><span className="text-xs text-muted-foreground">{Math.round(a.size / 1024)}KB</span>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="resolution" className="pt-3 space-y-2">
              <Textarea rows={4} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Describe how this complaint was resolved…" />
              <Button onClick={() => update({ resolution })} className="bg-primary hover:bg-blue-500">Save resolution</Button>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
