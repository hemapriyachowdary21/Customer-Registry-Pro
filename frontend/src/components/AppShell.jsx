import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, MessageSquareWarning, Ticket, Activity,
  FileBarChart2, LineChart, Bell, Settings as SettingsIcon, LifeBuoy,
  LogOut, Search, Plus, Sparkles, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/apiClient";
import GlobalSearch from "@/components/GlobalSearch";
import QuickAdd from "@/components/QuickAdd";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { to: "/customers", label: "Customers", icon: Users, testId: "nav-customers" },
  { to: "/complaints", label: "Complaints", icon: MessageSquareWarning, testId: "nav-complaints" },
  { to: "/tickets", label: "Support Tickets", icon: Ticket, testId: "nav-tickets" },
  { to: "/interactions", label: "Interactions", icon: Activity, testId: "nav-interactions" },
  { to: "/reports", label: "Reports", icon: FileBarChart2, testId: "nav-reports" },
  { to: "/analytics", label: "Analytics", icon: LineChart, testId: "nav-analytics" },
  { to: "/notifications", label: "Notifications", icon: Bell, testId: "nav-notifications" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, testId: "nav-settings" },
  { to: "/help", label: "Help Center", icon: LifeBuoy, testId: "nav-help" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const navigate = useNavigate();

  const refreshUnread = async () => {
    try {
      const { data } = await api.get("/notifications");
      setUnread(data.unread || 0);
    } catch {}
  };

  useEffect(() => {
    refreshUnread();
    const t = setInterval(refreshUnread, 30000);
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(t);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-[hsl(222,45%,7%)] px-4 py-5" data-testid="sidebar">
        <div className="flex items-center gap-2 px-2 pb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-lg leading-tight tracking-tight">Registry Pro</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5 font-mono">customer.care.suite</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={n.testId}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? "bg-primary/10 text-white border border-primary/30 shadow-inner shadow-primary/5"
                    : "text-muted-foreground hover:text-white hover:bg-white/[0.04] border border-transparent"
                }`
              }
            >
              <n.icon className="w-4 h-4" />
              <span className="flex-1">{n.label}</span>
              {n.to === "/notifications" && unread > 0 && (
                <Badge variant="secondary" className="bg-primary text-white h-5 min-w-5 px-1.5 rounded-full text-[10px]">
                  {unread}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          data-testid="sidebar-logout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-white hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav */}
        <header className="sticky top-0 z-30 glass border-b border-border" data-testid="topbar">
          <div className="flex items-center gap-3 px-6 py-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 flex-1 max-w-xl px-3.5 py-2 rounded-xl bg-black/30 border border-border text-sm text-muted-foreground hover:border-primary/50 transition"
              data-testid="global-search-trigger"
            >
              <Search className="w-4 h-4" />
              <span>Search customers, complaints, tickets…</span>
              <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10">⌘K</kbd>
            </button>
            <div className="sm:hidden flex-1" />
            <Button
              onClick={() => setQuickOpen(true)}
              className="rounded-xl bg-primary hover:bg-blue-500 text-white gap-2"
              data-testid="quick-add-btn"
            >
              <Plus className="w-4 h-4" /> Quick Add
            </Button>
            <button
              onClick={() => navigate("/notifications")}
              className="relative w-9 h-9 rounded-xl bg-black/30 border border-border flex items-center justify-center hover:border-primary/50 transition"
              data-testid="notifications-btn"
            >
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-primary text-[10px] flex items-center justify-center px-1 font-semibold">
                  {unread}
                </span>
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-1 pr-2 py-1 rounded-xl hover:bg-white/[0.04] transition" data-testid="profile-menu-trigger">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-primary/20 text-white text-xs">
                      {user?.name?.slice(0, 2)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-semibold leading-tight">{user?.name}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">{user?.role}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
                  <SettingsIcon className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/help")}>
                  <LifeBuoy className="w-4 h-4 mr-2" /> Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-400" data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-x-hidden" data-testid="main-content">
          <Outlet />
        </main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <QuickAdd open={quickOpen} onOpenChange={setQuickOpen} onCreated={refreshUnread} />
    </div>
  );
}
