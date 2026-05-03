import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PenLine, Loader2 } from "lucide-react";
import { updateApplication } from "@/lib/data-server";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

export function EditApplicationModal({ app, children }: { app: any; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(app.status);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.status = status;
    data.id = app.id;

    try {
      const res = await updateApplication({ data });
      if (res.error) throw new Error(res.error);
      toast.success("Application updated");
      setOpen(false);
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
            <PenLine className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-border bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">Edit Application</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Application Name</Label>
              <Input id="name" name="name" defaultValue={app.name} required className="rounded-xl" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="link">Official Link</Label>
              <Input id="link" name="link" defaultValue={app.link} required className="rounded-xl" />
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
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="applyDate">Apply Date</Label>
              <Input id="applyDate" name="applyDate" defaultValue={app.applyDate} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admitDate">Admit Card Date</Label>
              <Input id="admitDate" name="admitDate" defaultValue={app.admitDate} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examDate">Exam Date</Label>
              <Input id="examDate" name="examDate" defaultValue={app.examDate} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultDate">Result Date</Label>
              <Input id="resultDate" name="resultDate" defaultValue={app.resultDate} className="rounded-xl" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow mt-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
