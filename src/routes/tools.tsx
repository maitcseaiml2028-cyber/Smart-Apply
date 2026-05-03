import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Maximize, 
  Minimize, 
  Crop as CropIcon, 
  FilePlus, 
  FileStack, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  Trash2,
  RefreshCcw,
  Zap,
  Plus,
  FileText,
  FileMinus,
  Monitor,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { getAllAssets, saveAsset, deleteAsset as removeAssetDB, Asset } from "@/lib/db-assets";
import { getDocuments, deleteDocument } from "@/lib/data-server";

// Import Refactored Tools
import { ResizeTool } from "@/components/tools/ResizeTool";
import { BulkCompressTool } from "@/components/tools/BulkCompressTool";
import { CropTool } from "@/components/tools/CropTool";
import { MultiImagePdfTool } from "@/components/tools/MultiImagePdfTool";
import { PdfMergeTool } from "@/components/tools/PdfMergeTool";
import { PdfCompressTool } from "@/components/tools/PdfCompressTool";
import { FormatConverter } from "@/components/tools/FormatConverter";

export const Route = createFileRoute("/tools")({
  head: () => ({ meta: [{ title: "Toolkit — Smart Apply" }] }),
  component: ToolsPage,
});

type ToolType = "image_resize" | "image_compress" | "image_crop" | "pdf_gen" | "pdf_merge" | "pdf_compress" | "format_converter";

