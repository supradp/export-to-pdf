import chromium from "@sparticuz/chromium-min";
import mammoth from "mammoth";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

export const runtime = "nodejs";
export const maxDuration = 60;

// GitHub Releases pack URL for @sparticuz/chromium-min v131.0.1
// Override via CHROMIUM_REMOTE_EXEC_PATH env var if you want to host the tar yourself.
const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_REMOTE_EXEC_PATH ??
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

// Windows local browser paths for development.
function guessWindowsExecPath() {
  const PF = process.env.ProgramFiles;
  const PF86 = process.env["ProgramFiles(x86)"];
  const LA = process.env.LOCALAPPDATA;
  const candidates = [
    PF && path.join(PF, "Google", "Chrome", "Application", "chrome.exe"),
    PF86 && path.join(PF86, "Google", "Chrome", "Application", "chrome.exe"),
    LA && path.join(LA, "Google", "Chrome", "Application", "chrome.exe"),
    PF && path.join(PF, "Microsoft", "Edge", "Application", "msedge.exe"),
    PF86 && path.join(PF86, "Microsoft", "Edge", "Application", "msedge.exe"),
    LA && path.join(LA, "Microsoft", "Edge", "Application", "msedge.exe"),
  ];
  for (const p of candidates) {
    if (p) {
      try {
        if (fs.existsSync(p)) return p;
      } catch {
        // ignore
      }
    }
  }
  return undefined;
}

function sanitizeBaseName(name: string) {
  const base = name.replace(/\.[^/.]+$/, "");
  const safe = base.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim();
  return safe.length ? safe : "document";
}

function wrapHtml(bodyHtml: string) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { margin: 28mm 22mm; }
      html, body { padding: 0; margin: 0; }
      body {
        font: 12pt ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
        color: #111;
        line-height: 1.55;
      }
      img { max-width: 100%; height: auto; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; }
      h1, h2, h3 { line-height: 1.25; margin: 0.9em 0 0.35em; }
      p { margin: 0.5em 0; }
      ul, ol { margin: 0.5em 0 0.5em 1.25em; }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "Файл не найден." }, { status: 400 });
    }

    const fileName = file.name || "document";
    const ext = fileName.toLowerCase().split(".").pop() || "";

    if (ext === "doc") {
      return Response.json(
        {
          error:
            "Формат .doc (старый Word) не поддерживается. Сохраните файл как .docx и попробуйте снова.",
        },
        { status: 415 },
      );
    }

    if (ext !== "docx") {
      return Response.json(
        { error: "Поддерживается только .docx." },
        { status: 415 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const { value: htmlBody } = await mammoth.convertToHtml({ buffer: buf });
    const html = wrapHtml(htmlBody);

    // Resolve Chromium executable:
    // 1. Explicit override (local dev)
    // 2. Vercel/serverless: download from remote URL
    // 3. Windows fallback (local dev, auto-detect Chrome/Edge)
    const localOverride = process.env.PUPPETEER_EXECUTABLE_PATH;
    const isVercel = process.env.VERCEL === "1";

    let execPath: string | undefined;
    let launchArgs: string[] = [];

    if (localOverride) {
      execPath = localOverride;
    } else if (isVercel || !process.env.LOCALAPPDATA) {
      // On Vercel: download and extract Chromium from remote pack
      execPath = await chromium.executablePath(CHROMIUM_PACK_URL);
      launchArgs = chromium.args;
    } else {
      execPath = guessWindowsExecPath();
    }

    if (!execPath) {
      return Response.json(
        {
          error:
            "Не найден браузер. Локально задайте переменную PUPPETEER_EXECUTABLE_PATH (путь к chrome.exe / msedge.exe).",
        },
        { status: 500 },
      );
    }

    const browser = await puppeteer.launch({
      executablePath: execPath,
      args: launchArgs,
      defaultViewport: { width: 1280, height: 720 },
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdf = await page.pdf({ format: "A4", printBackground: true });
      const outName = `${sanitizeBaseName(fileName)}.pdf`;

      return new Response(pdf as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(outName)}"`,
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return Response.json({ error: message }, { status: 500 });
  }
}
