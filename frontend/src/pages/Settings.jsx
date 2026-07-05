import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api, { formatError } from "@/lib/apiClient";
import { toast } from "sonner";

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [cur, setCur] = useState(""); const [nw, setNw] = useState("");
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try { const { data } = await api.put("/auth/profile", { name, avatar }); updateUser(data); toast.success("Profile updated"); }
    catch (e) { toast.error(formatError(e)); } finally { setSaving(false); }
  };

  const changePwd = async () => {
    try { await api.post("/auth/change-password", { current_password: cur, new_password: nw }); toast.success("Password changed"); setCur(""); setNw(""); }
    catch (e) { toast.error(formatError(e)); }
  };

  return (
    <div className="space-y-6 fade-up max-w-3xl">
      <div><h1 className="font-heading text-3xl font-extrabold tracking-tight">Settings</h1><p className="text-sm text-muted-foreground">Manage your workspace and account</p></div>
      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="prefs">Preferences</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="pt-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-md" data-testid="settings-name" /></div>
            <div><Label>Email</Label><Input value={user?.email || ""} disabled className="max-w-md" /></div>
            <div><Label>Avatar URL</Label><Input value={avatar} onChange={(e) => setAvatar(e.target.value)} className="max-w-md" placeholder="https://…" /></div>
            <Button onClick={saveProfile} disabled={saving} className="bg-primary hover:bg-blue-500" data-testid="settings-save-profile">Save changes</Button>
          </div>
        </TabsContent>
        <TabsContent value="security" className="pt-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div><Label>Current password</Label><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} className="max-w-md" /></div>
            <div><Label>New password</Label><Input type="password" value={nw} onChange={(e) => setNw(e.target.value)} className="max-w-md" /></div>
            <Button onClick={changePwd} className="bg-primary hover:bg-blue-500" data-testid="change-password">Change password</Button>
          </div>
        </TabsContent>
        <TabsContent value="roles" className="pt-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Role-based access control preview. Current role: <span className="text-white font-semibold capitalize">{user?.role}</span></p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[["Admin","Full workspace access"],["Manager","Team + reports"],["Agent","Assigned complaints"],["Viewer","Read-only"]].map(([r,d]) => (
                <div key={r} className="p-3 rounded-xl border border-border"><div className="font-semibold">{r}</div><div className="text-xs text-muted-foreground">{d}</div></div>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="prefs" className="pt-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <Row label="Email notifications" defaultChecked />
            <Row label="Weekly digest" defaultChecked />
            <Row label="Desktop push" />
            <Row label="Sound alerts" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, defaultChecked }) {
  return (<div className="flex items-center justify-between"><span className="text-sm">{label}</span><Switch defaultChecked={defaultChecked} /></div>);
}
