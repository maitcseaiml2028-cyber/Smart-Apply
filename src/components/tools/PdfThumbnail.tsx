import { useState, useEffect, useRef } from "react";
import { FileText } from "lucide-react";

export function PdfThumbnail({ dataUrl }: { dataUrl: string }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    const generate = async () => {
      try {
        // @ts-ignore
        const pdfjsLib = window['pdfjsLib'];
        if (!pdfjsLib) return;
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument(dataUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        setThumbnail(canvas.toDataURL());
      } catch (e) {
        console.error("Thumbnail gen failed", e);
      }
    };
    generate();
  }, [dataUrl]);

  return (
    <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden border border-border/50 rounded-sm shadow-inner">
      {thumbnail ? (
        <img src={thumbnail} className="w-full h-full object-contain animate-in fade-in duration-500" alt="PDF Preview" />
      ) : (
        <FileText className="h-10 w-10 text-muted-foreground/20 animate-pulse" />
      )}
    </div>
  );
}
