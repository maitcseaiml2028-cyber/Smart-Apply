import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { 
  UploadCloud, 
  FileText, 
  FolderOpen,
  MoreHorizontal, 
  CheckCircle2, 
  Image as ImageIcon, 
  PenLine, 
  ScrollText,
  Trash2,
  Loader2,
  FileUp
} from "lucide-react";
import { useState, useRef } from "react";
import { getDocuments, uploadDocument, deleteDocument } from "@/lib/data-server";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Documents — Smart Apply" }] }),
  loader: () => getDocuments(),
  component: DocumentsPage,
});

const ICON_MAP: Record<string, any> = {
  Photo: ImageIcon,
  Signature: PenLine,
  "ID Proof": ScrollText,
  Education: FileText,
  Other: FileText,
};

const TINT_MAP: Record<string, string> = {
  Photo: "from-primary/15 to-primary/5",
  Signature: "from-accent/20 to-accent/5",
  "ID Proof": "from-success/15 to-success/5",
  Education: "from-warning/20 to-warning/5",
  Other: "from-info/15 to-info/5",
};

function DocumentsPage() {
  const docs = useLoaderData({ from: "/documents" }) || [];
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setProgress(5);
    
    for (const file of Array.from(files)) {
      try {
        // Fake progress for UI
        const pInterval = setInterval(() => {
          setProgress(prev => prev < 90 ? prev + 10 : prev);
        }, 100);

        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        clearInterval(pInterval);
        setProgress(95);

        const type = file.type.includes("image") ? "Photo" : file.type.includes("pdf") ? "Education" : "Other";
        const size = (file.size / 1024).toFixed(1) + " KB";

        await uploadDocument({
          data: {
            name: file.name,
            type,
            size,
            dataUrl
          }
        });

        setProgress(100);
        setTimeout(() => setProgress(0), 1000);
        toast.success(`${file.name} uploaded to vault`);
        router.invalidate();
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setIsUploading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument({ data: { id } });
      toast.info("Document deleted");
      router.invalidate();
    } catch (err) {
      toast.error("Failed to delete document");
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl gradient-hero p-8 text-primary-foreground shadow-elevated">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "var(--gradient-mesh)" }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-[10px] font-semibold uppercase tracking-widest mb-4">
              <FolderOpen className="h-3 w-3" /> Secure Storage
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-none">Document Vault</h1>
            <p className="text-primary-foreground/80 mt-3 text-base font-medium leading-relaxed max-w-xl">
              Encrypted on-device storage for your photos, signatures, and certificates.
            </p>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileUpload(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`group cursor-pointer rounded-[2.5rem] border-2 border-dashed p-14 text-center transition-all duration-500 relative overflow-hidden ${
            dragging ? "border-primary bg-primary/5 scale-[1.01] shadow-glow" : "border-border/60 bg-card hover:border-primary/40 hover:bg-secondary/20"
          }`}
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
            <UploadCloud className="h-[300px] w-[300px]" />
          </div>
          
          <div className="relative z-10">
            <div className={`mx-auto h-20 w-20 rounded-[2rem] flex items-center justify-center shadow-elevated transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${isUploading ? "bg-secondary animate-pulse" : "gradient-primary"}`}>
              {isUploading ? <Loader2 className="h-10 w-10 text-primary animate-spin" /> : <UploadCloud className="h-10 w-10 text-primary-foreground" />}
            </div>
            <h3 className="mt-8 text-xl font-bold tracking-tight">Drop files here, or click to browse</h3>
            <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-widest opacity-60">PNG, JPG, PDF up to 10MB · End-to-end encrypted</p>
            
            {progress > 0 && (
              <div className="max-w-md mx-auto mt-10 space-y-3">
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden border border-border/50">
                  <div className="h-full gradient-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between items-center px-1">
                   <div className="text-[10px] font-black uppercase tracking-tighter text-primary">{progress < 100 ? "Processing Security…" : "Sync Complete"}</div>
                   <div className="text-[10px] font-black text-muted-foreground">{progress}%</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept="image/*,application/pdf"
          onChange={(e) => handleFileUpload(e.target.files)} 
        />

        <div className="pt-4">
          <div className="flex items-end justify-between mb-8 px-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Your Documents</h2>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">{docs.length} items securely stored</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {docs.map((d) => {
              const Icon = ICON_MAP[d.type] || FileText;
              const tint = TINT_MAP[d.type] || "from-secondary/50 to-secondary/20";
              return (
                <div key={d.id} className="group rounded-[2rem] border border-border/60 bg-card overflow-hidden hover:shadow-elevated transition-all duration-500 animate-in zoom-in-95">
                  <div className={`relative h-44 bg-gradient-to-br ${tint} flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-700`}>
                    <Icon className="h-16 w-16 text-foreground/20 group-hover:text-primary/30 transition-colors" strokeWidth={1.5} />
                    {d.verified && (
                      <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/90 backdrop-blur text-[10px] font-black text-success border border-success/20 shadow-sm uppercase tracking-tighter">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="text-xs font-black text-white uppercase tracking-tighter line-clamp-1">{d.name}</span>
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-black truncate pr-4">{d.name}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{d.type}</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-[10px] font-black text-primary/70">{d.size}</span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-10 w-10 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all border border-transparent hover:border-border">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl p-2 border-border shadow-elevated min-w-[160px]">
                        <DropdownMenuItem className="rounded-xl font-bold text-xs gap-3 p-3 focus:bg-secondary">
                          <FileUp className="h-4 w-4" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(d.id)}
                          className="rounded-xl font-bold text-xs gap-3 p-3 text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" /> Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
            {docs.length === 0 && (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center border-4 border-dashed border-border/40 rounded-[3rem] opacity-30">
                <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
                <p className="text-sm font-black uppercase tracking-widest">Your vault is empty</p>
                <p className="text-xs font-medium mt-1">Upload your first document above to start.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
