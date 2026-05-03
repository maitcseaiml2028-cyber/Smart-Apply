import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import { User, MapPin, GraduationCap, Pencil, Check, ShieldCheck, Loader2 } from "lucide-react";
import { getProfile, updateProfile } from "@/lib/data-server";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Smart Apply" }] }),
  loader: () => getProfile(),
  component: ProfilePage,
});

type Field = { label: string; value: string; key: string };

function Section({ 
  icon: Icon, 
  title, 
  subtitle, 
  fields, 
  onSave 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  subtitle: string; 
  fields: Field[];
  onSave: (data: Record<string, string>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState(fields);
  const [saving, setSaving] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setData(fields);
  }, [fields]);

  const handleSave = async () => {
    setSaving(true);
    const updatePayload: Record<string, string> = {};
    data.forEach(f => { updatePayload[f.key] = f.value; });
    
    try {
      await onSave(updatePayload);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-8 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest opacity-60">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            editing 
              ? "bg-foreground text-background shadow-elevated" 
              : "border border-border bg-card hover:bg-secondary hover:shadow-soft"
          }`}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : editing ? (
            <><Check className="h-3.5 w-3.5 text-success-foreground" /> Save Changes</>
          ) : (
            <><Pencil className="h-3.5 w-3.5" /> Edit Profile</>
          )}
        </button>
      </div>
      <div className="mt-8 grid sm:grid-cols-2 gap-x-10 gap-y-6">
        {data.map((f, i) => (
          <div key={f.key} className="space-y-2 group">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] ml-1">{f.label}</label>
            {editing ? (
              <input
                value={f.value}
                onChange={(e) => setData((d) => d.map((x, j) => (i === j ? { ...x, value: e.target.value } : x)))}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
              />
            ) : (
              <div className="px-4 py-3 rounded-xl bg-secondary/30 text-sm font-bold border border-transparent group-hover:border-border transition-all">
                {f.value || <span className="opacity-30 italic font-medium text-xs">Not specified</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePage() {
  const data = useLoaderData({ from: "/profile" }) || { user: { fullName: "User" }, profile: {} };
  const { user, profile } = data;
  const router = useRouter();

  const handleUpdate = async (data: Record<string, string>) => {
    try {
      const res = await updateProfile({ data });
      if (res.success) {
        toast.success("Profile updated successfully!");
        router.invalidate();
      } else {
        toast.error("Failed to update profile");
      }
    } catch (err) {
      toast.error("An error occurred while saving");
    }
  };

  if (!user) return <div className="p-20 text-center font-black uppercase tracking-widest opacity-20">No active session</div>;

  const initials = user.fullName.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-20">
        <div className="rounded-3xl gradient-hero p-8 text-primary-foreground relative overflow-hidden shadow-elevated">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "var(--gradient-mesh)" }} />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="h-24 w-24 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-3xl font-semibold border border-white/20 shadow-2xl">
              {initials}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-semibold tracking-tight leading-none">{user.fullName}</h1>
              <p className="text-primary-foreground/70 text-base font-medium mt-2">{user.email} · Member since {user.memberSince}</p>
              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-black uppercase tracking-widest border border-white/10 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground" /> Verified
                </span>
                <span className="px-3 py-1 rounded-full bg-primary-foreground text-primary text-[9px] font-black uppercase tracking-widest shadow-lg">
                  100% Complete
                </span>
              </div>
            </div>
          </div>
        </div>

        <Section
          icon={User}
          title="Personal Information"
          subtitle="Core identity details for form auto-fills"
          onSave={handleUpdate}
          fields={[
            { label: "Full name", value: user.fullName, key: "fullName" },
            { label: "Date of birth", value: profile?.dob || "", key: "dob" },
            { label: "Gender", value: profile?.gender || "", key: "gender" },
            { label: "Phone", value: profile?.phone || "", key: "phone" },
            { label: "Aadhaar (last 4)", value: profile?.aadhaarLast4 || "", key: "aadhaarLast4" },
          ]}
        />

        <Section
          icon={MapPin}
          title="Residential Address"
          subtitle="Current and permanent address records"
          onSave={handleUpdate}
          fields={[
            { label: "Address line 1", value: profile?.addressLine1 || "", key: "addressLine1" },
            { label: "Address line 2", value: profile?.addressLine2 || "", key: "addressLine2" },
            { label: "City", value: profile?.city || "", key: "city" },
            { label: "State", value: profile?.state || "", key: "state" },
            { label: "Pincode", value: profile?.pincode || "", key: "pincode" },
            { label: "Country", value: profile?.country || "", key: "country" },
          ]}
        />

        <Section
          icon={GraduationCap}
          title="Educational History"
          subtitle="Highest academic achievements and credentials"
          onSave={handleUpdate}
          fields={[
            { label: "Qualification", value: profile?.qualification || "", key: "qualification" },
            { label: "Institution", value: profile?.institution || "", key: "institution" },
            { label: "Year of passing", value: profile?.yearOfPassing || "", key: "yearOfPassing" },
            { label: "Percentage / CGPA", value: profile?.cgpa || "", key: "cgpa" },
          ]}
        />
      </div>
    </AppShell>
  );
}
