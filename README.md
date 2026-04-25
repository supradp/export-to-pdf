# export-to-pdf

Минималистичный конвертер **DOCX → PDF** на Next.js, готовый к деплою на Vercel.

## Как работает

- **.docx**: конвертация в HTML через `mammoth`, затем печать в PDF через headless Chromium.
- **.doc**: на Vercel без внешнего сервиса не поддерживается (в API будет понятная ошибка).

## Запуск локально

```bash
npm i
npm run dev
```

### Важно про Chromium локально

На Vercel Chromium подхватывается автоматически. Локально (Windows/macOS/Linux) нужно указать путь к установленному Chrome/Chromium:

- **PowerShell**:

```powershell
$env:PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run dev
```

Если Chrome не установлен, можно использовать Edge:

```powershell
$env:PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
npm run dev
```

## Деплой на Vercel

- Загрузите репозиторий на GitHub
- Import Project в Vercel
- Ничего дополнительно настраивать не нужно (по умолчанию будет работать `npm run build`)

## Ограничения

- Большие `.docx` могут упереться в лимиты тела запроса Serverless Functions на Vercel.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
