import { Converter } from "./converter";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="w-full max-w-xl">
        <div className="rounded-3xl border border-black/10 bg-white/60 p-8 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.45)] backdrop-blur dark:border-white/10 dark:bg-white/5">
          <header className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
                DOCX → PDF
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Экспорт в PDF
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Максимально простой конвертер. Загрузите <b>.docx</b> — получите
                готовый PDF.
              </p>
            </div>
          </header>

          <Converter />

          <footer className="mt-8 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            <p>
              <b>.doc</b> (старый Word) не поддерживается без внешнего сервиса —
              сохраните файл как <b>.docx</b>.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
