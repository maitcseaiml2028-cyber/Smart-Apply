import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db";
import { applications, documents, users, profiles } from "../db/schema";
import { eq } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";
import { getEvent } from "vinxi/http";

const getContextDb = () => {
  try {
    const event = getEvent();
    const env = (event?.context as any)?.cloudflare?.env;
    return getDb(env);
  } catch (e) {
    // Fallback for local development
    return getDb();
  }
};

const getUserId = () => {
  try {
    return getCookie("userId") || "user_1";
  } catch (e) {
    return "user_1";
  }
};

export const getDashboardData = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const userId = getUserId();
      const db = getContextDb();
      const userRes = await db.select().from(users).where(eq(users.id, userId));
      const user = userRes[0];

      const userApps = await db.select().from(applications).where(eq(applications.userId, userId)).limit(5);
      const allApps = await db.select().from(applications).where(eq(applications.userId, userId));

      const pendingCount = allApps.filter((a: any) => a.status === "pending").length;
      
      return {
        user: user || { fullName: "Guest User" },
        recentApplications: userApps || [],
        stats: [
          { label: "Total Applications", value: allApps.length },
          { label: "Pending Forms", value: pendingCount },
        ]
      };
    } catch (e) {
      console.error("Dashboard data error:", e);
      return { 
        user: { fullName: "Guest User" }, 
        stats: [], 
        recentApplications: [] 
      };
    }
  });

export const getApplications = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const userId = getUserId();
      const db = getContextDb();
      return await db.select().from(applications).where(eq(applications.userId, userId));
    } catch (e) {
      console.error("Get applications error:", e);
      return [];
    }
  });

export const getDocuments = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const userId = getUserId();
      const db = getContextDb();
      return await db.select().from(documents).where(eq(documents.userId, userId));
    } catch (e) {
      console.error("Get documents error:", e);
      return [];
    }
  });

export const createApplication = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: any }) => {
    try {
      const userId = getUserId();
      const db = getContextDb();
      const id = Math.random().toString(36).substring(2, 15);
      
      const newApp = {
        id,
        userId,
        name: String(data.name),
        link: String(data.link),
        status: (data.status || "pending") as any,
        applyDate: data.applyDate ? String(data.applyDate) : null,
        admitDate: data.admitDate ? String(data.admitDate) : null,
        examDate: data.examDate ? String(data.examDate) : null,
        resultDate: data.resultDate ? String(data.resultDate) : null,
      };

      await db.insert(applications).values(newApp);

      return { success: true, id };
    } catch (err: any) {
      console.error("Create application error:", err);
      return { success: false, error: err.message };
    }
  });

export const updateApplication = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: any }) => {
    try {
      const { id, ...updates } = data;
      const db = getContextDb();
      await db.update(applications)
        .set(updates)
        .where(eq(applications.id, id));
      return { success: true };
    } catch (err: any) {
      console.error("Update application error:", err);
      return { success: false, error: err.message };
    }
  });

export const uploadDocument = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: any }) => {
    try {
      const userId = getUserId();
      const db = getContextDb();
      const id = Math.random().toString(36).substring(2, 15);
      
      const newDoc = {
        id,
        userId,
        name: String(data.name),
        type: String(data.type),
        size: String(data.size),
        verified: false,
        filePath: String(data.dataUrl), // Storing dataUrl for demo simplicity
      };

      await db.insert(documents).values(newDoc);
      return { success: true, id };
    } catch (err: any) {
      console.error("Upload document error:", err);
      return { success: false, error: err.message };
    }
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { id: string } }) => {
    try {
      const db = getContextDb();
      await db.delete(documents).where(eq(documents.id, data.id));
      return { success: true };
    } catch (err: any) {
      console.error("Delete document error:", err);
      return { success: false, error: err.message };
    }
  });

