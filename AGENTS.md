# LSD development guide

## Product source of truth

- Read `docs/mvp.md` before product changes.
- The app name is **LSD — Lausanne Shift Driver**.
- The tagline is **A smoother trip through every shift.**

## Architecture

- React + TypeScript + Vite.
- Static PWA deployed under `/lsd/` on GitHub Pages.
- The interface supports French (default), English, Italian and German through `src/i18n.ts`.
- Keep every user-facing string, date and generated ICS label localized; persist the explicit language choice locally.
- PDF parsing runs locally in the browser with PDF.js and deterministic rules.
- Persist schedules locally in IndexedDB.
- Generate ICS exports in the browser using timezone `Europe/Zurich`.

## Privacy and test data

- Never commit anything under `tmp/`.
- Never commit real PDFs, extracted PDF text, employee identifiers, schedules, routes, vehicle assignments, pay data or screenshots containing them.
- Never log raw PDF text or personal schedule data.
- Public fixtures and snapshots must contain synthetic data only.
- Do not send PDF contents to an LLM or external service.

## Quality rules

- Treat parser ambiguity as visible validation output, never as a guessed value.
- Keep domain and parser logic independent of React components.
- Cover parsing, time normalization, schedule merging and ICS generation with unit tests.
- Use semantic HTML and labelled icon buttons; never encode status by colour alone.
- Preserve correct next-day semantics for operational times such as `25:31`.
- Add or update translations in all four dictionaries whenever UI copy changes.
- Run `npm test`, `npm run typecheck` and `npm run build` before pushing.
