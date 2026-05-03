import { useState, useMemo, useEffect } from "react";
import {
  Trash2, Zap, Plus, FileStack, GripVertical, Layers,
  Loader2, Minimize, CheckCircle2, Target, ChevronLeft, Download, Files, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import { Asset } from "@/lib/db-assets";
import { PdfThumbnail } from "./PdfThumbnail";
import { compressPdfGhostscript } from "@/lib/data-server";

// Browser-compatible base64 conversion helpers
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function PdfMergeTool({
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
  const [status, setStatus] = useState("Merging...");

  const [localUploadedFiles, setLocalUploadedFiles] = useState<Asset[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});

  const [mergeMode, setMergeMode] = useState<"standard" | "compress">("standard");
  const [targetKb, setTargetKb] = useState(500);

  const [finalResult, setFinalResult] = useState<any>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  const incomingPdfs = useMemo(() => [
    ...assets.filter(a => a.type === "pdf"),
    ...localUploadedFiles
  ], [assets, localUploadedFiles]);

  useEffect(() => {
    setOrderedIds(prev => {
      const currentIds = incomingPdfs.map(a => a.id);
      const newIds = prev.filter(id => currentIds.includes(id));
      currentIds.forEach(id => {
        if (!newIds.includes(id)) newIds.push(id);
      });
      return newIds;
    });
  }, [incomingPdfs]);

  // Fetch page counts
  useEffect(() => {
    const fetchCounts = async () => {
      for (const asset of incomingPdfs) {
        if (!pageCounts[asset.id]) {
          try {
            const bytes = await fetch(asset.dataUrl).then(res => res.arrayBuffer());
            const pdf = await PDFDocument.load(bytes);
            setPageCounts(prev => ({ ...prev, [asset.id]: pdf.getPageCount() }));
          } catch (e) { }
        }
      }
    };
    fetchCounts();
  }, [incomingPdfs]);

  const pdfs = orderedIds.map(id => incomingPdfs.find(a => a.id === id)).filter(Boolean) as Asset[];

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.type !== "application/pdf") {
        toast.error(`Skipped ${file.name} - not a PDF.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        const newAsset: Asset = {
          id: Math.random().toString(36).substring(2, 11),
          name: file.name,
          type: "pdf",
          dataUrl,
          size: file.size,
          category: "Personal",
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

  // Drag and Drop ordering
  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId !== id) setDragOverId(id);
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    setOrderedIds(prev => {
      const newIds = [...prev];
      const draggedIndex = newIds.indexOf(draggedId);
      const targetIndex = newIds.indexOf(targetId);
      newIds.splice(draggedIndex, 1);
      newIds.splice(targetIndex, 0, draggedId);
      return newIds;
    });
    setDraggedId(null);
    setDragOverId(null);
  };

  const processMerge = async () => {
    if (pdfs.length < 2) {
      toast.error("Please select at least 2 PDFs to merge.");
      return;
    }

    setIsProcessing(true);
    setHasResults(false);
    setStatus("Merging documents losslessly...");

    try {
      // 1. Lossless Merge via pdf-lib
      const mergedPdf = await PDFDocument.create();
      let totalPages = 0;
      let combinedOriginalSize = 0;

      for (const asset of pdfs) {
        combinedOriginalSize += asset.size;
        const bytes = await fetch(asset.dataUrl).then((r) => r.arrayBuffer());
        const pdf = await PDFDocument.load(bytes);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((p) => mergedPdf.addPage(p));
        totalPages += pages.length;
      }

      const pdfBytes = await mergedPdf.save({ useObjectStreams: true, addDefaultPage: false });
      const mergedBase64 = uint8ToBase64(pdfBytes);
      const mergedDataUrl = `data:application/pdf;base64,${mergedBase64}`;
      const mergedSizeKb = Math.round(pdfBytes.length / 1024);
      const combinedOriginalKb = Math.round(combinedOriginalSize / 1024);

      if (mergeMode === "standard") {
        // Just return the merged file
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        setFinalResult({
          name: `merged_${pdfs.length}_files.pdf`,
          url,
          dataUrl: mergedDataUrl,
          oldSize: combinedOriginalKb,
          newSize: mergedSizeKb,
          totalPages,
          hitTarget: true, // N/A for standard
          ratio: Math.round(((combinedOriginalKb - mergedSizeKb) / combinedOriginalKb) * 100) || 0
        });
        setHasResults(true);
        toast.success("Merged successfully! ✅");
      } else {
        // 2. Compress via Ghostscript backend
        setStatus("Compressing via Ghostscript Engine...");

        const res = await compressPdfGhostscript({ data: { fileBase64: mergedDataUrl, targetKb } });
        if (res.success && res.base64) {
          const compressedBytes = base64ToUint8(res.base64.replace(/^data:application\/pdf;base64,/, ""));
          const compressedSizeKb = Math.round(compressedBytes.length / 1024);

          const blob = new Blob([compressedBytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);

          setFinalResult({
            name: `merged_compressed_${compressedSizeKb}kb.pdf`,
            url,
            dataUrl: res.base64,
            oldSize: combinedOriginalKb,
            newSize: compressedSizeKb,
            totalPages,
            hitTarget: compressedSizeKb <= targetKb,
            ratio: Math.round(((combinedOriginalKb - compressedSizeKb) / combinedOriginalKb) * 100)
          });
          setHasResults(true);
          toast.success("Merged and compressed successfully! ✅");
        } else {
          throw new Error(res.error || "Compression failed");
        }
      }
    } catch (e: any) {
      console.error(e);
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

          <h3 className="text-4xl font-black tracking-tight">Enterprise PDF Merge</h3>
          <p className="text-muted-foreground mt-2 font-medium max-w-xl text-lg">
            Combine documents seamlessly and optimize for strict portal limits in one powerful step.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4">
        {/* Left Column: Settings */}
        <div className="space-y-8">
          {/* 1. Merge Mode */}
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">1. Output Mode</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "standard", label: "Standard Merge", icon: Layers, desc: "Lossless combination" },
                { id: "compress", label: "Merge & Compress", icon: Minimize, desc: "Hit specific size limits" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMergeMode(m.id as any)}
                  className={`p-5 rounded-[2rem] border-2 text-left transition-all relative group cursor-pointer ${mergeMode === m.id ? "bg-foreground text-background border-foreground shadow-glow" : "bg-card border-border hover:border-primary/30"}`}
                >
                  <m.icon className={`h-6 w-6 mb-3 ${mergeMode === m.id ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                  <div className="text-xs font-black">{m.label}</div>
                  <div className="text-[9px] font-bold opacity-60 mt-1 leading-tight">{m.desc}</div>
                  {mergeMode === m.id && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Target (Only if compressing) */}
          <div className={`space-y-4 transition-all duration-300 ${mergeMode === "compress" ? "opacity-100 h-auto" : "opacity-30 pointer-events-none"}`}>
            <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">2. Target Size Target</Label>
            <div className="p-8 bg-secondary/30 rounded-[2.5rem] border border-border space-y-6">
              <div className="flex items-center gap-4">
                <Target className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 select-none">Enter Custom Target</div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={targetKb}
                      min={20}
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
                <div className="text-right select-none">
                  <div className="text-xs font-black opacity-40">= {(targetKb / 1024).toFixed(2)} MB</div>
                </div>
              </div>
              <input
                type="range"
                min="20"
                max="2000"
                step="10"
                value={targetKb}
                onChange={(e) => setTargetKb(parseInt(e.target.value))}
                className="w-full h-3 bg-card border border-border rounded-full appearance-none accent-primary cursor-pointer"
              />
            </div>
          </div>

          <Button
            onClick={processMerge}
            disabled={pdfs.length < 2 || isProcessing}
            className="w-full h-20 rounded-[2rem] gradient-primary text-primary-foreground font-black text-xl shadow-glow hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            {mergeMode === "standard" ? <Layers className="h-6 w-6 mr-3" /> : <Zap className="h-6 w-6 mr-3" />}
            {mergeMode === "standard" ? `Merge ${pdfs.length} Files` : `Merge & Compress`}
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
                  <Layers className="h-10 w-10 text-primary mb-1 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2 max-w-sm px-6">
                <h4 className="text-xl font-black">{status}</h4>
                <p className="text-muted-foreground font-medium italic text-xs leading-relaxed">
                  "Assembling layout and optimizing assets for high clarity..."
                </p>
              </div>
            </div>
          ) : hasResults && finalResult ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 select-none">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">Merge Results</Label>
                <Button variant="ghost" onClick={() => { setHasResults(false); setFinalResult(null); }} className="rounded-xl h-8 font-black gap-1 cursor-pointer text-xs">
                  <ChevronLeft className="h-3.5 w-3.5" /> Start New Merge
                </Button>
              </div>

              <div className="bg-card border-2 border-border rounded-[2.5rem] p-8 transition-all hover:border-primary/30 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-8 overflow-hidden">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`shrink-0 h-16 w-16 rounded-2xl flex items-center justify-center shadow-inner ${mergeMode === "standard" || finalResult.hitTarget ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                      {mergeMode === "standard" || finalResult.hitTarget ? <CheckCircle2 className="h-8 w-8" /> : <Target className="h-8 w-8" />}
                    </div>
                    <div className="min-w-0 flex flex-col gap-1.5">
                      <Input
                        type="text"
                        value={finalResult.name}
                        onChange={(e) => setFinalResult({ ...finalResult, name: e.target.value })}
                        className="h-10 rounded-xl bg-secondary/30 border-2 border-transparent focus:border-primary font-black text-sm px-3 max-w-sm"
                      />
                      <div className={`text-[10px] font-black mt-1 px-2 py-0.5 rounded-md uppercase inline-block truncate max-w-full ${mergeMode === "standard" || finalResult.hitTarget ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                        {mergeMode === "standard" ? `✅ Merged (${finalResult.newSize} KB)` : finalResult.hitTarget ? `✅ Compressed (${finalResult.newSize} KB)` : `⚠️ Result (${finalResult.newSize} KB)`}
                      </div>
                    </div>
                  </div>
                  {mergeMode === "compress" && (
                    <div className="text-right shrink-0">
                      <div className="text-4xl font-black text-primary leading-none">-{finalResult.ratio}%</div>
                      <div className="text-[10px] font-black uppercase opacity-40 mt-1">Reduction</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 text-center">
                    <div className="text-[9px] font-black uppercase opacity-40 mb-1">Total Pages</div>
                    <div className="text-lg font-black">{finalResult.totalPages}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center">
                    <div className="text-[9px] font-black uppercase text-primary opacity-60 mb-1">Final Size</div>
                    <div className="text-lg font-black text-primary">{finalResult.newSize} KB</div>
                  </div>
                  {mergeMode === "compress" && (
                    <div className={`p-4 rounded-2xl border text-center ${finalResult.hitTarget ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"}`}>
                      <div className="text-[9px] font-black uppercase opacity-40 mb-1">Target</div>
                      <div className={`text-lg font-black ${finalResult.hitTarget ? "text-success" : "text-warning"}`}>{targetKb} KB</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <Button asChild className="w-full h-16 rounded-2xl gradient-primary font-black text-lg shadow-glow cursor-pointer">
                    <a href={finalResult.url} download={finalResult.name}>
                      <Download className="h-5 w-5 mr-2" /> Download Output
                    </a>
                  </Button>
                  {onAddAsset && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => onAddAsset("pdf", finalResult.name, finalResult.url, "workspace")}
                        className="h-12 rounded-xl bg-secondary hover:bg-secondary/80 font-black cursor-pointer text-xs"
                      >
                        <Files className="h-4 w-4 mr-2" /> Save to Desk
                      </Button>
                      <Button
                        onClick={() => onAddAsset("pdf", finalResult.name, finalResult.url, "permanent")}
                        className="h-12 rounded-xl bg-success/10 hover:bg-success/20 text-success font-black cursor-pointer text-xs"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Save to Vault
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in select-none">
              <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">3. Add & Reorder Files</Label>

              {/* Direct File Upload Area */}
              <div className="border-4 border-dashed border-primary/20 hover:border-primary/40 rounded-[2.5rem] bg-card p-6 text-center transition-all relative group flex flex-col items-center justify-center min-h-[120px] cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="application/pdf"
                  onChange={handleLocalFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                <Files className="h-8 w-8 text-primary/60 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-black text-foreground">Click or Drag PDFs here</div>
              </div>

              <div className="bg-secondary/10 rounded-[2.5rem] border-2 border-border p-6 min-h-[300px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {pdfs.map((pdf, idx) => {
                    const isLocal = localUploadedFiles.some((lf) => lf.id === pdf.id);
                    return (
                      <div
                        key={pdf.id}
                        draggable
                        onDragStart={() => handleDragStart(pdf.id)}
                        onDragOver={(e) => handleDragOver(e, pdf.id)}
                        onDrop={(e) => handleDrop(e, pdf.id)}
                        onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                        className={`group bg-card rounded-2xl border-2 transition-all relative overflow-hidden flex flex-col p-3 gap-2 cursor-move select-none animate-in zoom-in-95 ${draggedId === pdf.id ? "opacity-30 scale-95" :
                            dragOverId === pdf.id ? "border-primary ring-2 ring-primary/20 scale-105 shadow-glow" : "border-border shadow-soft hover:shadow-elevated hover:border-primary/30"
                          }`}
                      >
                        <div className="aspect-[4/5] rounded-xl overflow-hidden bg-secondary/10 flex items-center justify-center border border-border/50 relative">
                          <PdfThumbnail dataUrl={pdf.dataUrl} />
                          <div className="absolute top-2 left-2 h-6 w-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-[11px] shadow-lg z-10 select-none leading-none">
                            {idx + 1}
                          </div>
                          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center z-20">
                            <GripVertical className="h-6 w-6 text-primary/40" />
                          </div>
                        </div>
                        <div className="text-center min-w-0 mt-1">
                          <div className="text-[11px] font-black tracking-tight truncate px-1 text-foreground">
                            {pdf.name}
                          </div>
                          <div className="text-[10px] font-black mt-0.5 tracking-wider uppercase text-muted-foreground opacity-60">
                            {Math.round(pdf.size / 1024)} KB • {pageCounts[pdf.id] ? `${pageCounts[pdf.id]} Pgs` : "Load"}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); isLocal ? removeLocalFile(pdf.id) : onRemoveFromTool(pdf.id); }}
                          className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-destructive text-white hover:bg-destructive/90 flex items-center justify-center transition-all cursor-pointer shadow-lg z-30 scale-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {pdfs.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-30 text-center">
                      <FileStack className="h-12 w-12 mb-3 text-muted-foreground" />
                      <h4 className="text-base font-bold">Workspace Empty</h4>
                      <p className="text-[10px] font-medium mt-1 leading-tight">Drag documents here or select<br />from your Desk.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
