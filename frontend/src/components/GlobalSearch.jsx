import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, MessageSquareWarning, Ticket } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import api from "@/lib/apiClient";

export default function GlobalSearch({ open, onOpenChange }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState({ customers: [], complaints: [], tickets: [] });
  const nav = useNavigate();

  useEffect(() => {
    if (!q || q.length < 2) {
      setResults({ customers: [], complaints: [], tickets: [] });
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`);
        setResults(data);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const go = (path) => {
    onOpenChange(false);
    setQ("");
    nav(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search customers, complaints, tickets…" value={q} onValueChange={setQ} data-testid="global-search-input" />
      <CommandList>
        <CommandEmpty>{q ? "No results found." : "Type at least 2 characters."}</CommandEmpty>
        {results.customers.length > 0 && (
          <CommandGroup heading="Customers">
            {results.customers.map((c) => (
              <CommandItem key={c.id} onSelect={() => go(`/customers?focus=${c.id}`)}>
                <Users className="w-4 h-4 mr-2 text-primary" />
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.email}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.complaints.length > 0 && (
          <CommandGroup heading="Complaints">
            {results.complaints.map((c) => (
              <CommandItem key={c.id} onSelect={() => go(`/complaints`)}>
                <MessageSquareWarning className="w-4 h-4 mr-2 text-warning" />
                <span className="flex-1">{c.subject}</span>
                <span className="text-xs text-muted-foreground">{c.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.tickets.length > 0 && (
          <CommandGroup heading="Tickets">
            {results.tickets.map((t) => (
              <CommandItem key={t.id} onSelect={() => go(`/tickets`)}>
                <Ticket className="w-4 h-4 mr-2 text-success" />
                <span className="flex-1">{t.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
