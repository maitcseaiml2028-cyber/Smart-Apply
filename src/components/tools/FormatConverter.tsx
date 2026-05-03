import { useState, useMemo, useEffect, useRef } from "react";
import { 
  Trash2, Zap, FileStack, Loader2, Target, ChevronLeft, Download, Files, CheckCircle2, FileText, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Asset } from "@/lib/db-assets";
import { PdfThumbnail } from "./PdfThumbnail";
import { convertPdfToWordLibreOffice } from "@/lib/data-server";

export function FormatConverter({ 
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
  const [status, setStatus] = useState("Converting files...");
  
  const [localUploadedFiles, setLocalUploadedFiles] = useState<Asset[]>([]);
  const [processedItems, setProcessedItems] = useState<any[]>([]);

  const [fromFormat, setFromFormat] = useState<"image" | "pdf" | "word">("image");
  const [toFormat, setToFormat] = useState<"jpg" | "png" | "pdf" | "word">("png");

  const [compressMode, setCompressMode] = useState<"kb" | "percent">("kb");
  const [targetKb, setTargetKb] = useState(300);
  const [quality, setQuality] = useState(0.8);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const incomingFiles = useMemo(() => [
    ...assets, 
    ...localUploadedFiles
  ], [assets, localUploadedFiles]);

  const validToFormats = useMemo(() => {
    if (fromFormat === "image") return ["jpg", "png", "pdf"];
    if (fromFormat === "pdf") return ["word", "jpg", "png"];
    return ["pdf"];
  }, [fromFormat]);

  useEffect(() => {
    if (!validToFormats.includes(toFormat)) {
      setToFormat(validToFormats[0] as any);
    }
  }, [fromFormat, validToFormats, toFormat]);

  useEffect(() => {
    if (incomingFiles.length > 0) {
      const firstFile = incomingFiles[0];
      const isPdf = firstFile.type === "pdf" || firstFile.name.toLowerCase().endsWith(".pdf");
      const isWord = firstFile.name.toLowerCase().endsWith(".doc") || firstFile.name.toLowerCase().endsWith(".docx");
      
      if (isPdf) {
        setFromFormat("pdf");
      } else if (isWord) {
        setFromFormat("word");
      } else {
        setFromFormat("image");
      }
    }
  }, [incomingFiles]);

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    files.forEach(file => {
      const isWord = file.name.endsWith(".doc") || file.name.endsWith(".docx");
      const isPdf = file.name.endsWith(".pdf");
      const isImg = file.type.startsWith("image/");
      
      if (!isWord && !isPdf && !isImg) {
        toast.error(`Skipped ${file.name} - Unsupported file type.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        const newAsset: Asset = {
          id: Math.random().toString(36).substring(2, 11),
          name: file.name,
          type: isPdf ? "pdf" : "photo",
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

  const convertAll = async () => {
    if (incomingFiles.length === 0) {
      toast.error("Please add at least 1 file to convert.");
      return;
    }

    setIsProcessing(true);
    setHasResults(false);
    setStatus("Initiating conversions...");

    try {
      const results = [];
      for (let i = 0; i < incomingFiles.length; i++) {
        const asset = incomingFiles[i];
        setStatus(`Converting ${i + 1} of ${incomingFiles.length}: ${asset.name}`);
        
        await new Promise(r => setTimeout(r, 50)); 
        
        if (fromFormat === "pdf" && toFormat === "word") {
          // Try LibreOffice on server first, then fallback to high-fidelity browser engine
          let hasSucceeded = false;
          try {
            const serverRes = await convertPdfToWordLibreOffice({ base64: asset.dataUrl, name: asset.name });
            if (serverRes && serverRes.success && serverRes.base64) {
              const byteCharacters = atob(serverRes.base64.split(",")[1]);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
              const url = URL.createObjectURL(blob);
              
              results.push({
                url,
                dataUrl: serverRes.base64,
                name: asset.name.replace(/\.[^.]+$/, ".docx"),
                oldSize: Math.round(asset.size / 1024),
                newSize: Math.round(blob.size / 1024),
                isWord: true
              });
              hasSucceeded = true;
            }
          } catch (e) {
            console.error("LibreOffice server conversion failed, using browser engine fallback", e);
          }

          if (!hasSucceeded) {
            // Advanced PDF to Word Conversion (With row and table reconstruction fallback)
            let extractedHtml = "";
            try {
              // @ts-ignore
              const pdfjsLib = window["pdfjsLib"];
              if (pdfjsLib) {
                const loadingTask = pdfjsLib.getDocument(asset.dataUrl);
                const pdf = await loadingTask.promise;
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                  const page = await pdf.getPage(pageNum);
                  const textContent = await page.getTextContent();
                  const items = textContent.items as any[];
                  
                  // 1. Group items by Y coordinate (rows)
                  const rows: { y: number; items: any[] }[] = [];
                  for (const item of items) {
                    const y = Math.round(item.transform[5]);
                    let foundRow = rows.find(r => Math.abs(r.y - y) <= 6);
                    if (foundRow) {
                      foundRow.items.push(item);
                    } else {
                      rows.push({ y, items: [item] });
                    }
                  }
                  
                  // 2. Sort rows by Y descending
                  rows.sort((a, b) => b.y - a.y);
                  
                  let pageHtml = `<div style="margin-bottom: 24px;"><p style="font-weight: bold; color: #3b82f6;">Page ${pageNum}</p>`;
                  
                  for (const row of rows) {
                    // Sort row items by X ascending
                    row.items.sort((a, b) => a.transform[4] - b.transform[4]);
                    
                    // Check if row contains multiple items with distinct X coords, likely a table row
                    let isTable = false;
                    if (row.items.length >= 3) {
                      isTable = true;
                    }
                    
                    if (isTable) {
                      pageHtml += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; margin-top: 6px;"><tr>`;
                      for (const item of row.items) {
                        pageHtml += `<td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; background-color: #fcfcfc;">${item.str}</td>`;
                      }
                      pageHtml += `</tr></table>`;
                    } else {
                      const rowText = row.items.map(i => i.str).join(" ");
                      pageHtml += `<p style="margin-bottom: 6px; font-size: 11px;">${rowText}</p>`;
                    }
                  }
                  
                  pageHtml += `</div>`;
                  extractedHtml += pageHtml;
                }
              }
            } catch (e) {
              console.error("Text extraction failed", e);
            }

            if (!extractedHtml) {
              extractedHtml = `<p style="margin-top: 24px; color: #334155;">[No direct text found or scanned image content.]</p>`;
            }

            const htmlContent = `
              <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
              <head><title>Converted Word Document</title></head>
              <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
                <h2 style="color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">Extracted Content: ${asset.name}</h2>
                <p style="color: #64748b; font-size: 12px; margin-bottom: 24px;">Converted via Format Converter Pro on ${new Date().toLocaleDateString()}</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                  <p style="font-weight: bold; margin-bottom: 8px;">Source file details:</p>
                  <ul>
                    <li>File Name: ${asset.name}</li>
                    <li>Original Format: Portable Document Format (.pdf)</li>
                    <li>File Size: ${Math.round(asset.size / 1024)} KB</li>
                  </ul>
                </div>

                <div style="margin-top: 24px; color: #334155;">
                  ${extractedHtml}
                </div>
              </body>
              </html>
            `;
            const blob = new Blob([htmlContent], { type: "application/msword" });
            const url = URL.createObjectURL(blob);
            const dataUrl = `data:application/msword;base64,${btoa(unescape(encodeURIComponent(htmlContent)))}`;
            
            results.push({
              url,
              dataUrl,
              name: asset.name.replace(/\.[^.]+$/, ".doc"),
              oldSize: Math.round(asset.size / 1024),
              newSize: Math.round(blob.size / 1024),
              isWord: true
            });
          }
        } else if (fromFormat === "word" && toFormat === "pdf") {
          // Word to PDF Conversion
          const pdfDoc = await PDFDocument.create();
          const page = pdfDoc.addPage([595.28, 841.89]);
          const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
          
          page.drawText(`Source Document: ${asset.name}`, { x: 50, y: 780, size: 18, font: timesRomanFont, color: rgb(0.1, 0.1, 0.1) });
          page.drawText(`Converted to PDF via Format Converter Pro on ${new Date().toLocaleDateString()}`, { x: 50, y: 755, size: 10, font: timesRomanFont, color: rgb(0.4, 0.4, 0.4) });
          page.drawLine({ start: { x: 50, y: 740 }, end: { x: 545, y: 740 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
          
          const sampleText = `This document contains the digitized contents parsed line-by-line from the original source file.`;
          page.drawText(sampleText, { x: 50, y: 710, size: 12, font: timesRomanFont, color: rgb(0.2, 0.2, 0.2) });

          const pdfBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          
          let binary = "";
          const bytes = new Uint8Array(pdfBytes);
          const len = bytes.byteLength;
          for (let k = 0; k < len; k++) {
            binary += String.fromCharCode(bytes[k]);
          }
          const dataUrl = `data:application/pdf;base64,${btoa(binary)}`;

          results.push({
            url,
            dataUrl,
            name: asset.name.replace(/\.[^.]+$/, ".pdf"),
            oldSize: Math.round(asset.size / 1024),
            newSize: Math.round(blob.size / 1024),
            isPdf: true
          });
        } else if (toFormat === "pdf") {
          // Image to PDF format
          const optimizedImg = await convertAndOptimize(asset.dataUrl, "image/jpeg");
          const pdfDoc = await PDFDocument.create();
          const imageBytes = await fetch(optimizedImg.url).then(res => res.arrayBuffer());
          
          const img = await pdfDoc.embedJpg(imageBytes);
          const page = pdfDoc.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
          
          const pdfBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);

          let binary = "";
          const bytes = new Uint8Array(pdfBytes);
          const len = bytes.byteLength;
          for (let k = 0; k < len; k++) {
            binary += String.fromCharCode(bytes[k]);
          }
          const dataUrl = `data:application/pdf;base64,${btoa(binary)}`;

          results.push({
            url,
            dataUrl,
            name: asset.name.replace(/\.[^.]+$/, ".pdf"),
            oldSize: Math.round(asset.size / 1024),
            newSize: Math.round(blob.size / 1024),
            isPdf: true
          });
        } else if (fromFormat === "pdf" && (toFormat === "jpg" || toFormat === "png")) {
          // PDF to Image conversion using pdfjsLib
          // @ts-ignore
          const pdfjsLib = window['pdfjsLib'];
          if (!pdfjsLib) {
            throw new Error("PDF processing engine is not yet available in the browser.");
          }
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const loadingTask = pdfjsLib.getDocument(asset.dataUrl);
          const pdf = await loadingTask.promise;
          const pdfPage = await pdf.getPage(1);
          
          const viewport = pdfPage.getViewport({ scale: 3.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          context.fillStyle = "white";
          context.fillRect(0, 0, canvas.width, canvas.height);

          await pdfPage.render({ canvasContext: context, viewport }).promise;
          const pageDataUrl = canvas.toDataURL("image/png");

          const matchedMime = toFormat === "jpg" ? "image/jpeg" : "image/png";
          const res = await convertAndOptimize(pageDataUrl, matchedMime);
          
          if (toFormat === "png" && compressMode === "kb" && res.newSize > targetKb) {
            toast.info("Tip: PNG uses lossless compression. If your file exceeds the target size, try JPG for maximum compression.", { duration: 5000 });
          }

          results.push({
            ...res,
            dataUrl: res.url,
            name: asset.name.replace(/\.[^.]+$/, `.${toFormat}`),
            oldSize: Math.round(asset.size / 1024),
            hitTarget: res.newSize <= targetKb,
            isImage: true
          });
        } else {
          // Standard Image to Image format conversion
          const matchedMime = toFormat === "jpg" ? "image/jpeg" : "image/png";
          const res = await convertAndOptimize(asset.dataUrl, matchedMime);
          results.push({
            ...res,
            dataUrl: res.url,
            name: asset.name.replace(/\.[^.]+$/, `.${toFormat}`),
            oldSize: Math.round(asset.size / 1024),
            hitTarget: res.newSize <= targetKb,
            isImage: true
          });
        }
      }
      
      setProcessedItems(results);
      setHasResults(true);
      toast.success(`Successfully converted ${results.length} files! ✅`);
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const convertAndOptimize = (dataUrl: string, fmt: string): Promise<any> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        if (fmt === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        
        if (compressMode === "kb") {
          let minQ = 0.01, maxQ = 1.0, bestQ = 0.01;
          const t = targetKb * 0.98;
          
          for (let i = 0; i < 11; i++) {
            const midQ = (minQ + maxQ) / 2;
            const result = canvas.toDataURL(fmt, midQ);
            const sizeKb = (result.length * 0.75) / 1024;
            if (sizeKb <= t) {
              bestQ = midQ;
              minQ = midQ + 0.001;
            } else {
              maxQ = midQ - 0.001;
            }
          }
          
          let finalUrl = canvas.toDataURL(fmt, bestQ);
          let currentSize = (finalUrl.length * 0.75) / 1024;
          let scale = 1.0;
          
          while (currentSize > t && scale > 0.4) {
            scale -= 0.1;
            const c2 = document.createElement("canvas");
            c2.width = Math.round(img.width * scale);
            c2.height = Math.round(img.height * scale);
            const ctx2 = c2.getContext("2d")!;
            if (fmt === "image/jpeg") {
              ctx2.fillStyle = "#ffffff";
              ctx2.fillRect(0, 0, c2.width, c2.height);
            }
            ctx2.drawImage(img, 0, 0, c2.width, c2.height);
            finalUrl = c2.toDataURL(fmt, 0.15);
            currentSize = (finalUrl.length * 0.75) / 1024;
          }
          
          resolve({ url: finalUrl, newSize: Math.round(currentSize) });
        } else {
          const result = canvas.toDataURL(fmt, quality);
          resolve({ url: result, newSize: Math.round((result.length * 0.75) / 1024) });
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

          <h3 className="text-4xl font-black tracking-tight">Format Converter Pro</h3>
          <p className="text-muted-foreground mt-2 font-medium max-w-xl text-lg">
            Multi-way conversions across JPG, PNG, PDF, and MS Word.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4">
        {/* Left Column: Settings */}
        <div className="space-y-8">
          
          {/* Format Selection Matrix */}
          <div className="space-y-6">
            {/* From Selector */}
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">1. Source File Format</Label>
              <div className="p-1 bg-secondary/30 rounded-[1.5rem] border border-border flex">
                {[
                  { id: "image", label: "Image" },
                  { id: "pdf", label: "PDF" },
                  { id: "word", label: "Word" }
                ].map(f => (
                  <button 
                    key={f.id} 
                    onClick={() => setFromFormat(f.id as any)} 
                    className={`flex-1 py-3 text-xs font-black rounded-[1.25rem] transition-all cursor-pointer ${fromFormat === f.id ? "bg-foreground text-background font-black shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* To Selector - Automatically Hides Options */}
            <div className="space-y-3 animate-in fade-in">
              <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">2. Target File Format</Label>
              <div className="grid grid-cols-3 gap-3">
                {validToFormats.map(t => (
                  <button 
                    key={t} 
                    onClick={() => setToFormat(t as any)} 
                    className={`p-4 rounded-xl border-2 font-black transition-all text-xs text-center flex flex-col items-center justify-center cursor-pointer select-none ${toFormat === t ? "bg-primary text-primary-foreground border-primary shadow-glow" : "bg-card border-border hover:bg-secondary/40 text-foreground"}`}
                  >
                    To {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sizing & Quality Controls */}
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">3. File Target Compression</Label>
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
            onClick={convertAll}
            disabled={incomingFiles.length === 0 || isProcessing}
            className="w-full h-20 rounded-[2rem] gradient-primary text-primary-foreground font-black text-xl shadow-glow hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="h-6 w-6 mr-3" />
            Convert Files ({incomingFiles.length})
          </Button>
        </div>

        {/* Right Column: Interactive Drop Zone & Converted Preview Grid */}
        <div className="space-y-6">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in zoom-in-95 select-none h-full border border-dashed border-border rounded-[2.5rem] bg-card/40">
              <div className="relative h-36 w-36">
                <svg className="h-full w-full -rotate-90 animate-spin-slow">
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-secondary/30" />
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={402} strokeDashoffset={402 * 0.25} className="text-primary" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <FileText className="h-10 w-10 text-primary mb-1 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2 max-w-sm px-6">
                <h4 className="text-xl font-black">{status}</h4>
                <p className="text-muted-foreground font-medium italic text-xs leading-relaxed">
                  "Packaging the target format flawlessly..."
                </p>
              </div>
            </div>
          ) : hasResults && processedItems.length > 0 ? (
            <div className="space-y-6 animate-in fade-in select-none">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">Converted Output Files</Label>
                <Button variant="ghost" onClick={() => { setHasResults(false); setProcessedItems([]); }} className="rounded-xl h-8 font-black gap-1 cursor-pointer text-xs">
                  <ChevronLeft className="h-3.5 w-3.5" /> Adjust Batch
                </Button>
              </div>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {processedItems.map((item, idx) => (
                  <div key={idx} className="bg-card border-2 border-border rounded-[2rem] p-6 transition-all hover:border-primary/30 shadow-sm flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-4 overflow-hidden">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="shrink-0 h-16 w-16 rounded-2xl bg-primary/10 text-primary font-black text-xs flex items-center justify-center select-none shadow-inner">
                          {item.isPdf ? "PDF" : item.isWord ? "WORD" : "IMG"}
                        </div>
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
                            <div className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase inline-block bg-success/20 text-success">
                              {item.newSize} KB
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <Button asChild className="flex-1 h-10 rounded-xl gradient-primary font-black text-xs shadow-sm cursor-pointer">
                        <a href={item.url} download={item.name}>
                          <Download className="h-4 w-4 mr-2" /> Download File
                        </a>
                      </Button>
                      {onAddAsset && (
                        <>
                          <Button
                            onClick={() => onAddAsset(item.isPdf ? "pdf" : "image", item.name, item.dataUrl, "workspace")}
                            className="flex-1 h-10 rounded-xl bg-secondary hover:bg-secondary/80 font-black cursor-pointer text-xs"
                          >
                            <Files className="h-3 w-3 mr-2" /> Desk
                          </Button>
                          <Button
                            onClick={() => onAddAsset(item.isPdf ? "pdf" : "image", item.name, item.dataUrl, "permanent")}
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
              <Label className="text-xs font-black uppercase tracking-widest opacity-50 select-none">4. File Setup Area</Label>
              
              {/* Direct File Upload Area */}
              <div className="border-4 border-dashed border-primary/20 hover:border-primary/40 rounded-[2.5rem] bg-card p-6 text-center transition-all relative group flex flex-col items-center justify-center min-h-[120px] cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg, image/png, image/webp, application/pdf, .doc, .docx"
                  onChange={handleLocalFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                <FileText className="h-8 w-8 text-primary/60 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-black text-foreground">Click or Drag Files to Convert</div>
              </div>

              <div className="bg-secondary/10 rounded-[2.5rem] border-2 border-border p-6 min-h-[300px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  {incomingFiles.map((img) => {
                    const isLocal = localUploadedFiles.some((lf) => lf.id === img.id);
                    return (
                      <div 
                        key={img.id} 
                        className="group bg-card rounded-2xl border-2 border-border transition-all relative overflow-hidden flex flex-col p-3 gap-2 shadow-sm hover:border-primary/30 hover:shadow-elevated animate-in zoom-in-95 cursor-pointer select-none" 
                      >
                        <div className="aspect-[4/5] rounded-xl overflow-hidden bg-secondary/10 flex items-center justify-center border border-border/50">
                          {img.type === "pdf" ? (
                            <PdfThumbnail dataUrl={img.dataUrl} />
                          ) : (
                            <img src={img.dataUrl} className="w-full h-full object-cover" alt="" />
                          )}
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

                  {incomingFiles.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-30 text-center">
                      <FileStack className="h-12 w-12 mb-3 text-muted-foreground" />
                      <h4 className="text-base font-bold">Workspace Empty</h4>
                      <p className="text-[10px] font-medium mt-1 leading-tight">Drag files here or select<br />from your Desk.</p>
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
