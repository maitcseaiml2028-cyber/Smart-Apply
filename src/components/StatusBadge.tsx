type Status = "submitted" | "pending" | "approved" | "rejected" | "exam-scheduled" | "result-out";

const map: Record<Status, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-info/10 text-info border-info/20" },
  pending: { label: "Pending", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  approved: { label: "Approved", className: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
  "exam-scheduled": { label: "Exam Scheduled", className: "bg-primary/10 text-primary border-primary/20" },
  "result-out": { label: "Result Out", className: "bg-accent/15 text-accent-foreground border-accent/30" },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${s.className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
