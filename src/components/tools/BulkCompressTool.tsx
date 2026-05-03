import { useState, useMemo, useRef } from "react";
import { 
  Trash2, Zap, FileStack, Loader2, Target, ChevronLeft, Download, Files, CheckCircle2, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Asset } from "@/lib/db-assets";

export function BulkCompressTool({ 
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
  const [status, setStatus] = useState("Compressing images...");
  
  const [localUploadedFiles, setLocalUploadedFiles] = useState<Asset[]>([]);
  const [processedItems, setProcessedItems] = useState<any[]>([]);

  const [compressMode, setCompressMode] = useState<"kb" | "percent">("kb");
  const [targetKb, setTargetKb] = useState(195);
  const [quality, setQuality] = useState(0.8);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const incomingImages = useMemo(() => [
    ...assets.filter(a => a.type === "image" || a.type === "photo" || a.type === "signature"), 
    ...localUploadedFiles
  ], [assets, localUploadedFiles]);

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
  };

  const processAll = async () => {
    if (incomingImages.length === 0) {
      toast.error("Please add at least 1 image to process.");
      return;
    }

    setIsProcessing(true);
    setHasResults(false);
    setStatus("Initiating compression...");

    try {
      const results = [];
      for (let i = 0; i < incomingImages.length; i++) {
        const asset = incomingImages[i];
        setStatus(`Compressing ${i + 1} of ${incomingImages.length}...`);
        
        await new Promise(r => setTimeout(r, 50)); 
        
        const res = await resizeAndCompress(asset.dataUrl, asset.name);
        results.push(res);
      }
      
      setProcessedItems(results);
      setHasResults(true);
      toast.success(`Compressed ${results.length} images perfectly! ✅`);
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resizeAndCompress = (dataUrl: string, name: string): Promise<any> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        const oldSizeKb = Math.round((dataUrl.length * 0.75) / 1024);
        
        if (compressMode === "kb") {
          let currentDrawW = img.width;
          let currentDrawH = img.height;
          let bestResultUrl = "";
          let bestResultKb = Infinity;
          let bestW = currentDrawW;
          let bestH = currentDrawH;
          
          const MIN_QUALITY = 0.35;
          
          for (let pass = 0; pass < 6; pass++) {
            canvas.width = currentDrawW;
            canvas.height = currentDrawH;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, currentDrawW, currentDrawH);
            ctx.drawImage(img, 0, 0, currentDrawW, currentDrawH);
            
            let minQ = 0.01, maxQ = 1.0, bestQ = 0.01;
            let passBestUrl = "";
            let passBestKb = Infinity;
            
            for (let i = 0; i < 12; i++) {
              const midQ = (minQ + maxQ) / 2;
              const result = canvas.toDataURL("image/jpeg", midQ);
              const sizeKb = (result.length * 0.75) / 1024;
              
              if (sizeKb <= targetKb) {
                if (sizeKb > (passBestKb === Infinity ? 0 : passBestKb) || passBestUrl === "") {
                  bestQ = midQ;
                  passBestUrl = result;
                  passBestKb = sizeKb;
                }
                minQ = midQ + 0.001; 
              } else {
                maxQ = midQ - 0.001; 
              }
            }
            
            if (passBestUrl && (bestQ >= MIN_QUALITY || pass === 5)) {
              bestResultUrl = passBestUrl;
              bestResultKb = passBestKb;
              bestW = currentDrawW;
              bestH = currentDrawH;
              break; 
            }
            
            currentDrawW = Math.round(currentDrawW * 0.85);
            currentDrawH = Math.round(currentDrawH * 0.85);
          }
          
          if (!bestResultUrl) {
             canvas.width = currentDrawW;
             canvas.height = currentDrawH;
             ctx.fillStyle = "#ffffff";
             ctx.fillRect(0, 0, currentDrawW, currentDrawH);
             ctx.drawImage(img, 0, 0, currentDrawW, currentDrawH);
             bestResultUrl = canvas.toDataURL("image/jpeg", 0.1);
             bestResultKb = Math.round((bestResultUrl.length * 0.75) / 1024);
             bestW = currentDrawW;
             bestH = currentDrawH;
          }
          
          resolve({ 
            url: bestResultUrl, 
            name, 
            oldSize: oldSizeKb, 
            newSize: Math.round(bestResultKb), 
            width: bestW, 
            height: bestH,
            hitTarget: bestResultKb <= targetKb,
            ratio: Math.round(((oldSizeKb - bestResultKb) / oldSizeKb) * 100) || 0
          });
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, img.width, img.height);
          ctx.drawImage(img, 0, 0, img.width, img.height);
          
          const resultUrl = canvas.toDataURL("image/jpeg", quality);
          const newSizeKb = Math.round((resultUrl.length * 0.75) / 1024);
          resolve({ 
            url: resultUrl, 
            name, 
            oldSize: oldSizeKb, 
            newSize: newSizeKb, 
            width: img.width, 
            height: img.height,
            hitTarget: true,
            ratio: Math.round(((oldSizeKb - newSizeKb) / oldSizeKb) * 100) || 0
          });
        }
      };
      img.src = dataUrl;
    });
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>

          <h3 className="text-4xl font-black tracking-tight">Bulk Image Compressor</h3>
          <p className="text-muted-foreground mt-2 font-medium max-w-xl text-lg">
            Batch compress multiple photos to exact KB limits without distortion.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4">
        {/* Left Column: Settings */}
        <div className="space-y-8">
          
          {/* Compression Mode */}
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">1. Compression Output</Label>
            <div className="p-1 bg-secondary/30 rounded-[1.5rem] border border-border flex">
              <button onClick={() => setCompressMode("kb")} className={`flex-1 py-3 text-xs font-black rounded-[1.25rem] transition-all cursor-pointer ${compressMode === "kb" ? "bg-foreground text-background font-black shadow-md" : "text-muted-foreground hover:text-foreground"}`}>Exact KB Target</button>
              <button onClick={() => setCompressMode("percent")} className={`flex-1 py-3 text-xs font-black rounded-[1.25rem] transition-all cursor-pointer ${compressMode === "percent" ? "bg-foreground text-background font-black shadow-md" : "text-muted-foreground hover:text-foreground"}`}>Percentage Quality</button>
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
                    type="range" min="10" max="2000" step="5" value={targetKb}
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

          <Button
            onClick={processAll}
            disabled={incomingImages.length === 0 || isProcessing}
            className="w-full h-20 rounded-[2rem] gradient-primary text-primary-foreground font-black text-xl shadow-glow hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="h-6 w-6 mr-3" />
            Compress Images ({incomingImages.length})
          </Button>
        </div>

        {/* Right Column: Dynamic Content */}
        <div className="space-y-6">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in zoom-in-95 select-none h-full border border-dashed border-border rounded-[2.5rem] bg-card/40">
              <div className="relative h-36 w-36">
                <svg className="h-full w-full -rotate-90 animate-spin-slow">
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-secondary/30" />
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={402} strokeDashoffset={402 * 0.25} className="text-primary" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-primary mb-1 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2 max-w-sm px-6">
                <h4 className="text-xl font-black">{status}</h4>
                <p className="text-muted-foreground font-medium italic text-xs leading-relaxed">
                  "Crunching pixels and hunting for the absolute sweet spot..."
                </p>
              </div>
            </div>
          ) : hasResults && processedItems.length > 0 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 select-none">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">Optimization Results</Label>
                <Button variant="ghost" onClick={() => { setHasResults(false); setProcessedItems([]); }} className="rounded-xl h-8 font-black gap-1 cursor-pointer text-xs">
                  <ChevronLeft className="h-3.5 w-3.5" /> New Batch
                </Button>
              </div>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {processedItems.map((item, idx) => (
                  <div key={idx} className="bg-card border-2 border-border rounded-[2rem] p-6 transition-all hover:border-primary/30 shadow-sm flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-4 overflow-hidden">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <img src={item.url} className="shrink-0 h-16 w-16 rounded-2xl object-cover shadow-inner bg-secondary/30" alt="" />
                        <div className="min-w-0 flex flex-col gap-1">
                          <Input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...processedItems];
                              updated[idx].name = e.target.value;
                              setProcessedItems(updated);
                            }}
                            className="h-8 rounded-xl bg-secondary/30 border-2 border-transparent focus:border-primary font-black text-xs px-2.5 max-w-[160px]"
                          />
                          <div className="flex gap-2 mt-0.5">
                            <div className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase inline-block bg-secondary text-foreground">
                              {item.oldSize} KB
                            </div>
                            <div className="text-[9px] font-black py-0.5 opacity-50">→</div>
                            <div className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase inline-block ${compressMode === "percent" || item.hitTarget ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                              {item.newSize} KB
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-3xl font-black text-primary leading-none">-{item.ratio}%</div>
                        <div className="text-[9px] font-black uppercase opacity-40 mt-1">Reduction</div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <Button asChild className="flex-1 h-10 rounded-xl gradient-primary font-black text-xs shadow-sm cursor-pointer">
                        <a href={item.url} download={`compressed_${item.name}`}>
                          <Download className="h-4 w-4 mr-2" /> Download
                        </a>
                      </Button>
                      {onAddAsset && (
                        <>
                          <Button
                            onClick={() => onAddAsset("image", `compressed_${item.name}`, item.url, "workspace")}
                            className="flex-1 h-10 rounded-xl bg-secondary hover:bg-secondary/80 font-black cursor-pointer text-xs"
                          >
                            <Files className="h-3 w-3 mr-2" /> Desk
                          </Button>
                          <Button
                            onClick={() => onAddAsset("image", `compressed_${item.name}`, item.url, "permanent")}
                            className="flex-1 h-10 rounded-xl bg-success/10 hover:bg-success/20 text-success font-black cursor-pointer text-xs"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-2" /> Vault
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in select-none">
              <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">2. Add Images</Label>
              
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
                <div className="text-sm font-black text-foreground">Click or Drag Images here</div>
              </div>

              <div className="bg-secondary/10 rounded-[2.5rem] border-2 border-border p-6 min-h-[300px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  {incomingImages.map((img, idx) => {
                    const isLocal = localUploadedFiles.some((lf) => lf.id === img.id);
                    return (
                      <div 
                        key={img.id} 
                        className="group bg-card rounded-2xl border-2 border-border transition-all relative overflow-hidden flex flex-col p-3 gap-2 shadow-sm hover:border-primary/30 hover:shadow-elevated animate-in zoom-in-95 cursor-pointer select-none" 
                      >
                        <div className="aspect-[4/5] rounded-xl overflow-hidden bg-secondary/10 flex items-center justify-center border border-border/50">
                          <img src={img.dataUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="text-center min-w-0 mt-1">
                          <div className="text-[11px] font-black tracking-tight truncate px-1 text-foreground">
                            {img.name}
                          </div>
                          <div className="text-[10px] font-black mt-0.5 tracking-wider uppercase text-muted-foreground opacity-60">
                            {Math.round(img.size / 1024)} KB
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); isLocal ? removeLocalFile(img.id) : onRemoveFromTool(img.id); }}
                          className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-destructive text-white hover:bg-destructive/90 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg z-10 scale-75 group-hover:scale-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {incomingImages.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-30 text-center">
                      <FileStack className="h-12 w-12 mb-3 text-muted-foreground" />
                      <h4 className="text-base font-bold">Workspace Empty</h4>
                      <p className="text-[10px] font-medium mt-1 leading-tight">Drag images here or select<br/>from your Desk.</p>
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
