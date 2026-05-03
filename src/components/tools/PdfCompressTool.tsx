import { useState } from "react";
import {
  Download,
  CheckCircle2,
  PenTool,
  Trash2,
  Zap,
  Files,
  ChevronLeft,
  Cpu,
  Scaling,
  Minimize,
  Search,
  Target,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import { PdfThumbnail } from "./PdfThumbnail";
import { Asset } from "@/lib/db-assets";
import { compressPdfGhostscript } from "@/lib/data-server";

// ─── Core Compression Engine ─────────────────────────────────────────────────
// Renders a single PDF page to a JPEG at a specific quality & scale.
async function renderPageToJpeg(
  page: any,
  scale: number,
  quality: number,
  grayscale: boolean
): Promise<{ dataUrl: string; sizeKb: number }> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  await page.render({ canvasContext: ctx, viewport, intent: "print" }).promise;

  if (grayscale) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let p = 0; p < d.length; p += 4) {
      const gray = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
      const val = gray < 185 ? Math.max(0, gray - 20) : Math.min(255, gray + 10);
      d[p] = d[p + 1] = d[p + 2] = val;
    }
    ctx.putImageData(img, 0, 0);
  }

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const sizeKb = (dataUrl.length * 0.75) / 1024;
  return { dataUrl, sizeKb };
}

// Binary search for the best quality at a given scale that fits within budgetKb
async function findBestQuality(
  page: any,
  scale: number,
  budgetKb: number,
  grayscale: boolean
): Promise<{ dataUrl: string; sizeKb: number }> {
  let currentScale = scale;
  const MIN_QUALITY = 0.40;

  for (let pass = 0; pass < 3; pass++) {
    let lo = 0.01, hi = 0.95;
    let bestDataUrl = "";
    let bestSize = Infinity;
    let bestQuality = 0.01;

    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      const { dataUrl, sizeKb } = await renderPageToJpeg(page, currentScale, mid, grayscale);
      if (sizeKb <= budgetKb) {
        bestDataUrl = dataUrl;
        bestSize = sizeKb;
        bestQuality = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }

    if (bestDataUrl && (bestQuality >= MIN_QUALITY || pass === 2)) {
      return { dataUrl: bestDataUrl, sizeKb: bestSize };
    }

    currentScale *= 0.75;
  }

  const { dataUrl, sizeKb } = await renderPageToJpeg(page, currentScale, 0.01, grayscale);
  return { dataUrl, sizeKb };
}

