import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Filter, Trash2, Edit, Mail, Phone, MapPin, Building2 } from "lucide-react";
import api, { formatError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { CUSTOMER_STATUS, timeAgo } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function Customers() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const perPage = 12;

  const [openDrawer, setOpenDrawer] = useState(false);
  const [focus, setFocus] = useState(null);
  const [complaintsForCust, setComplaintsForCust] = useState([]);
  const [interactionsForCust, setInteractionsForCust] = useState([]);

  const [editing, setEditing] = useState(null); // null = closed, {} = new, object = edit
  const [selected, setSelected] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/customers`, { params: { q, status, skip: page * perPage, limit: perPage } });
      setItems(data.items);
      setTotal(data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, status, page]);

  const openProfile = async (c) => {
    setFocus(c);
    setOpenDrawer(true);
    const [comp, inter] = await Promise.all([
      api.get(`/complaints`, { params: { customer_id: c.id } }),
      api.get(`/interactions`, { params: { customer_id: c.id } }),
    ]);
    setComplaintsForCust(comp.data);
    setInteractionsForCust(inter.data);
  };

  const remove = async (id) => {
    try { await api.delete(`/customers/${id}`); toast.success("Customer deleted"); load(); } catch (e) { toast.error(formatError(e)); }
  };

  const bulkDelete = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return;
    try {
      await Promise.all(ids.map((id) => api.delete(`/customers/${id}`)));
      toast.success(`${ids.length} deleted`);
      setSelected({});
      load();
    } catch (e) { toast.error(formatError(e)); }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6 fade-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} total • manage profiles, history and interactions</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10" data-testid="bulk-delete-btn">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete {selectedCount}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader><AlertDialogTitle>Delete customers?</AlertDialogTitle><AlertDialogDescription>This will remove {selectedCount} customers and their related complaints & tickets. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={() => setEditing({})} className="rounded-xl bg-primary hover:bg-blue-500" data-testid="add-customer-btn">
            <Plus className="w-4 h-4 mr-1" /> New customer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, email, company…" className="pl-9 rounded-xl bg-black/30 border-border" value={q} onChange={(e) => { setPage(0); setQ(e.target.value); }} data-testid="customers-search" />
        </div>
        <Select value={status} onValueChange={(v) => { setPage(0); setStatus(v); }}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl bg-black/30" data-testid="customers-status-filter"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="vip">VIP</SelectItem></SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-3 text-left w-10"><input type="checkbox" onChange={(e) => { const all = {}; items.forEach(i => all[i.id] = e.target.checked); setSelected(all); }} /></th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Created</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array(6).fill(0).map((_, i) => <tr key={i} className="border-t border-border"><td colSpan={7} className="p-3"><div className="skeleton h-8 rounded-lg" /></td></tr>)}
              {!loading && items.map((c) => {
                const s = CUSTOMER_STATUS[c.status] || CUSTOMER_STATUS.active;
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-white/[0.03] transition group" data-testid={`customer-row-${c.id}`}>
                    <td className="p-3"><input type="checkbox" checked={!!selected[c.id]} onChange={(e) => setSelected({ ...selected, [c.id]: e.target.checked })} /></td>
                    <td className="p-3">
                      <button onClick={() => openProfile(c)} className="flex items-center gap-3 hover:text-primary transition text-left">
                        <Avatar className="w-9 h-9"><AvatarImage src={c.avatar} /><AvatarFallback className="bg-primary/20 text-xs">{c.name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                        <div>
                          <div className="font-semibold">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.email}</div>
                        </div>
                      </button>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.company || "—"}</td>
                    <td className="p-3 text-muted-foreground">{c.location || "—"}</td>
                    <td className="p-3"><span className={`chip border ${s.color}`}><span className={`dot ${s.dot}`} />{s.label}</span></td>
                    <td className="p-3 text-muted-foreground">{timeAgo(c.created_at)}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(c)} data-testid={`edit-customer-${c.id}`}><Edit className="w-3.5 h-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader><AlertDialogTitle>Delete {c.name}?</AlertDialogTitle><AlertDialogDescription>This will also remove their complaints, tickets and interactions.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => remove(c.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && (<tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No customers match your filters.</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 border-t border-border text-xs text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
            <Button size="sm" variant="ghost" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Editor dialog */}
      <CustomerEditor open={editing !== null} onOpenChange={(v) => !v && setEditing(null)} initial={editing || {}} onSaved={() => { setEditing(null); load(); }} />

      {/* Profile drawer */}
      <Sheet open={openDrawer} onOpenChange={setOpenDrawer}>
        <SheetContent className="bg-card border-border w-full sm:max-w-xl overflow-y-auto" data-testid="customer-drawer">
          {focus && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading">Customer profile</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16"><AvatarImage src={focus.avatar} /><AvatarFallback className="bg-primary/20">{focus.name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-2xl font-bold">{focus.name}</h3>
                      <span className={`chip border ${(CUSTOMER_STATUS[focus.status]||CUSTOMER_STATUS.active).color}`}><span className={`dot ${(CUSTOMER_STATUS[focus.status]||CUSTOMER_STATUS.active).dot}`} />{(CUSTOMER_STATUS[focus.status]||CUSTOMER_STATUS.active).label}</span>
                    </div>
                    <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{focus.email}</div>
                      {focus.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{focus.phone}</div>}
                      {focus.company && <div className="flex items-center gap-2"><Building2 className="w-3 h-3" />{focus.company}</div>}
                      {focus.location && <div className="flex items-center gap-2"><MapPin className="w-3 h-3" />{focus.location}</div>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(focus.tags || []).map((t) => <Badge key={t} variant="outline" className="bg-white/[0.03] text-xs">{t}</Badge>)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-black/20 p-3"><div className="text-xs text-muted-foreground">Complaints</div><div className="font-heading text-2xl font-bold">{complaintsForCust.length}</div></div>
                  <div className="rounded-xl border border-border bg-black/20 p-3"><div className="text-xs text-muted-foreground">Interactions</div><div className="font-heading text-2xl font-bold">{interactionsForCust.length}</div></div>
                  <div className="rounded-xl border border-border bg-black/20 p-3"><div className="text-xs text-muted-foreground">Joined</div><div className="text-sm font-bold mt-1">{timeAgo(focus.created_at)}</div></div>
                </div>

                <Tabs defaultValue="timeline">
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="complaints">Complaints</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="docs">Docs</TabsTrigger>
                  </TabsList>
                  <TabsContent value="timeline" className="space-y-3 pt-3">
                    {interactionsForCust.slice(0, 10).map((i) => (
                      <div key={i.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold uppercase">{i.kind[0]}</div>
                        <div className="flex-1"><div className="text-sm font-medium">{i.summary}</div><div className="text-xs text-muted-foreground">{i.kind} • {timeAgo(i.created_at)}</div></div>
                      </div>
                    ))}
                    {interactionsForCust.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No interactions yet.</div>}
                  </TabsContent>
                  <TabsContent value="complaints" className="space-y-2 pt-3">
                    {complaintsForCust.map((c) => (<div key={c.id} className="p-3 rounded-xl border border-border"><div className="text-sm font-medium">{c.subject}</div><div className="text-xs text-muted-foreground">{c.status} • {c.priority} • {timeAgo(c.created_at)}</div></div>))}
                    {complaintsForCust.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No complaints on record.</div>}
                  </TabsContent>
                  <TabsContent value="notes" className="pt-3"><div className="text-sm text-muted-foreground">{focus.notes || "No notes."}</div></TabsContent>
                  <TabsContent value="docs" className="pt-3"><div className="text-sm text-muted-foreground">Document uploads coming soon.</div></TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CustomerEditor({ open, onOpenChange, initial, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", location: "", status: "active", notes: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setForm({ name: initial.name || "", email: initial.email || "", phone: initial.phone || "", company: initial.company || "", location: initial.location || "", status: initial.status || "active", notes: initial.notes || "" });
  }, [initial, open]);

  const save = async () => {
    setSaving(true);
    try {
      if (initial?.id) await api.put(`/customers/${initial.id}`, form);
      else await api.post(`/customers`, form);
      toast.success(initial?.id ? "Updated" : "Customer created");
      onSaved();
    } catch (e) { toast.error(formatError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg" data-testid="customer-editor">
        <DialogHeader><DialogTitle className="font-heading">{initial?.id ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="editor-cust-name" /></div>
          <div className="col-span-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="editor-cust-email" /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="vip">VIP</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-primary hover:bg-blue-500" data-testid="editor-cust-save">{saving ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
