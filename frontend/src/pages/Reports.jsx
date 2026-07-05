import { useEffect, useState } from "react";
import { FileText, Download, FileSpreadsheet, FileDown } from "lucide-react";
import api from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function toCSV(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v) => { const s = v == null ? "" : String(v).replace(/"/g, '""'); return /[",\n]/.test(s) ? `"${s}"` : s; };
  return [keys.join(","), ...rows.map(r => keys.map(k => esc(r[k])).join(","))].join("\n");
}

function download(name, content, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data));
    api.get("/customers?limit=500").then((r) => setCustomers(r.data.items));
    api.get("/complaints").then((r) => setComplaints(r.data));
  }, []);

  const exportCustomersCSV = () => {
    const rows = customers.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone || "", company: c.company || "", location: c.location || "", status: c.status, created_at: c.created_at }));
    download("customers.csv", toCSV(rows)); toast.success("Customers CSV downloaded");
  };
  const exportComplaintsCSV = () => {
    const rows = complaints.map(c => ({ id: c.id, subject: c.subject, category: c.category, priority: c.priority, status: c.status, customer: c.customer?.name || "", created_at: c.created_at }));
    download("complaints.csv", toCSV(rows)); toast.success("Complaints CSV downloaded");
  };
  const exportMonthlyExcel = () => {
    // TSV that Excel opens cleanly
    const rows = stats?.monthly || [];
    const tsv = "Month\tCustomers\tComplaints\n" + rows.map(r => `${r.month}\t${r.customers}\t${r.complaints}`).join("\n");
    download("monthly-report.xls", tsv, "application/vnd.ms-excel"); toast.success("Monthly report exported");
  };
  const exportPDF = () => {
    // Simple printable page
    const w = window.open("", "_blank");
    if (!w) return toast.error("Popup blocked");
    w.document.write(`<html><head><title>Registry Pro Report</title><style>body{font-family:sans-serif;padding:40px;color:#0f172a}h1{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:12px}th{background:#f1f5f9}</style></head><body>`);
    w.document.write(`<h1>Customer Registry Pro — Monthly Report</h1><p>Generated ${new Date().toLocaleString()}</p>`);
    w.document.write(`<h3>Key metrics</h3><table><tr><th>Total customers</th><td>${stats?.customers.total}</td></tr><tr><th>Active</th><td>${stats?.customers.active}</td></tr><tr><th>Open complaints</th><td>${stats?.complaints.open}</td></tr><tr><th>Resolved</th><td>${stats?.complaints.resolved}</td></tr><tr><th>Avg. resolution (h)</th><td>${stats?.avg_resolution_hours}</td></tr><tr><th>CSAT</th><td>${stats?.csat}%</td></tr></table>`);
    w.document.write(`<h3>Monthly trend</h3><table><tr><th>Month</th><th>Customers</th><th>Complaints</th></tr>${(stats?.monthly||[]).map(r => `<tr><td>${r.month}</td><td>${r.customers}</td><td>${r.complaints}</td></tr>`).join("")}</table>`);
    w.document.write(`<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Export data and generate high-level reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: "Customers CSV", desc: "Full customer directory", icon: FileText, onClick: exportCustomersCSV, testId: "export-customers-csv" },
          { title: "Complaints CSV", desc: "Complaint records", icon: FileText, onClick: exportComplaintsCSV, testId: "export-complaints-csv" },
          { title: "Monthly Excel", desc: "Trend spreadsheet", icon: FileSpreadsheet, onClick: exportMonthlyExcel, testId: "export-monthly-xls" },
          { title: "Monthly PDF", desc: "Print-ready summary", icon: FileDown, onClick: exportPDF, testId: "export-monthly-pdf" },
        ].map((r) => (
          <div key={r.title} className="rounded-2xl border border-border bg-card p-5 card-lift">
            <r.icon className="w-8 h-8 text-primary" />
            <div className="mt-3 font-heading font-bold">{r.title}</div>
            <div className="text-xs text-muted-foreground">{r.desc}</div>
            <Button onClick={r.onClick} className="w-full mt-4 rounded-xl bg-primary hover:bg-blue-500" data-testid={r.testId}><Download className="w-4 h-4 mr-1" /> Export</Button>
          </div>
        ))}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Total customers" value={stats.customers.total} />
          <Metric label="Open complaints" value={stats.complaints.open} />
          <Metric label="Avg resolution" value={`${stats.avg_resolution_hours}h`} />
          <Metric label="CSAT" value={`${stats.csat}%`} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="mt-2 font-heading text-3xl font-extrabold">{value}</div>
    </div>
  );
}