// Build a PDF from an array of JPEG dataUrls and return Uint8Array
async function buildPdf(jpegDataUrls: string[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  for (const dataUrl of jpegDataUrls) {
    const bytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
    const img = await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return pdfDoc.save({ useObjectStreams: true });
}

// Pass 1 & Pass 2 correction
async function compressPdfToTarget(
  pdfDoc: any,
  targetKb: number,
  initialScale: number,
  grayscale: boolean,
  onProgress: (msg: string) => void
): Promise<Uint8Array> {
  const numPages = pdfDoc.numPages;
  const usableKb = targetKb * 0.92;

  let scale = initialScale;
  if (targetKb <= 200) scale = Math.min(scale, 0.75);
  if (targetKb <= 100) scale = Math.min(scale, 0.55);

  let correctionFactor = 1.0;

  for (let pass = 0; pass < 1; pass++) {
    onProgress(pass === 0 ? `Pass 1: Compressing ${numPages} pages...` : `Pass ${pass + 1}: Adjusting to hit target...`);

    const budgetPerPage = (usableKb * correctionFactor) / numPages;
    const pageDataUrls: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      onProgress(`Pass ${pass + 1}: Page ${i}/${numPages}...`);
      const page = await pdfDoc.getPage(i);

      const { dataUrl, sizeKb } = await findBestQuality(page, scale, budgetPerPage, grayscale);
      pageDataUrls.push(dataUrl);

      if (sizeKb > budgetPerPage * 1.5) {
        scale = Math.max(scale * 0.7, 0.2);
      }
    }

    const pdfBytes = await buildPdf(pageDataUrls);
    const actualKb = pdfBytes.length / 1024;

    return pdfBytes;

    correctionFactor *= Math.pow(targetKb / actualKb, 0.9);

    if (actualKb > targetKb) {
      scale = Math.max(scale * Math.pow(targetKb / actualKb, 0.7), 0.2);
    }
  }

  const budgetPerPage = (usableKb * correctionFactor) / numPages;
  const pageDataUrls: string[] = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const { dataUrl } = await findBestQuality(page, scale, budgetPerPage, grayscale);
    pageDataUrls.push(dataUrl);
  }
  return buildPdf(pageDataUrls);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PdfCompressTool({ assets, onRemoveFromTool, onAddAsset }: { assets: Asset[], onRemoveFromTool: (id: string) => void, onAddAsset?: (type: Asset["type"], name: string, dataUrl: string, category: Asset["category"]) => void }) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const [engine, setEngine] = useState<"native" | "browser">("browser");
  const [compressMode, setCompressMode] = useState<"hq" | "balanced" | "small">("balanced");
  const [targetKb, setTargetKb] = useState(300);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Analyzing...");
  const [isGrayscale, setIsGrayscale] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [localUploadedFiles, setLocalUploadedFiles] = useState<Asset[]>([]);

  const pdfs = [...assets.filter(a => a.type === "pdf"), ...localUploadedFiles];

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file only.");
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
      setLocalUploadedFiles((prev) => [...prev, newAsset]);
      toast.success(`"${file.name}" uploaded successfully!`);
    };
    reader.readAsDataURL(file);
  };

  const removeLocalFile = (id: string) => {
    setLocalUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const processCompress = async () => {
    if (pdfs.length === 0) return;
    setIsCompressing(true);
    setHasResults(false);
    setProgress(0);
    setResults([]);

    const output: any[] = [];
    let totalProcessed = 0;

    for (const asset of pdfs) {
      try {
        setStatus(`Loading ${asset.name}...`);

        let compressedDataUrl = "";
        let actualBytes = 0;

        if (engine === "native") {
          setStatus(`Optimizing "${asset.name}" with Ghostscript + QPDF...`);

          const response = await compressPdfGhostscript({
            data: {
              fileBase64: asset.dataUrl,
              targetKb: targetKb,   // Send exact KB target to binary search loop
            },
          });

          if (response && response.success && response.base64) {
            const base64Clean = response.base64.replace(/^data:application\/pdf;base64,/, "");

            // Convert base64 → Uint8Array → Blob for reliable download
            const byteCharacters = atob(base64Clean);
            const byteArray = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteArray[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([byteArray], { type: "application/pdf" });
            compressedDataUrl = URL.createObjectURL(blob);
            actualBytes = blob.size;
          } else {
            throw new Error(response?.error || "Ghostscript engine failed. Check server logs.");
          }
        } else {
          // Fallback: pure browser compression
          // @ts-ignore
          const pdfjsLib = window["pdfjsLib"];
          if (!pdfjsLib) throw new Error("PDF.js engine not loaded.");

          const initialScales = { hq: 2.0, balanced: 1.5, small: 1.0 };
          const initialScale = initialScales[compressMode];
          const loadingTask = pdfjsLib.getDocument(asset.dataUrl);
          const pdfDoc = await loadingTask.promise;

          let applyGrayscale = isGrayscale;
          try {
            const firstPage = await pdfDoc.getPage(1);
            const text = await firstPage.getTextContent();
            if (text.items.length > 30) applyGrayscale = false;
          } catch { }

          const pdfBytes = await compressPdfToTarget(pdfDoc, targetKb, initialScale, applyGrayscale, (msg) => setStatus(msg));
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          compressedDataUrl = URL.createObjectURL(blob);
          actualBytes = blob.size;
        }

        const actualKb = Math.round(actualBytes / 1024);
        const oldKb = Math.round(asset.size / 1024);
        const ratio = Math.max(0, Math.round((1 - actualBytes / asset.size) * 100));

        const qualityStatus: "High" | "Medium" | "Low" =
          ratio < 50 ? "High" : ratio < 80 ? "Medium" : "Low";

        output.push({
          id: asset.id,
          name: asset.name,
          dataUrl: asset.dataUrl,
          oldSize: oldKb,
          newSize: actualKb,
          ratio,
          qualityStatus,
          url: compressedDataUrl,
          hitTarget: actualKb <= targetKb,
        });

        totalProcessed++;
        setProgress(Math.round((totalProcessed / pdfs.length) * 100));
      } catch (e: any) {
        console.error(e);
        toast.error(`Error processing ${asset.name}: ${e.message}`);
      }
    }

    setResults(output);
    setHasResults(true);
    setIsCompressing(false);
    toast.success("Compression complete! ✅");
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>

          <h3 className="text-4xl font-black tracking-tight">Enterprise PDF Compressor</h3>
          <p className="text-muted-foreground mt-2 font-medium max-w-xl text-lg">
            Compress files seamlessly using your local Ghostscript backend for unparalleled clarity.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4">
        <div className="space-y-8">
          {/* 1. COMPRESSION ENGINE */}
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">1. Processing Engine</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "native", label: "Native Engine", icon: Sparkles, desc: "Ghostscript C++ (Recommended)" },
                { id: "browser", label: "Browser Engine", icon: Files, desc: "Offline JS Fallback" },
              ].map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEngine(e.id as any)}
                  className={`p-5 rounded-[2rem] border-2 text-left transition-all relative group cursor-pointer ${engine === e.id ? "bg-foreground text-background border-foreground shadow-glow" : "bg-card border-border hover:border-primary/30"}`}
                >
                  <e.icon className={`h-6 w-6 mb-3 ${engine === e.id ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                  <div className="text-xs font-black">{e.label}</div>
                  <div className="text-[9px] font-bold opacity-60 mt-1 leading-tight">{e.desc}</div>
                  {engine === e.id && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Mode */}
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">2. Quality Preset</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "hq", label: "High", icon: Zap, desc: "Best clarity" },
                { id: "balanced", label: "Balanced", icon: Scaling, desc: "Adobe-like" },
                { id: "small", label: "Small", icon: Minimize, desc: "Max crunch" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setCompressMode(m.id as any)}
                  className={`p-5 rounded-[2rem] border-2 text-left transition-all relative group cursor-pointer ${compressMode === m.id ? "bg-foreground text-background border-foreground shadow-glow" : "bg-card border-border hover:border-primary/30"}`}
                >
                  <m.icon className={`h-5 w-5 mb-3 ${compressMode === m.id ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                  <div className="text-xs font-black">{m.label}</div>
                  <div className="text-[9px] font-bold opacity-60 mt-1 leading-tight">{m.desc}</div>
                  {compressMode === m.id && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Target */}
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">3. Target Size Target</Label>
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
            onClick={processCompress}
            disabled={pdfs.length === 0 || isCompressing}
            className="w-full h-20 rounded-[2rem] gradient-primary text-primary-foreground font-black text-xl shadow-glow hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="h-6 w-6 mr-3" />
            Start Optimizing
          </Button>
        </div>

        {/* Dynamic content column on the right */}
        <div className="space-y-6">
          {isCompressing ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in zoom-in-95 select-none h-full border border-dashed border-border rounded-[2.5rem] bg-card/40">
              <div className="relative h-36 w-36">
                <svg className="h-full w-full -rotate-90">
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-secondary/30" />
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={402} strokeDashoffset={402 - (402 * progress) / 100} className="text-primary transition-all duration-500 ease-out" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-black text-primary">{progress}%</div>
                  <div className="text-[9px] font-black uppercase opacity-50 tracking-widest mt-1">Processed</div>
                </div>
              </div>
              <div className="text-center space-y-2 max-w-sm px-6">
                <h4 className="text-xl font-black">{status}</h4>
                <p className="text-muted-foreground font-medium italic text-xs leading-relaxed">
                  "Perfecting PDF streams and embedded assets using elite Ghostscript technology..."
                </p>
              </div>
            </div>
          ) : hasResults ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 select-none">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">Results & Download</Label>
                <Button variant="ghost" onClick={() => { setHasResults(false); setResults([]); }} className="rounded-xl h-8 font-black gap-1 cursor-pointer text-xs">
                  <ChevronLeft className="h-3.5 w-3.5" /> Re-optimize
                </Button>
              </div>
              <div className="space-y-6">
                {results.map((res, idx) => (
                  <div key={idx} className="group bg-card border-2 border-border rounded-[2.5rem] p-6 transition-all hover:border-primary/30">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-inner ${res.hitTarget ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {res.hitTarget ? <CheckCircle2 className="h-6 w-6" /> : <Target className="h-6 w-6" />}
                        </div>
                        <div>
                          <Input
                            type="text"
                            value={res.name}
                            onChange={(e) => {
                              const updated = [...results];
                              updated[idx].name = e.target.value;
                              setResults(updated);
                            }}
                            className="h-9 rounded-xl bg-secondary/30 border-2 border-transparent focus:border-primary font-black text-xs px-3 max-w-[160px]"
                          />
                          <div className={`text-[9px] font-black mt-1 px-2 py-0.5 rounded-md uppercase inline-block ${res.hitTarget ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                            {res.hitTarget ? `✅ Compressed (${res.newSize} KB)` : `⚠️ Result (${res.newSize} KB)`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-primary">-{res.ratio}%</div>
                        <div className="text-[9px] font-black uppercase opacity-40">Reduction</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-6">
                      <div className="p-3 rounded-2xl bg-secondary/20 border border-border/50 text-center">
                        <div className="text-[8px] font-black uppercase opacity-40 mb-1">Original</div>
                        <div className="text-base font-black opacity-60 line-through">{res.oldSize} KB</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 text-center">
                        <div className="text-[8px] font-black uppercase text-primary opacity-60 mb-1">Output</div>
                        <div className="text-base font-black text-primary">{res.newSize} KB</div>
                      </div>
                      <div className={`p-3 rounded-2xl border text-center ${res.hitTarget ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"}`}>
                        <div className="text-[8px] font-black uppercase opacity-40 mb-1">Target</div>
                        <div className={`text-base font-black ${res.hitTarget ? "text-success" : "text-warning"}`}>{targetKb} KB</div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-40 flex justify-between">
                        <span>Before / After</span>
                        <span className="flex items-center gap-1"><Search className="h-3 w-3" /> Verify clarity</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 h-[180px]">
                        <div className="relative rounded-2xl overflow-hidden border-2 border-border bg-secondary/10">
                          <PdfThumbnail dataUrl={res.dataUrl} />
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-foreground/90 text-background rounded text-[8px] font-black">Original</div>
                        </div>
                        <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30 bg-primary/5">
                          <PdfThumbnail dataUrl={res.url} />
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-[8px] font-black">Output</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button asChild className="w-full h-12 rounded-xl gradient-primary font-black shadow-glow cursor-pointer text-xs">
                        <a href={res.url} download={`compressed_${res.newSize}kb_${res.name}`}>
                          <Download className="h-4 w-4 mr-2" /> Download ({res.newSize} KB)
                        </a>
                      </Button>
                      {onAddAsset && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => onAddAsset("pdf", `compressed_${res.newSize}kb_${res.name}`, res.url, "workspace")}
                            className="h-10 rounded-xl bg-secondary hover:bg-secondary/80 font-black cursor-pointer text-[10px]"
                          >
                            <Files className="h-3.5 w-3.5 mr-1" /> To Desk
                          </Button>
                          <Button
                            onClick={() => onAddAsset("pdf", `compressed_${res.newSize}kb_${res.name}`, res.url, "permanent")}
                            className="h-10 rounded-xl bg-success/10 hover:bg-success/20 text-success font-black cursor-pointer text-[10px]"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> To Vault
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in select-none">
              <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">4. Upload or Selected PDFs</Label>

              {/* Direct File Upload Area */}
              <div className="border-4 border-dashed border-primary/20 hover:border-primary/40 rounded-[2.5rem] bg-card p-8 text-center transition-all relative group flex flex-col items-center justify-center min-h-[160px] cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleLocalFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                <Files className="h-10 w-10 text-primary/60 mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-black text-foreground">Click or Drag & Drop PDF directly here</div>
                <p className="text-[10px] font-medium text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  Supports single or multiple PDF documents. Added files will be optimized to hit your target KB.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {pdfs.map((pdf) => {
                  const isLocal = localUploadedFiles.some((lf) => lf.id === pdf.id);
                  return (
                    <div
                      key={pdf.id}
                      className="group bg-card rounded-2xl border-2 border-border transition-all relative overflow-hidden flex flex-col p-3 gap-2 shadow-sm hover:border-primary/30 hover:shadow-elevated animate-in zoom-in-95 cursor-pointer select-none"
                    >
                      <div className="aspect-[4/5] rounded-xl overflow-hidden bg-secondary/10 flex items-center justify-center border border-border/50">
                        <PdfThumbnail dataUrl={pdf.dataUrl} />
                      </div>
                      <div className="text-center min-w-0 mt-1">
                        <div className="text-[11px] font-black tracking-tight truncate px-1 text-foreground">
                          {pdf.name}
                        </div>
                        <div className="text-[10px] font-black mt-0.5 tracking-wider uppercase text-muted-foreground opacity-60">
                          {Math.round(pdf.size / 1024)} KB
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
                  <div className="col-span-full h-[200px] border-4 border-dashed border-border rounded-[2.5rem] flex flex-col items-center justify-center opacity-20 text-center p-8 select-none">
                    <h4 className="text-sm font-black uppercase">No Documents Selected</h4>
                    <p className="text-[10px] font-medium mt-1 leading-tight">
                      Add files using the upload zone above or pick them from the top Desk.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

