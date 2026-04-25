"use client";

import React from "react";

function bytes(n: number) {
  const units = ["B", "KB", "MB", "GB"];
  let u = 0;
  let v = n;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v.toFixed(u === 0 ? 0 : 1)} ${units[u]}`;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Converter() {
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);
  const [downloadName, setDownloadName] = React.useState<string>("document.pdf");

  React.useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  async function onConvert() {
    setError(null);
    setDownloadUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    if (!file) {
      setError("Выберите файл .docx.");
      return;
    }

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "docx" && ext !== "doc") {
      setError("Поддерживается только .docx (и .doc — с подсказкой).");
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);

      const res = await fetch("/api/convert", { method: "POST", body: fd });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || `Ошибка конвертации (${res.status}).`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(
        `${file.name.replace(/\.[^/.]+$/, "") || "document"}.pdf`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-black/10 bg-zinc-50/60 p-4 dark:border-white/10 dark:bg-white/5">
        <label className="block">
          <span className="sr-only">Выберите файл</span>
          <input
            type="file"
            accept=".docx,.doc,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black/90 dark:file:bg-white dark:file:text-black dark:hover:file:bg-white/90"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-600 dark:text-zinc-300">
            {file ? (
              <span className="font-medium">
                {file.name}{" "}
                <span className="opacity-70">· {bytes(file.size)}</span>
              </span>
            ) : (
              <span>Файл не выбран</span>
            )}
          </div>

          <button
            type="button"
            onClick={onConvert}
            disabled={!file || busy}
            className={cx(
              "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition",
              "bg-foreground text-background",
              (!file || busy) && "opacity-50 cursor-not-allowed",
              file && !busy && "hover:opacity-90",
            )}
          >
            {busy ? "Конвертирую…" : "Сделать PDF"}
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        {downloadUrl ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/80 p-3 dark:border-white/10 dark:bg-black/20">
            <div className="text-sm">
              Готово.{" "}
              <span className="text-zinc-600 dark:text-zinc-300">
                PDF можно скачать.
              </span>
            </div>
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              Скачать
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}

