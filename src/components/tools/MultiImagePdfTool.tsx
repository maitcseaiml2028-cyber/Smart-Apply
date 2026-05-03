import { useState, useMemo, useEffect, useRef } from "react";
import { 
  Trash2, Zap, FileStack, Loader2, Target, ChevronLeft, Download, Files, CheckCircle2, FilePlus, ChevronRight, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import { Asset } from "@/lib/db-assets";

export function MultiImagePdfTool({ 
  assets, 
  onRemoveFromTool,
  onAddAsset
}: { 
  assets: Asset[], 
  onRemoveFromTool: (id: string) => void,
  onAddAsset?: (type: Asset["type"], name: string, dataUrl: string, category: Asset["category"]) => void
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [status, setStatus] = useState("Optimizing images...");
  
  const [localUploadedFiles, setLocalUploadedFiles] = useState<Asset[]>([]);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [finalResult, setFinalResult] = useState<any>(null);

  const [compressMode, setCompressMode] = useState<"kb" | "percent">("kb");
  const [targetKb, setTargetKb] = useState(300);
  const [quality, setQuality] = useState(0.8);
  const [pageSizeMode, setPageSizeMode] = useState<"original" | "a4">("original");
  const [pageOrientation, setPageOrientation] = useState<"portrait" | "landscape">("portrait");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const incomingImages = useMemo(() => [
    ...assets.filter(a => a.type === "image" || a.type === "photo" || a.type === "signature"), 
    ...localUploadedFiles
  ], [assets, localUploadedFiles]);

  useEffect(() => {
    setOrderedIds(prev => {
      const currentIds = incomingImages.map(a => a.id);
      const newIds = prev.filter(id => currentIds.includes(id));
      currentIds.forEach(id => {
        if (!newIds.includes(id)) newIds.push(id);
      });
      return newIds;
    });
  }, [incomingImages]);

  const images = useMemo(() => {
    return orderedIds.map(id => incomingImages.find(a => a.id === id)).filter(Boolean) as Asset[];
  }, [orderedIds, incomingImages]);

  const moveImage = (index: number, direction: -1 | 1) => {
    setOrderedIds(prev => {
      const newIds = [...prev];
      const temp = newIds[index];
      newIds[index] = newIds[index + direction];
      newIds[index + direction] = temp;
      return newIds;
    });
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    files.forEach(file => {
      if (!file.type.startsWith("image/")) {
        toast.error(`Skipped ${file.name} - not an image.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        const newAsset: Asset = {
          id: Math.random().toString(36).substring(2, 11),
          name: file.name,
          type: "image",
          dataUrl,
          size: file.size,
          category: "workspace",
          createdAt: new Date().toISOString(),
        };
        setLocalUploadedFiles(prev => [...prev, newAsset]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeLocalFile = (id: string) => {
    setLocalUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    setOrderedIds((prev) => prev.filter((fid) => fid !== id));
  };

  const compressSingleImage = (dataUrl: string, targetPerImage: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        if (compressMode === "kb") {
          // Adobe-level iterative scale down + binary search for each image
          let currentSize = Infinity;
          let bestDataUrl = "";
          let minQ = 0.01, maxQ = 1.0, bestQ = 0.01;
          
          for (let i = 0; i < 10; i++) {
            const midQ = (minQ + maxQ) / 2;
            const res = canvas.toDataURL("image/jpeg", midQ);
            const sizeKb = (res.length * 0.75) / 1024;
            
            if (sizeKb <= targetPerImage) {
              if (sizeKb > (currentSize === Infinity ? 0 : currentSize) || bestDataUrl === "") {
                bestQ = midQ;
                bestDataUrl = res;
                currentSize = sizeKb;
              }
              minQ = midQ + 0.001;
            } else {
              maxQ = midQ - 0.001;
            }
          }

          // If it didn't fit, scale down dimensions
          let scale = 1.0;
          while (currentSize > targetPerImage && scale > 0.4) {
            scale -= 0.1;
            const c2 = document.createElement("canvas");
            c2.width = Math.round(img.width * scale);
            c2.height = Math.round(img.height * scale);
            const ctx2 = c2.getContext("2d")!;
            ctx2.fillStyle = "#ffffff";
            ctx2.fillRect(0, 0, c2.width, c2.height);
            ctx2.drawImage(img, 0, 0, c2.width, c2.height);
            bestDataUrl = c2.toDataURL("image/jpeg", 0.15);
            currentSize = (bestDataUrl.length * 0.75) / 1024;
          }

          resolve(bestDataUrl || canvas.toDataURL("image/jpeg", 0.01));
        } else {
          resolve(canvas.toDataURL("image/jpeg", quality));
        }
      };
      img.src = dataUrl;
    });
  };

  const buildPdf = async () => {
    if (images.length === 0) {
      toast.error("Please add at least 1 image to build the PDF.");
      return;
    }

    setIsProcessing(true);
    setHasResults(false);
    setStatus("Analyzing files and sequence...");

    try {
      const pdfDoc = await PDFDocument.create();
      let combinedOriginalSize = 0;
      
      const targetPerImage = (targetKb * 0.95) / Math.max(images.length, 1);

      for (let i = 0; i < images.length; i++) {
        const asset = images[i];
        setStatus(`Embedding image ${i + 1} of ${images.length}...`);
        combinedOriginalSize += asset.size;
        
        const optimizedDataUrl = await compressSingleImage(asset.dataUrl, targetPerImage);
        const imageBytes = await fetch(optimizedDataUrl).then(res => res.arrayBuffer());
        
        const img = await pdfDoc.embedJpg(imageBytes);
        
        let pageWidth = img.width;
        let pageHeight = img.height;
        let x = 0;
        let y = 0;
        let width = img.width;
        let height = img.height;

        if (pageSizeMode === "a4") {
          pageWidth = 595.28;
          pageHeight = 841.89;
          if (pageOrientation === "landscape") {
            pageWidth = 841.89;
            pageHeight = 595.28;
          }

          const scale = Math.min(pageWidth / img.width, pageHeight / img.height);
          width = img.width * scale;
          height = img.height * scale;

          x = (pageWidth - width) / 2;
          y = (pageHeight - height) / 2;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(img, { x, y, width, height });
      }

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      const compressedSizeKb = Math.round(pdfBytes.length / 1024);
      const originalSizeKb = Math.round(combinedOriginalSize / 1024);

      // Convert to pure Base64 natively
      let binary = "";
      const bytes = new Uint8Array(pdfBytes);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const dataUrl = `data:application/pdf;base64,${btoa(binary)}`;

      setFinalResult({
        name: `compiled_${images.length}_images.pdf`,
        url,
        dataUrl,
        oldSize: originalSizeKb,
        newSize: compressedSizeKb,
        totalPages: images.length,
        hitTarget: compressedSizeKb <= targetKb,
        ratio: Math.round(((originalSizeKb - compressedSizeKb) / originalSizeKb) * 100) || 0
      });

      setHasResults(true);
      toast.success("PDF built successfully! ✅");
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>

          <h3 className="text-4xl font-black tracking-tight">Image-to-PDF Studio</h3>
          <p className="text-muted-foreground mt-2 font-medium max-w-xl text-lg">
            Batch sequence images and optimize file sizes into high-fidelity PDFs.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4">
        {/* Left Column: Settings */}
        <div className="space-y-8">
          
          {/* Compression Output */}
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">1. Set PDF File Target</Label>
            <div className="p-1 bg-secondary/30 rounded-[1.5rem] border border-border flex">
              <button onClick={() => setCompressMode("kb")} className={`flex-1 py-3 text-xs font-black rounded-[1.25rem] transition-all cursor-pointer ${compressMode === "kb" ? "bg-foreground text-background font-black shadow-md" : "text-muted-foreground hover:text-foreground"}`}>Exact KB Target</button>
              <button onClick={() => setCompressMode("percent")} className={`flex-1 py-3 text-xs font-black rounded-[1.25rem] transition-all cursor-pointer ${compressMode === "percent" ? "bg-foreground text-background font-black shadow-md" : "text-muted-foreground hover:text-foreground"}`}>Quality Percentage</button>
            </div>

            <div className="p-6 bg-secondary/30 rounded-[2rem] border border-border space-y-6">
              {compressMode === "kb" ? (
                <>
                  <div className="flex items-center gap-4">
                    <Target className="h-6 w-6 text-primary" />
                    <div className="flex-1">
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 select-none">Enter Custom Target</div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={targetKb}
                          min={1}
                          max={5000}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setTargetKb(isNaN(val) ? 0 : val);
                          }}
                          className="w-28 h-12 px-4 bg-card border-2 border-primary/30 rounded-xl font-black text-xl text-primary focus:outline-none focus:border-primary"
                        />
                        <span className="text-lg font-black text-muted-foreground select-none">KB</span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="range" min="50" max="4000" step="25" value={targetKb}
                    onChange={(e) => setTargetKb(parseInt(e.target.value))}
                    className="w-full h-3 bg-card border border-border rounded-full appearance-none accent-primary cursor-pointer"
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <ImageIcon className="h-6 w-6 text-primary" />
                    <div className="flex-1">
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 select-none">Quality Level</div>
                      <div className="text-2xl font-black text-primary">{Math.round(quality * 100)}%</div>
                    </div>
                  </div>
                  <input 
                    type="range" min="0.05" max="1" step="0.05" value={quality} 
                    onChange={(e) => setQuality(parseFloat(e.target.value))} 
                    className="w-full h-3 bg-card border border-border rounded-full appearance-none accent-primary cursor-pointer" 
                  />
                </>
              )}
            </div>
          </div>

          {/* Page Sizing & Orientation Settings */}
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">2. Page Settings</Label>
            <div className="p-6 bg-secondary/30 rounded-[2rem] border border-border space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase opacity-50 select-none">Page Dimension Standard</Label>
                <div className="p-1 bg-card rounded-xl border border-border flex">
                  <button onClick={() => setPageSizeMode("original")} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${pageSizeMode === "original" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Auto (Image size)</button>
                  <button onClick={() => setPageSizeMode("a4")} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${pageSizeMode === "a4" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>A4 Standard Page</button>
                </div>
              </div>

              {pageSizeMode === "a4" && (
                <div className="space-y-3 animate-in fade-in">
                  <Label className="text-[10px] font-black uppercase opacity-50 select-none">A4 Orientation</Label>
                  <div className="p-1 bg-card rounded-xl border border-border flex">
                    <button onClick={() => setPageOrientation("portrait")} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${pageOrientation === "portrait" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Portrait</button>
                    <button onClick={() => setPageOrientation("landscape")} className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${pageOrientation === "landscape" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Landscape</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={buildPdf}
            disabled={images.length === 0 || isProcessing}
            className="w-full h-20 rounded-[2rem] gradient-primary text-primary-foreground font-black text-xl shadow-glow hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="h-6 w-6 mr-3" />
            Build & Optimize PDF ({images.length})
          </Button>
        </div>

        {/* Right Column: Dynamic Workspace */}
        <div className="space-y-6">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in zoom-in-95 select-none h-full border border-dashed border-border rounded-[2.5rem] bg-card/40">
              <div className="relative h-36 w-36">
                <svg className="h-full w-full -rotate-90 animate-spin-slow">
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-secondary/30" />
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={402} strokeDashoffset={402 * 0.25} className="text-primary" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <FileStack className="h-10 w-10 text-primary mb-1 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2 max-w-sm px-6">
                <h4 className="text-xl font-black">{status}</h4>
                <p className="text-muted-foreground font-medium italic text-xs leading-relaxed">
                  "Stitching pages together and enforcing target boundaries..."
                </p>
              </div>
            </div>
          ) : hasResults && finalResult ? (
            <div className="space-y-6 animate-in fade-in select-none">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">Optimization Results</Label>
                <Button variant="ghost" onClick={() => { setHasResults(false); setFinalResult(null); }} className="rounded-xl h-8 font-black gap-1 cursor-pointer text-xs">
                  <ChevronLeft className="h-3.5 w-3.5" /> Adjust Batch
                </Button>
              </div>
              
              <div className="bg-card border-2 border-border rounded-[2.5rem] p-8 transition-all hover:border-primary/30 shadow-sm flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4 overflow-hidden">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="shrink-0 h-16 w-16 rounded-2xl bg-success/10 text-success flex items-center justify-center shadow-inner">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div className="min-w-0 flex flex-col gap-1">
                      <Input
                        type="text"
                        value={finalResult.name}
                        onChange={(e) => setFinalResult({ ...finalResult, name: e.target.value })}
                        className="h-10 rounded-xl bg-secondary/30 border-2 border-transparent focus:border-primary font-black text-sm px-3 max-w-sm"
                      />
                      <div className="text-[10px] font-black mt-1 px-2 py-0.5 rounded-md uppercase inline-block bg-success/20 text-success truncate max-w-full">
                        ✅ Optimized ({finalResult.newSize} KB)
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-black text-primary leading-none">-{finalResult.ratio}%</div>
                    <div className="text-[9px] font-black uppercase opacity-40 mt-1">Reduction</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 text-center">
                    <div className="text-[9px] font-black uppercase opacity-40 mb-1">Total Pages</div>
                    <div className="text-lg font-black">{finalResult.totalPages}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 text-center">
                    <div className="text-[9px] font-black uppercase opacity-40 mb-1">Before Size</div>
                    <div className="text-lg font-black">{finalResult.oldSize} KB</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 text-center">
                    <div className="text-[9px] font-black uppercase opacity-40 mb-1">After Size</div>
                    <div className="text-lg font-black text-success">{finalResult.newSize} KB</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <Button asChild className="flex-1 h-12 rounded-xl gradient-primary font-black text-sm shadow-sm cursor-pointer">
                    <a href={finalResult.url} download={finalResult.name}>
                      <Download className="h-4 w-4 mr-2" /> Download Output
                    </a>
                  </Button>
                  {onAddAsset && (
                    <>
                      <Button
                        onClick={() => onAddAsset("pdf", finalResult.name, finalResult.dataUrl, "workspace")}
                        className="flex-1 h-12 rounded-xl bg-secondary hover:bg-secondary/80 font-black cursor-pointer text-xs"
                      >
                        <Files className="h-3 w-3 mr-2" /> Desk
                      </Button>
                      <Button
                        onClick={() => onAddAsset("pdf", finalResult.name, finalResult.dataUrl, "permanent")}
                        className="flex-1 h-12 rounded-xl bg-success/10 hover:bg-success/20 text-success font-black cursor-pointer text-xs"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-2" /> Vault
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in select-none">
              <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">2. Visual Compilation Grid</Label>
              
              {/* Direct File Upload Area */}
              <div className="border-4 border-dashed border-primary/20 hover:border-primary/40 rounded-[2.5rem] bg-card p-6 text-center transition-all relative group flex flex-col items-center justify-center min-h-[120px] cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleLocalFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                <ImageIcon className="h-8 w-8 text-primary/60 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-black text-foreground">Click or Drag Images here to Start</div>
              </div>

              <div className="bg-secondary/10 rounded-[2.5rem] border-2 border-border p-6 min-h-[350px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {images.map((img, idx) => {
                    const isLocal = localUploadedFiles.some((lf) => lf.id === img.id);
                    return (
                      <div 
                        key={img.id} 
                        className="group bg-card rounded-2xl border-2 border-border transition-all relative overflow-hidden flex flex-col p-3 gap-2 shadow-sm hover:border-primary/30 hover:shadow-elevated animate-in zoom-in-95 select-none" 
                      >
                        <div className="aspect-[4/5] rounded-xl overflow-hidden bg-secondary/10 flex items-center justify-center border border-border/50 relative">
                          <img src={img.dataUrl} className="w-full h-full object-cover" alt="" />
                          <div className="absolute top-2 left-2 h-6 w-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-[11px] shadow-lg z-10 select-none leading-none">
                            {idx + 1}
                          </div>
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2 p-2 z-20">
                            <button 
                              onClick={() => moveImage(idx, -1)} 
                              disabled={idx === 0}
                              className="h-8 w-8 bg-white/20 hover:bg-white/40 text-white rounded-lg flex items-center justify-center disabled:opacity-10 transition-colors cursor-pointer"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => moveImage(idx, 1)} 
                              disabled={idx === images.length - 1}
                              className="h-8 w-8 bg-white/20 hover:bg-white/40 text-white rounded-lg flex items-center justify-center disabled:opacity-10 transition-colors cursor-pointer"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); isLocal ? removeLocalFile(img.id) : onRemoveFromTool(img.id); }}
                              className="h-8 w-8 bg-destructive/80 hover:bg-destructive text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-center min-w-0 mt-1">
                          <div className="text-[11px] font-black tracking-tight truncate px-1 text-foreground">
                            {img.name || "Untitled Image"}
                          </div>
                          <div className="text-[10px] font-black mt-0.5 tracking-wider uppercase text-muted-foreground opacity-60">
                            {Math.round(img.size / 1024)} KB
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {images.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30 text-center">
                      <FileStack className="h-12 w-12 mb-3 text-muted-foreground" />
                      <h4 className="text-base font-bold">Workspace Empty</h4>
                      <p className="text-[10px] font-medium leading-tight">Drag files here or select<br />from your Desk.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
