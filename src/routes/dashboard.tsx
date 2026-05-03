import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Scissors, 
  Zap, 
  FileStack, 
  Eye, 
  Edit, 
  Lock, 
  UploadCloud, 
  ArrowRight, 
  Folder, 
  Database, 
  Shield, 
  CheckCircle2, 
  BarChart, 
  FilePlus, 
  Minimize2, 
  ChevronRight, 
  RefreshCcw, 
  FileMinus 
} from "lucide-react";
import { getDashboardData } from "@/lib/data-server";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Smart Apply" }] }),
  loader: () => getDashboardData(),
  component: Dashboard,
});

function Dashboard() {
  const data = useLoaderData({ from: "/dashboard" }) || { user: { fullName: "User" }, stats: [], recentApplications: [] };
  const { user, stats } = data;

  const totalApps = stats?.find((s: any) => s.label === "Total Applications")?.value || 0;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-12 select-none">

        {/* HERO SECTION (TOP BANNER) */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#EC4899] p-8 lg:p-10 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-10 min-h-[300px]">
          {/* Abstract Wave / Glowing Mesh Overlay */}
          <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />

          {/* Banner Left Content */}
          <div className="relative z-10 flex-1 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-widest text-white border border-white/10 select-none shadow-sm animate-fade-in">
              <Zap className="h-3.5 w-3.5 text-[#FCD34D]" /> Powerful. Secure. Local.
            </div>
            <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight leading-[1.1] animate-slide-up">
              The Ultimate Form Companion
            </h1>
            <p className="mt-3.5 text-white/85 font-medium text-sm md:text-base leading-relaxed max-w-lg">
              A high-performance processing suite for all your document needs. Fast, secure, and completely local.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/tools"
                className="inline-flex items-center gap-2 bg-white text-[#4F46E5] font-bold text-sm px-6 py-3 rounded-xl shadow-[0_4px_24px_rgba(255,255,255,0.35)] hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer select-none group"
              >
                <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12 duration-200" />
                Explore Tools
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/25 active:scale-[0.98] transition-all cursor-pointer select-none"
              >
                <Eye className="h-4 w-4" />
                How It Works
              </Link>
            </div>
          </div>

          {/* Banner Right Content (System Overview Card) */}
          <div className="w-full lg:w-[360px] shrink-0 bg-black/15 backdrop-blur-md border border-white/15 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden group select-none animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/70">System Overview</span>
              <span className="text-xs font-bold text-white/90 hover:text-white inline-flex items-center gap-0.5 cursor-pointer select-none">
                View Details <ChevronRight className="h-3 w-3" />
              </span>
            </div>

            <div className="flex items-center justify-between gap-6 py-1">
              {/* Circular Percentage gauge */}
              <div className="relative h-20 w-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="stroke-white/10"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="stroke-[#22C55E]"
                    strokeWidth="7"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - 0.87)}`}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-black tracking-tight leading-none">87%</span>
                  <span className="text-[9px] font-bold opacity-75 mt-0.5 uppercase tracking-tighter">Ready</span>
                </div>
              </div>

              {/* Progress and mini stats right side */}
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-white/70 mb-1">
                    <span>Storage Used</span>
                    <span className="text-white font-black">23.4 MB</span>
                  </div>
                </div>

                {/* Substats */}
                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-2 text-center select-none">
                  <div>
                    <div className="text-lg font-black text-white leading-tight">12</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-white/60">Desk Items</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-white leading-tight">8</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-white/60">Vault Items</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* QUICK ACCESS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-black text-[#1E293B] tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#4F46E5]" /> Quick Access
              </h2>
              <p className="text-xs font-medium text-[#64748B]">Jump into your most used tools and workspaces</p>
            </div>
            <button className="h-9 px-3.5 rounded-xl border border-[#E2E8F0] hover:bg-white hover:border-[#CBD5E1] text-[#64748B] hover:text-[#475569] font-bold text-xs bg-[#F1F5F9] shadow-sm flex items-center gap-1.5 transition-all cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {/* Quick Access cards Grid (6) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              {
                id: "pdf_merge",
                title: "PDF Merge",
                desc: "Combine multiple PDF files",
                to: "/tools",
                gradient: "from-[#EF4444] to-[#FCA5A5]",
                iconBg: "bg-[#FEE2E2]",
                iconColor: "text-[#EF4444]",
                icon: FilePlus,
              },
              {
                id: "pdf_split",
                title: "PDF Split",
                desc: "Split PDF into multiple files",
                to: "/tools",
                gradient: "from-[#F97316] to-[#FDBA74]",
                iconBg: "bg-[#FFEDD5]",
                iconColor: "text-[#F97316]",
                icon: Scissors,
              },
              {
                id: "pdf_compress",
                title: "PDF Compress",
                desc: "Reduce file size without quality loss",
                to: "/tools",
                gradient: "from-[#8B5CF6] to-[#C084FC]",
                iconBg: "bg-[#F3E8FF]",
                iconColor: "text-[#8B5CF6]",
                icon: FileMinus,
              },
              {
                id: "pdf_gen",
                title: "Image to PDF",
                desc: "Convert images to PDF",
                to: "/tools",
                gradient: "from-[#10B981] to-[#6EE7B7]",
                iconBg: "bg-[#D1FAE5]",
                iconColor: "text-[#10B981]",
                icon: FileStack,
              },
              {
                id: "pdf_to_img",
                title: "PDF to Image",
                desc: "Convert PDF pages to images",
                to: "/tools",
                gradient: "from-[#3B82F6] to-[#93C5FD]",
                iconBg: "bg-[#DBEAFFE]",
                iconColor: "text-[#3B82F6]",
                icon: FilePlus,
              },
              {
                id: "form_fill",
                title: "Form Fill",
                desc: "Fill and save forms easily",
                to: "/tools",
                gradient: "from-[#EC4899] to-[#F9A8D4]",
                iconBg: "bg-[#FCE7F3]",
                iconColor: "text-[#EC4899]",
                icon: Edit,
              },
            ].map((tool) => (
              <Link
                key={tool.id}
                to={tool.to}
                className="bg-white border border-[#E2E8F0] p-5 rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group select-none cursor-pointer flex flex-col justify-between min-h-[160px]"
              >
                <div className="flex flex-col gap-4">
                  {/* Gradient-tinted icon bg */}
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${tool.iconBg} ${tool.iconColor}`}>
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B] group-hover:text-[#4F46E5] transition duration-200">
                      {tool.title}
                    </h3>
                    <p className="text-[11px] font-medium text-[#64748B] mt-1 leading-normal line-clamp-2">
                      {tool.desc}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end pt-2 text-[#94A3B8] group-hover:text-[#4F46E5] transition-all">
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 duration-200" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* PROCESSING DESK & PERMANENT VAULT ACTION CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-none">
          {/* PROCESSING DESK (LEFT) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 lg:p-7 shadow-sm flex flex-col gap-5 hover:shadow-md transition duration-300 min-h-[300px] justify-between group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Folder className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1E293B] tracking-tight">Processing Desk</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-extrabold text-[#4F46E5] uppercase tracking-wider">12 Items</span>
                    <span className="h-1 w-1 bg-[#64748B]/40 rounded-full" />
                    <span className="text-[10px] font-bold text-[#64748B]">Images and PDFs for active processing</span>
                  </div>
                </div>
              </div>
              <Link to="/tools" className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-0.5 cursor-pointer select-none">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Dropzone with illustration */}
            <div className="flex flex-col md:flex-row items-center justify-between border-2 border-dashed border-[#C7D2FE] bg-[#EEF2FF]/60 hover:bg-[#EEF2FF] p-5 rounded-2xl gap-5 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white border border-[#C7D2FE] flex items-center justify-center shrink-0 text-[#4F46E5] shadow-sm">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-[#1E293B]">Drop files here or click to upload</div>
                  <div className="text-[10px] font-medium text-[#64748B] mt-0.5">
                    Supports: <span className="font-bold text-[#4F46E5]">PDF, PNG, JPG, WebP</span>
                  </div>
                </div>
              </div>
              <Link to="/tools" className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all whitespace-nowrap cursor-pointer">
                Upload Files
              </Link>
            </div>
          </div>

          {/* PERMANENT VAULT (RIGHT) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 lg:p-7 shadow-sm flex flex-col gap-5 hover:shadow-md transition duration-300 min-h-[300px] justify-between group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#1E293B] tracking-tight">Permanent Vault</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-extrabold text-[#22C55E] uppercase tracking-wider">8 Items</span>
                    <span className="h-1 w-1 bg-[#64748B]/40 rounded-full" />
                    <span className="text-[10px] font-bold text-[#64748B]">Secure storage for important documents</span>
                  </div>
                </div>
              </div>
              <Link to="/documents" className="text-xs font-bold text-[#22C55E] hover:underline flex items-center gap-0.5 cursor-pointer select-none">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Dropzone for Vault */}
            <div className="flex flex-col md:flex-row items-center justify-between border-2 border-dashed border-[#BBF7D0] bg-[#F0FDF4]/60 hover:bg-[#F0FDF4] p-5 rounded-2xl gap-5 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white border border-[#BBF7D0] flex items-center justify-center shrink-0 text-[#22C55E] shadow-sm">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-[#1E293B]">Drop files here or click to secure</div>
                  <div className="text-[10px] font-medium text-[#64748B] mt-0.5">
                    Encrypted storage • <span className="font-bold text-[#22C55E]">Access anytime</span>
                  </div>
                </div>
              </div>
              <Link to="/documents" className="bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all whitespace-nowrap cursor-pointer">
                Open Vault
              </Link>
            </div>
          </div>
        </div>

        {/* BOTTOM STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
          {[
            { label: "Total Files", value: "20", sub: "Across all locations", icon: FileText, color: "text-[#4F46E5]", bg: "bg-[#EEF2FF]" },
            { label: "Storage Used", value: "23.4 MB", sub: "Across saved documents", icon: Database, color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
            { label: "Tools Available", value: "18", sub: "Powerful tools", icon: Zap, color: "text-[#8B5CF6]", bg: "bg-[#F3E8FF]" },
            { label: "Success Rate", value: "99.9%", sub: "Processing accuracy", icon: CheckCircle2, color: "text-[#10B981]", bg: "bg-[#D1FAE5]" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-[#E2E8F0] p-5 rounded-2xl hover:shadow-[0_6px_20px_rgb(0,0,0,0.04)] transition duration-300 flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#64748B]">{stat.label}</div>
                <div className="text-2xl font-black text-[#1E293B] tracking-tight mt-0.5">{stat.value}</div>
                <div className="text-[10px] font-medium text-[#94A3B8] mt-0.5 leading-none">{stat.sub}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
