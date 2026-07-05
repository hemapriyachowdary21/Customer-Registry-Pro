import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import api, { formatError } from "@/lib/apiClient";
import { toast } from "sonner";

export default function QuickAdd({ open, onOpenChange, onCreated }) {
  const [tab, setTab] = useState("customer");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get("/customers?limit=200").then((r) => setCustomers(r.data.items)).catch(() => {});
  }, [open]);

  const [cust, setCust] = useState({ name: "", email: "", phone: "", company: "", status: "active", location: "" });
  const [comp, setComp] = useState({ customer_id: "", subject: "", description: "", priority: "medium", category: "Billing" });
  const [tick, setTick] = useState({ customer_id: "", title: "", description: "", priority: "medium", channel: "email" });

  const submit = async () => {
    setLoading(true);
    try {
      if (tab === "customer") {
        await api.post("/customers", cust);
        toast.success("Customer created");
        setCust({ name: "", email: "", phone: "", company: "", status: "active", location: "" });
      } else if (tab === "complaint") {
        if (!comp.customer_id) throw new Error("Select a customer");
        await api.post("/complaints", comp);
        toast.success("Complaint created");
        setComp({ customer_id: "", subject: "", description: "", priority: "medium", category: "Billing" });
      } else {
        if (!tick.customer_id) throw new Error("Select a customer");
        await api.post("/tickets", tick);
        toast.success("Ticket created");
        setTick({ customer_id: "", title: "", description: "", priority: "medium", channel: "email" });
      }
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border" data-testid="quick-add-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Quick add</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="customer" data-testid="quick-add-tab-customer">Customer</TabsTrigger>
            <TabsTrigger value="complaint" data-testid="quick-add-tab-complaint">Complaint</TabsTrigger>
            <TabsTrigger value="ticket" data-testid="quick-add-tab-ticket">Ticket</TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Full name</Label><Input data-testid="qa-cust-name" value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input data-testid="qa-cust-email" value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={cust.company} onChange={(e) => setCust({ ...cust, company: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={cust.location} onChange={(e) => setCust({ ...cust, location: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={cust.status} onValueChange={(v) => setCust({ ...cust, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="vip">VIP</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="complaint" className="space-y-3 pt-4">
            <div><Label>Customer</Label>
              <Select value={comp.customer_id} onValueChange={(v) => setComp({ ...comp, customer_id: v })}>
                <SelectTrigger data-testid="qa-comp-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent className="max-h-64">{customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} — {c.email}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Subject</Label><Input data-testid="qa-comp-subject" value={comp.subject} onChange={(e) => setComp({ ...comp, subject: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={comp.description} onChange={(e) => setComp({ ...comp, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label>
                <Select value={comp.priority} onValueChange={(v) => setComp({ ...comp, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Category</Label>
                <Select value={comp.category} onValueChange={(v) => setComp({ ...comp, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Billing","Technical","Delivery","Product","Account","Feature Request","Bug"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ticket" className="space-y-3 pt-4">
            <div><Label>Customer</Label>
              <Select value={tick.customer_id} onValueChange={(v) => setTick({ ...tick, customer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent className="max-h-64">{customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} — {c.email}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Title</Label><Input value={tick.title} onChange={(e) => setTick({ ...tick, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={tick.description} onChange={(e) => setTick({ ...tick, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label>
                <Select value={tick.priority} onValueChange={(v) => setTick({ ...tick, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Channel</Label>
                <Select value={tick.channel} onValueChange={(v) => setTick({ ...tick, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["email","phone","chat","web","social"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="bg-primary hover:bg-blue-500" data-testid="quick-add-submit">
            {loading ? "Creating…" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
