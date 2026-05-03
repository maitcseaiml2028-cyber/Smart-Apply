import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  User, 
  FolderOpen, 
  FileText, 
  LogOut, 
  Sparkles, 
  Bell, 
  Search, 
  Loader2, 
  Sun, 
  Settings, 
  Layers, 
  Lock, 
  Layout, 
  Crown, 
  ChevronDown,
  Menu,
  X
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { getSessionUser } from "@/lib/data-server";
import { logout } from "@/lib/auth-server";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/applications", label: "Applications", icon: FileText },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/templates", label: "Templates", icon: Layout },
  { to: "/tools", label: "Tools", icon: Sparkles, badge: "NEW" },
  { to: "/profile", label: "Profile", icon: User },
];


export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    getSessionUser()
      .then((res) => {
        setUser(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      document.cookie = "userId=; path=/; max-age=0";
      toast.success("Logged out successfully");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  const initials = user?.fullName ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "SR";

  return (
    <div className="min-h-screen flex w-full bg-[#F8FAFC]">
      {/* SIDEBAR: Premium Dark Background */}
      {isSidebarOpen && (
        <aside className="hidden lg:flex w-64 flex-col bg-[#0F1424] border-r border-[#1E253A] sticky top-0 h-screen text-white select-none shrink-0 justify-between">
          <div className="flex flex-col flex-1 min-h-0">
            {/* Logo / Header */}
            <div className="px-6 py-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#EC4899] flex items-center justify-center shadow-[0_4px_20px_rgba(79,70,229,0.4)]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-bold tracking-tight text-[15px] leading-tight text-white flex items-center gap-1.5">
                  Smart Apply
                </div>
                <div className="text-[11px] font-medium text-[#94A3B8] tracking-wide mt-0.5">Form Intelligence</div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="px-3.5 py-1 flex-1 space-y-1 overflow-y-auto custom-scrollbar">
              {nav.map((item) => {
                const active = location.pathname === item.to || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[13px] font-medium transition-all duration-300 relative group select-none cursor-pointer ${
                      active
                        ? "bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#EC4899]/90 text-white font-semibold shadow-[0_1px_12px_rgba(99,102,241,0.35)]"
                        : "text-[#94A3B8] hover:bg-[#1E253A] hover:text-white"
                    }`}
                  >
                    <item.icon className={`h-[18px] w-[18px] transition-transform group-hover:scale-110 ${active ? "text-white" : "text-[#64748B]"}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-[#581C87] text-[#D8B4FE] text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider">
                        {item.badge}
                      </span>
                    )}
                    {item.dot && (
                      <span className="h-2 w-2 rounded-full bg-[#22C55E] ring-2 ring-[#0F1424] mr-0.5" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Upgrade to Pro Card */}
            <div className="p-4 mx-3.5 mb-4 rounded-2xl bg-gradient-to-br from-[#1E253A] to-[#11172A] border border-[#334155]/60 flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-15 pointer-events-none transition">
                <Crown className="h-12 w-12 text-[#EC4899]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span className="text-xs font-bold text-white tracking-wide">Upgrade to Pro</span>
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1.5 leading-relaxed font-normal">
                  Unlock premium features and cloud sync across devices.
                </p>
              </div>
              <button className="w-full bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#EC4899] hover:brightness-110 transition-all font-semibold text-xs py-2.5 rounded-xl text-white shadow-md flex items-center justify-center gap-1.5">
                Upgrade Now <span className="text-sm font-light">→</span>
              </button>
            </div>
          </div>

          {/* User Card - Bottom */}
          <div className="px-4 py-3.5 border-t border-[#1E253A] bg-[#0A0E1A] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-xs font-bold text-white shadow-md">
                {initials}
              </div>
              <div>
                <div className="text-xs font-bold leading-none text-white tracking-wide">
                  {user?.fullName || "Shivanand Ray"}
                </div>
                <div className="text-[10px] text-[#64748B] font-medium leading-tight mt-0.5">
                  Member since {user?.memberSince || "Apr 2026"}
                </div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              title="Log out"
              className="h-8 w-8 rounded-xl bg-[#1E253A]/80 hover:bg-destructive hover:text-white transition flex items-center justify-center text-[#94A3B8] hover:shadow-lg duration-200"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#F8FAFC]">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-[72px] bg-white border-b border-[#E2E8F0] flex items-center px-6 lg:px-8 gap-4 shrink-0 justify-between select-none">
          {/* Header Left (Toggle + Search) */}
          <div className="flex items-center flex-1 max-w-xl gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="h-10 w-10 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] flex items-center justify-center transition-all duration-200 shadow-sm text-[#475569] shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                placeholder="Search applications, documents, tools..."
                className="w-full pl-11 pr-14 py-2.5 rounded-xl bg-[#F1F5F9] border border-transparent focus:border-[#4F46E5]/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#4F46E5]/10 text-[13px] font-medium text-[#1E293B] placeholder-[#94A3B8] transition-all"
              />
            </div>
          </div>

          {/* Header Right */}
          <div className="flex items-center gap-4 pl-4">
            {/* Notification Bell */}
            <button className="relative h-10 w-10 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-[#CBD5E1] flex items-center justify-center transition-all duration-200 shadow-sm text-[#475569] group">
              <Bell className="h-[18px] w-[18px] group-hover:scale-110 duration-200" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#EF4444]" />
            </button>

            {/* Dark/Light mode toggle icon */}
            <button className="h-10 w-10 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-[#CBD5E1] flex items-center justify-center transition-all duration-200 shadow-sm text-[#475569] group">
              <Sun className="h-[18px] w-[18px] group-hover:scale-110 duration-200" />
            </button>

            {/* User Profile initials / dropdown */}
            <div className="flex items-center gap-2 pl-1">
              <div className="h-10 w-10 rounded-xl bg-[#4F46E5] flex items-center justify-center text-xs font-bold text-white shadow-[0_2px_8px_rgba(79,70,229,0.3)]">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Pages Contents */}
        <main className="flex-1 px-6 lg:px-8 py-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
