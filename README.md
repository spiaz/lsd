# LSD — Lausanne Shift Driver

> A smoother trip through every shift.

LSD is a local-first PWA that converts a supported driver's schedule PDF into a mobile calendar. PDF parsing, storage and calendar export happen in the browser; no personal planning data is uploaded to an application server.

## Stack

- React + TypeScript
- Vite + vite-plugin-pwa
- PDF.js for local PDF text extraction
- IndexedDB through `idb`
- Vitest
- GitHub Pages

## Local development

Requirements: Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Before pushing:

```bash
npm test
npm run typecheck
npm run build
```

## Personal PDF fixture

Place private development inputs under `tmp/`, for example:

```text
tmp/example.pdf
```

The directory is ignored by Git. Never copy real PDF contents or derived personal schedule data into public fixtures, snapshots, logs or issues.

## Documentation

- Product and MVP requirements: [`docs/mvp.md`](docs/mvp.md)
- Historical sanitised prototype: [`mvp-sanitized/`](mvp-sanitized/)
