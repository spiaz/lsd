# LSD — Lausanne Shift Discovery

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
npm ci
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

## Implemented workflow

The French interface supports local PDF import, editable validation, a monthly calendar,
focused day navigation, persistent IndexedDB storage, period merging/replacement and
Zurich-timezone ICS export. Presence stations are kept separate from trip stations.
Operational hours such as `25:31` remain on the following day throughout the workflow.
Split services export one event per block, each with a two-hour reminder. Calendar
imports are snapshots; replacing an old export is the calendar user's responsibility.

To try the app without personal data, select
[`public/fixtures/planning-synthetic.pdf`](public/fixtures/planning-synthetic.pdf).
Use `npm run build` followed by `npm run preview` to test the production PWA at
`http://localhost:4173/lsd/`. The development server does not enable the service worker.

Supported PDFs must contain selectable text and recognized planning columns. Unknown
codes require explicit review; unsupported layouts, corrupt files and scans produce
visible errors. Local OCR is not implemented. Files are limited to 25 MB and 100 pages.
The source PDF is not stored after import; schedules and import metadata stay in the
current browser. Clearing site data removes the saved planning.

## Verification

`npm test` covers coordinate parsing, the complete synthetic PDF through PDF.js,
overnight times, validation, merging, ICS, IndexedDB and the React import flow.
`npm run typecheck` and `npm run build` are also required by CI; installs use the lockfile.
The service worker precaches the PDF worker as well as the application shell.

Device acceptance checks still require an unlocked browser and physical phones:
installation on iOS/Android, the 370px layout, swipe navigation, reopening offline,
and importing the exported ICS into the target calendar application.

## GitHub Pages

In repository Settings → Pages, select **GitHub Actions** as the build source.
The Pages workflow builds and publishes only `dist/` on pushes to `main` or manual
workflow dispatch. It runs the tests and typecheck before deployment. Vite, the
manifest and the service worker use `/lsd/`, matching `https://spiaz.github.io/lsd/`.
No custom domain or alternate hosting service is required.