function ToolsPage() {
  const [activeTool, setActiveTool] = useState<ToolType>("image_resize");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [toolSelectedIds, setToolSelectedIds] = useState<string[]>([]);
  
  const refreshAssets = async () => {
    try {
      const idbData = await getAllAssets();
      const sqliteDocs = await getDocuments();
      
      const mappedSqlite: Asset[] = sqliteDocs.map(d => ({
        id: d.id,
        type: d.type === "Photo" ? "photo" : d.type === "Signature" ? "signature" : "pdf",
        category: "permanent",
        name: d.name,
        dataUrl: d.filePath || "",
        size: Math.round(d.filePath?.length * 0.75 || 0),
        createdAt: Date.now()
      }));

      const allAssets = [...idbData];
      mappedSqlite.forEach(sq => {
        if (!allAssets.find(a => a.id === sq.id)) {
          allAssets.push(sq);
        }
      });

      setAssets(allAssets);
    } catch (e) {
      console.error("Failed to load assets", e);
      toast.error("Failed to access storage");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAssets();
  }, []);

  const toggleToolSelection = (id: string) => {
    setToolSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const addAsset = async (type: Asset["type"], name: string, dataUrl: string, category: Asset["category"] = "workspace") => {
    const asset: Asset = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      category,
      name,
      dataUrl,
      size: Math.round((dataUrl.length * 3) / 4),
      createdAt: Date.now()
    };
    
    try {
      await saveAsset(asset);
      await refreshAssets();
      toast.success(`${name} saved to ${category === "permanent" ? "Vault" : "Desk"}`);
    } catch (e) {
      toast.error("Storage full or access denied");
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await removeAssetDB(id);
      await deleteDocument({ data: { id } });
      await refreshAssets();
      setToolSelectedIds(prev => prev.filter(i => i !== id));
      toast.info("Document removed");
    } catch (e) {
      await refreshAssets();
      toast.info("Document sync updated");
    }
  };

  const workspaceAssets = useMemo(() => assets.filter(a => a.category === "workspace"), [assets]);
  const permanentAssets = useMemo(() => assets.filter(a => a.category === "permanent"), [assets]);
  const totalSizeMB = useMemo(() => (assets.reduce((acc, a) => acc + a.size, 0) / (1024 * 1024)).toFixed(1), [assets]);
  const selectedAssets = useMemo(() => assets.filter(a => toolSelectedIds.includes(a.id)), [assets, toolSelectedIds]);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
        <div className="relative overflow-hidden rounded-3xl gradient-hero p-8 text-primary-foreground shadow-elevated">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "var(--gradient-mesh)" }} />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-[10px] font-semibold uppercase tracking-widest mb-4">
                <Zap className="h-3 w-3" /> Robust Storage Enabled (50MB+)
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-none">
                The Ultimate <br/>Form Companion
              </h1>
              <p className="text-primary-foreground/80 mt-4 text-base font-medium leading-relaxed">
                A high-performance processing suite for all your document needs. Fast, secure, and completely local.
              </p>
            </div>
            <div className="w-full md:w-80 shrink-0">
               <Card className="bg-white/10 backdrop-blur-xl border-white/20 p-6 rounded-2xl shadow-2xl text-primary-foreground">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10px] uppercase tracking-widest opacity-70">Vault Capacity</span>
                      <span className="text-[10px] font-black">{totalSizeMB} MB / 50.0 MB</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                       <div 
                        className="h-full bg-white transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (parseFloat(totalSizeMB) / 50) * 100)}%` }}
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                       <div className="text-center">
                         <div className="text-lg font-black">{workspaceAssets.length}</div>
                         <div className="text-[9px] uppercase font-bold opacity-60">Desk Items</div>
                       </div>
                       <div className="text-center">
                         <div className="text-lg font-black">{permanentAssets.length}</div>
                         <div className="text-[9px] uppercase font-bold opacity-60">Vault Items</div>
                       </div>
                    </div>
                  </div>
               </Card>
            </div>
          </div>
        </div>

        <section className="space-y-8">
          <div className="flex items-end justify-between px-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Saved Assets</h2>
              <p className="text-muted-foreground font-medium">Click any thumbnail to load it into the active tool below.</p>
            </div>
            <Button variant="outline" onClick={refreshAssets} className="rounded-xl h-10 gap-2 border-border/50 hover:bg-secondary">
              <History className="h-4 w-4" /> Refresh
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <CategorySection title="Processing Desk" assets={workspaceAssets} category="workspace" onAdd={addAsset} onDelete={deleteAsset} onToggleSelect={toggleToolSelection} selectedIds={toolSelectedIds} icon={Zap} color="text-primary" description="Images and PDFs for active processing" />
            <CategorySection title="Permanent Vault" assets={permanentAssets} category="permanent" onAdd={addAsset} onDelete={deleteAsset} onToggleSelect={toggleToolSelection} selectedIds={toolSelectedIds} icon={ShieldCheck} color="text-success" description="Saved official documents and records" />
          </div>
        </section>

        <section className="space-y-8 pt-6">
          <div className="flex items-center gap-4 px-2">
            <div className="h-10 w-10 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Active Suite</h2>
          </div>

          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-3 space-y-3">
              {[
                { id: "image_resize", label: "Image Resize", icon: Maximize, desc: "Change photo dimensions" },
                { id: "image_compress", label: "Image Compress", icon: Minimize, desc: "Shrink file size (KB)" },
                { id: "image_crop", label: "Image Crop", icon: CropIcon, desc: "Cut to specific ratio" },
                { id: "pdf_gen", label: "Image → PDF", icon: FileStack, desc: "Multi-image support" },
                { id: "pdf_merge", label: "PDF Merge", icon: FilePlus, desc: "Join multiple files" },
                { id: "pdf_compress", label: "PDF Compressor", icon: FileMinus, desc: "Reduce PDF file size" },
                { id: "format_converter", label: "Format Converter", icon: RefreshCcw, desc: "JPG ↔ PNG ↔ PDF" },
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id as any)}
                  className={`w-full text-left p-5 rounded-3xl border-2 transition-all duration-300 group relative overflow-hidden ${
                    activeTool === tool.id 
                      ? "bg-foreground text-background border-foreground shadow-elevated scale-105 z-10" 
                      : "bg-card border-border hover:border-primary/40 hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <tool.icon className={`h-5 w-5 ${activeTool === tool.id ? "" : "text-primary"}`} />
                    <div>
                      <div className="text-sm font-black">{tool.label}</div>
                      <div className={`text-[10px] font-bold ${activeTool === tool.id ? "opacity-60" : "text-muted-foreground"}`}>{tool.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-9 bg-card border border-border rounded-[3rem] p-10 lg:p-16 shadow-elevated relative overflow-hidden min-h-[700px]">
               <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none">
                  <Zap className="h-[400px] w-[400px]" />
               </div>
               
                <div className="relative z-10">
                  {activeTool === "image_resize" && <ResizeTool assets={selectedAssets} onRemoveFromTool={toggleToolSelection} />}
                  {activeTool === "image_compress" && <BulkCompressTool assets={selectedAssets} onRemoveFromTool={toggleToolSelection} />}
                  {activeTool === "image_crop" && <CropTool assets={selectedAssets} onRemoveFromTool={toggleToolSelection} />}
                  {activeTool === "pdf_gen" && <MultiImagePdfTool assets={selectedAssets} onRemoveFromTool={toggleToolSelection} />}
                  {activeTool === "pdf_merge" && <PdfMergeTool assets={selectedAssets} onRemoveFromTool={toggleToolSelection} />}
                  {activeTool === "pdf_compress" && <PdfCompressTool assets={selectedAssets} onRemoveFromTool={toggleToolSelection} onAddAsset={addAsset} />}
                  {activeTool === "format_converter" && <FormatConverter assets={selectedAssets} onRemoveFromTool={toggleToolSelection} />}
               </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function CategorySection({ title, assets, category, onAdd, onDelete, onToggleSelect, selectedIds, icon: Icon, color, description }: any) {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const type = file.type === "application/pdf" ? "pdf" : "photo";
      const reader = new FileReader();
      reader.onload = (ev) => onAdd(type, file.name, ev.target?.result as string, category);
      reader.readAsDataURL(file);
    });
  };

  return (
    <Card 
      className="bg-card/50 border-border/50 rounded-[2.5rem] p-8 space-y-4 transition-all duration-500 hover:shadow-elevated hover:bg-card group flex flex-col h-[450px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center transition-transform duration-500 shrink-0 ${isHovered ? "scale-110 rotate-3" : ""}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold truncate">{title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest shrink-0">{assets.length} Items</p>
               <span className="h-1 w-1 rounded-full bg-border shrink-0" />
               <p className="text-[10px] font-medium text-muted-foreground/60 truncate">{description}</p>
            </div>
          </div>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} size="icon" variant="secondary" className="h-10 w-10 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm shrink-0">
           <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div className="grid grid-cols-3 gap-3 pb-2">
          {assets.map((asset: Asset) => (
            <div key={asset.id} className="group/item relative aspect-square rounded-2xl overflow-hidden border-2 border-transparent transition-all cursor-pointer">
              <div 
                onClick={() => onToggleSelect(asset.id)} 
                className={`w-full h-full relative overflow-hidden rounded-xl border-2 transition-all ${selectedIds.includes(asset.id) ? "border-primary ring-2 ring-primary ring-inset" : "border-transparent"}`}
              >
                 {asset.type === "pdf" ? (
                   <div className="w-full h-full bg-secondary/30 flex items-center justify-center">
                     <FileText className={`h-8 w-8 ${selectedIds.includes(asset.id) ? "text-primary" : "text-muted-foreground/30"}`} />
                   </div>
                 ) : (
                   <img src={asset.dataUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110" alt="" />
                 )}
                 {selectedIds.includes(asset.id) && (
                   <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                     <CheckCircle2 className="text-white h-8 w-8 drop-shadow-lg animate-in zoom-in-50 duration-300" />
                   </div>
                 )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[9px] font-black text-white leading-tight line-clamp-1 uppercase tracking-tighter">{asset.name}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}
                className="absolute top-1 right-1 h-6 w-6 bg-destructive text-destructive-foreground rounded-lg flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity shadow-lg z-20"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {assets.length === 0 && (
            <div className="col-span-3 h-40 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center opacity-20 text-center px-4">
              <Upload className="h-8 w-8 mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Vault is empty. <br/>Upload {title} here.</p>
            </div>
          )}
        </div>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" multiple onChange={handleUpload} />
    </Card>
  );
}
