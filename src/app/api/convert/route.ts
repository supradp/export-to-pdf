import chromium from "@sparticuz/chromium";
import mammoth from "mammoth";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

export const runtime = "nodejs";

function firstExistingPath(candidates: Array<string | undefined | null>) {
  for (const p of candidates) {
    if (!p) continue;
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return undefined;
}

function guessWindowsBrowserPath() {
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env["ProgramFiles(x86)"];
  const localAppData = process.env.LOCALAPPDATA;

  const candidates = [
    programFiles && path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    programFilesX86 && path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    localAppData && path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    programFiles && path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    programFilesX86 && path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    localAppData && path.join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
  ];

  return firstExistingPath(candidates);
}

function sanitizeBaseName(name: string) {
  const base = name.replace(/\.[^/.]+$/, "");
  const safe = base.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim();
  return safe.length ? safe : "document";
}

function wrapHtml(bodyHtml: string) {
  // Intentionally minimal: keep doc typography readable in PDF.
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
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
      .mammoth-warning { display: none; }
    </style>
  </head>
  <body>
    ${bodyHtml}
  </body>
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
            "Формат .doc (старый Word) не поддерживается на Vercel без внешнего сервиса. Сохраните файл как .docx и попробуйте снова.",
        },
        { status: 415 },
      );
    }

    if (ext !== "docx") {
      return Response.json(
        { error: "Поддерживается только .docx (и .doc — с подсказкой)." },
        { status: 415 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const docxBuffer = Buffer.from(arrayBuffer);

    const { value: htmlBody } = await mammoth.convertToHtml(
      { buffer: docxBuffer },
      {
        styleMap: [],
        includeDefaultStyleMap: true,
      },
    );

    const html = wrapHtml(htmlBody);

    const localExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    const vercelExecutablePath = await chromium
      .executablePath()
      .catch(() => undefined);

    const execPath = firstExistingPath([
      localExecutablePath,
      vercelExecutablePath,
      process.platform === "win32" ? guessWindowsBrowserPath() : undefined,
    ]);

    if (!execPath) {
      return Response.json(
        {
          error:
            "Не найден браузер для генерации PDF. На Vercel это работает автоматически; локально установите Chrome/Edge и задайте PUPPETEER_EXECUTABLE_PATH (путь к chrome.exe/msedge.exe).",
        },
        { status: 500 },
      );
    }

    const browser = await puppeteer.launch({
      executablePath: execPath,
      args: localExecutablePath ? [] : chromium.args,
      // `@sparticuz/chromium` typings change over time; keep this explicit.
      defaultViewport: { width: 1280, height: 720 },
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: ["domcontentloaded", "load"] });
      await page.emulateMediaType("screen");

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
      });

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

