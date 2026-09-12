/// <reference types="node" />
// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parsePdfItems, type PdfPage } from './parse-items';
import { validateSchedule } from '../domain/validation';
describe('public synthetic PDF', () => {
  it('extracts all pages through PDF.js and validates without unresolved issues', async () => {
    const bytes = await readFile(new URL('../../public/fixtures/planning-synthetic.pdf', import.meta.url));
    const task = getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
    const document = await task.promise;
    try {
      const pages: PdfPage[] = [];
      for (let number = 1; number <= document.numPages; number++) {
        const content = await (await document.getPage(number)).getTextContent();
        pages.push({ number, items: content.items.flatMap(item => 'str' in item ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }] : []) });
      }
      const result = parsePdfItems(pages, 'planning-synthetic.pdf');
      expect(result.issues).toEqual([]); expect(result.schedule!.days).toHaveLength(31);
      expect(validateSchedule(result.schedule!)).toEqual([]);
      expect(result.schedule!.days.filter(d => d.shift?.kind === 'split')).toHaveLength(5);
      expect(result.schedule!.days.find(d => d.date === '2026-10-30')!.shift!.presenceEnd).toBe('25:31');
    } finally { await task.destroy(); }
  });
});
