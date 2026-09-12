/// <reference types="node" />
// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('PDF engine browser compatibility', () => {
  it('extracts the synthetic PDF without native typed-array codecs or Promise.try', () => {
    // Isolated runtime: legacy must install its compatibility helpers before use.
    // Both the API and its worker execute here, without altering other tests.
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import { readFile } from 'node:fs/promises';
      Uint8Array.prototype.toHex = undefined;
      Uint8Array.prototype.toBase64 = undefined;
      Uint8Array.fromBase64 = undefined;
      Promise.try = undefined;
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const task = getDocument({ data: new Uint8Array(await readFile('public/fixtures/planning-synthetic.pdf')), verbosity: 0 });
      try {
        const pdf = await task.promise;
        let hasText = false;
        for (let n = 1; n <= pdf.numPages; n++) {
          const content = await (await pdf.getPage(n)).getTextContent();
          hasText ||= content.items.length > 0;
        }
        console.log(JSON.stringify({ pages: pdf.numPages, hasText }));
      } finally { await task.destroy(); }
    `], { encoding: 'utf8' });
    expect(JSON.parse(output.trim())).toEqual({ pages: 3, hasText: true });
  });
});