export const getProfile = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const userId = getUserId();
      const db = getContextDb();
      const userRes = await db.select().from(users).where(eq(users.id, userId));
      const user = userRes[0];

      const profilesRes = await db.select().from(profiles).where(eq(profiles.userId, userId));
      let profile = profilesRes[0];

      if (!profile && user) {
        // Create default profile if not exists
        await db.insert(profiles).values({
          userId,
          dob: "12 Aug 1999",
          gender: "Male",
          phone: "+91 98765 43210",
          aadhaarLast4: "4521",
          addressLine1: "42 Indiranagar 1st Stage",
          city: "Bengaluru",
          state: "Karnataka",
          qualification: "B.Tech Computer Science",
          institution: "BITS Pilani",
        });
        const finalProfilesRes = await db.select().from(profiles).where(eq(profiles.userId, userId));
        profile = finalProfilesRes[0];
      }

      return { user, profile };
    } catch (e) {
      console.error("Get profile error:", e);
      return { 
        user: { fullName: "Guest User" }, 
        profile: { dob: "", city: "" } as any 
      };
    }
  });

export const updateProfile = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: any }) => {
    try {
      const userId = getUserId();
      const db = getContextDb();
      const { fullName, ...profileData } = data;

      if (fullName) {
        await db.update(users).set({ fullName }).where(eq(users.id, userId));
      }

      await db.update(profiles).set(profileData).where(eq(profiles.userId, userId));
      return { success: true };
    } catch (err: any) {
      console.error("Update profile error:", err);
      return { success: false, error: err.message };
    }
  });

export const getSessionUser = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const userId = getUserId();
      const db = getContextDb();
      const usersRes = await db.select().from(users).where(eq(users.id, userId));
      return usersRes[0];
    } catch (e) {
      return null;
    }
  });

