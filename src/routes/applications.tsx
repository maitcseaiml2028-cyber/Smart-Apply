import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Filter, Plus, ExternalLink, LayoutGrid, List as ListIcon, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { getApplications } from "@/lib/data-server";

export const Route = createFileRoute("/applications")({
  head: () => ({ meta: [{ title: "Applications — Smart Apply" }] }),
  loader: () => getApplications(),
  component: ApplicationsPage,
});

type Status = "submitted" | "pending" | "approved" | "rejected" | "exam-scheduled" | "result-out";

const filters: ("all" | Status)[] = ["all", "submitted", "pending", "approved", "exam-scheduled", "result-out", "rejected"];

import { NewApplicationModal } from "@/components/NewApplicationModal";
import { EditApplicationModal } from "@/components/EditApplicationModal";

function ApplicationsPage() {
  const loaderData = useLoaderData({ from: "/applications" });
  const items = Array.isArray(loaderData) ? loaderData : [];
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [view, setView] = useState<"table" | "grid">("table");

  const filtered = useMemo(
    () => items.filter((i) => {
      if (!i) return false;
      const matchesFilter = filter === "all" || i.status === filter;
      const matchesSearch = (i.name || "").toLowerCase().includes(q.toLowerCase());
      return matchesFilter && matchesSearch;
    }),
    [q, filter, items]
  );

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-3xl gradient-hero p-8 text-primary-foreground shadow-elevated">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "var(--gradient-mesh)" }} />
          <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-[10px] font-semibold uppercase tracking-widest mb-4">
                <FileText className="h-3 w-3" /> Central Tracker
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-none">Application Center</h1>
              <p className="text-primary-foreground/80 mt-3 text-base font-medium leading-relaxed max-w-xl">
                Every form, exam date and result tracked in one intelligent place.
              </p>
            </div>
            <div className="shrink-0">
               <NewApplicationModal />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by application name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-transparent focus:border-ring focus:bg-background focus:ring-4 focus:ring-ring/15 focus:outline-none text-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filter === f ? "bg-primary text-primary-foreground shadow-soft" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f.replace("-", " ")}
              </button>
            ))}
          </div>
          <div className="inline-flex p-1 rounded-lg bg-secondary/60 ml-auto">
            <button onClick={() => setView("table")} className={`p-1.5 rounded-md ${view === "table" ? "bg-card shadow-soft" : "text-muted-foreground"}`}>
              <ListIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setView("grid")} className={`p-1.5 rounded-md ${view === "grid" ? "bg-card shadow-soft" : "text-muted-foreground"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {view === "table" ? (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-secondary/30">
                    <th className="text-left font-medium px-5 py-3">Form name</th>
                    <th className="text-left font-medium px-5 py-3">Apply</th>
                    <th className="text-left font-medium px-5 py-3">Admit card</th>
                    <th className="text-left font-medium px-5 py-3">Exam</th>
                    <th className="text-left font-medium px-5 py-3">Result</th>
                    <th className="text-left font-medium px-5 py-3">Status</th>
                    <th className="text-right font-medium px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-secondary/30 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-medium">{r.name}</div>
                        <a href={r.link.startsWith("http") ? r.link : `https://${r.link}`} target="_blank" className="text-[11px] text-primary inline-flex items-center gap-1 mt-0.5 hover:underline">
                          {r.link} <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{r.applyDate || "—"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{r.admitDate || "—"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{r.examDate || "—"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{r.resultDate || "—"}</td>
                      <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-4 text-right">
                        <EditApplicationModal app={r} />
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No applications match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-5 hover-lift">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{r.name}</h3>
                    <a href={r.link.startsWith("http") ? r.link : `https://${r.link}`} target="_blank" className="text-[11px] text-primary inline-flex items-center gap-1 mt-1 hover:underline">{r.link} <ExternalLink className="h-3 w-3" /></a>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={r.status} />
                    <EditApplicationModal app={r} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  {[["Apply", r.applyDate], ["Admit", r.admitDate], ["Exam", r.examDate], ["Result", r.resultDate]].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-secondary/40 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                      <div className="font-medium mt-0.5">{v || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
