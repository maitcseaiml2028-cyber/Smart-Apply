import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { createApplication } from "@/lib/data-server";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

export function NewApplicationModal({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("pending");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    // Manually add status because Radix Select doesn't work with native FormData easily
    data.status = status;

    try {
      const res = await createApplication({ data });
      if (res.error) throw new Error(res.error);
      toast.success("Application added successfully");
      setOpen(false);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Failed to add application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-glow hover:scale-[1.02] transition-transform">
            <Plus className="h-4 w-4" /> New application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-border bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">New Application</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Application Name</Label>
              <Input id="name" name="name" placeholder="e.g. UPSC Civil Services 2026" required className="rounded-xl" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="link">Official Link</Label>
              <Input id="link" name="link" placeholder="e.g. upsc.gov.in" required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Current Status</Label>
              <Select onValueChange={setStatus} defaultValue={status}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="exam-scheduled">Exam Scheduled</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="result-out">Result Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="applyDate">Apply Date</Label>
              <Input id="applyDate" name="applyDate" defaultValue={new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admitDate">Admit Card Date</Label>
              <Input id="admitDate" name="admitDate" placeholder="e.g. May 18" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examDate">Exam Date</Label>
              <Input id="examDate" name="examDate" placeholder="e.g. May 26" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultDate">Result Date</Label>
              <Input id="resultDate" name="resultDate" placeholder="e.g. Jul 14" className="rounded-xl" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow mt-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Application
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