import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export const compressPdfGhostscript = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { fileBase64: string, targetKb?: number } }) => {
    try {
      const { fileBase64, targetKb = 300 } = data;
      if (!fileBase64) throw new Error("File data is required");

      const base64Data = fileBase64.replace(/^data:application\/pdf;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const id = Math.random().toString(36).substring(2, 11);
      const tempDir = os.tmpdir();
      const inputPath = path.join(tempDir, `temp_input_${id}.pdf`);
      fs.writeFileSync(inputPath, buffer);

      const originalKb = buffer.length / 1024;
      const isWin = process.platform === "win32";

      let gsPath = isWin ? "C:\\Program Files\\gs\\gs10.07.0\\bin\\gswin64c.exe" : "gs";
      let qpdfPath = isWin ? "C:\\Program Files\\qpdf 12.3.2\\bin\\qpdf.exe" : "qpdf";

      if (isWin) {
        if (!fs.existsSync(gsPath)) gsPath = "gswin64c";
        if (!fs.existsSync(gsPath)) gsPath = "gs";
        if (!fs.existsSync(qpdfPath)) qpdfPath = "qpdf";
      }

      // Print versions for debugging as requested
      execFile(gsPath, ["--version"], (err, stdout) => { if (!err) console.log(`Ghostscript: ${stdout.trim()}`); });
      execFile(qpdfPath, ["--version"], (err, stdout) => { if (!err) console.log(`QPDF: ${stdout.trim()}`); });

      const cleanUp = (...paths: string[]) => {
        for (const p of paths) try { fs.unlinkSync(p); } catch {}
      };

      // ─── Helper: run QPDF lossless optimization ───────────────────────────
      const runQpdfLossless = (inFile: string, outFile: string) =>
        new Promise<void>((resolve, reject) => {
          execFile(qpdfPath, [
            "--linearize",
            "--object-streams=generate",
            "--compress-streams=y",
            "--decode-level=specialized",
            "--remove-unreferenced-resources=yes",
            inFile, outFile,
          ], (err) => err ? reject(err) : resolve());
        });

      // ─── Helper: run Ghostscript image-only downsampling ──────────────────
      const runGsImageOnly = (dpi: number, jpegQ: number, setting: string, inFile: string, outFile: string) =>
        new Promise<void>((resolve, reject) => {
          execFile(gsPath, [
            "-sDEVICE=pdfwrite",
            "-dNOPAUSE", "-dQUIET", "-dBATCH", "-dSAFER",
            "-dCompatibilityLevel=1.5",
            `-dPDFSETTINGS=${setting}`,
            "-dSubsetFonts=true",
            "-dCompressFonts=true",
            "-dDetectDuplicateImages=true",
            "-dDownsampleColorImages=true",
            "-dDownsampleGrayImages=true",
            "-dDownsampleMonoImages=true",
            "-dColorImageDownsampleType=/Bicubic",
            "-dGrayImageDownsampleType=/Bicubic",
            "-dMonoImageDownsampleType=/Bicubic",
            "-dColorImageDownsampleThreshold=1.0",
            "-dGrayImageDownsampleThreshold=1.0",
            "-dMonoImageDownsampleThreshold=1.0",
            `-dColorImageResolution=${dpi}`,
            `-dGrayImageResolution=${dpi}`,
            `-dMonoImageResolution=${Math.max(dpi, 300)}`,
            `-dJPEGQ=${jpegQ}`,
            `-sOutputFile=${outFile}`,
            inFile,
          ], (err) => err ? reject(err) : resolve());
        });

      const getKb = (f: string) => fs.statSync(f).size / 1024;

      let bestBuffer: Buffer = buffer; 
      let bestKb = originalKb;

      // PHASE 1: Lossless QPDF optimization
      const qpdfOut = path.join(tempDir, `temp_qpdf_${id}.pdf`);
      try {
        await runQpdfLossless(inputPath, qpdfOut);
        const qpdfKb = getKb(qpdfOut);
        if (qpdfKb < bestKb) {
          bestBuffer = fs.readFileSync(qpdfOut);
          bestKb = qpdfKb;
        }
      } catch { /* skip if qpdf fails */ }
      cleanUp(qpdfOut);

      // PHASE 2: Straightforward high-quality Ghostscript compression
      const tryOut = path.join(tempDir, `temp_try_out_${id}.pdf`);
      try {
        await runGsImageOnly(150, 75, "/ebook", inputPath, tryOut);
        const kb = getKb(tryOut);
        if (kb < bestKb) {
          bestBuffer = fs.readFileSync(tryOut);
          bestKb = kb;
        }
        cleanUp(tryOut);
      } catch (e) {
        cleanUp(tryOut);
      }

      cleanUp(inputPath);

      return {
        success: true,
        base64: `data:application/pdf;base64,${bestBuffer.toString("base64")}`,
      };

    } catch (err: any) {
      console.error("PDF compression error:", err);
      return { success: false, error: err.message };
    }
  });

export const convertPdfToWordLibreOffice = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { base64: string; name: string } }) => {
    const id = Math.random().toString(36).substring(2, 11);
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${id}.pdf`);
    
    // Save base64 to input.pdf
    const base64Content = data.base64.includes(",") ? data.base64.split(",")[1] : data.base64;
    const buffer = Buffer.from(base64Content, "base64");
    fs.writeFileSync(inputPath, buffer);
    
    try {
      await new Promise<void>((resolve, reject) => {
        execFile("libreoffice", [
          "--headless",
          "--convert-to", "docx",
          inputPath,
          "--outdir", tempDir
        ], (err) => err ? reject(err) : resolve());
      });
      
      const docxPath = path.join(tempDir, `input_${id}.docx`);
      if (fs.existsSync(docxPath)) {
        const outBuffer = fs.readFileSync(docxPath);
        try { fs.unlinkSync(inputPath); fs.unlinkSync(docxPath); } catch {}
        
        return {
          success: true,
          base64: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${outBuffer.toString("base64")}`
        };
      } else {
        throw new Error("LibreOffice output not found");
      }
    } catch (err: any) {
      console.error("LibreOffice conversion error:", err);
      try { fs.unlinkSync(inputPath); } catch {}
      return { success: false, error: err.message };
    }
  });
