import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ParseResult } from '../domain/schedule';
import { parsePdfItems, type PdfPage } from './parse-items';
GlobalWorkerOptions.workerSrc = workerUrl;
export async function parseSchedulePdf(file: File): Promise<ParseResult> {
  if (file.size > 25 * 1024 * 1024) return { issues: [{ severity: 'error', code: 'SIZE', message: 'Le PDF dépasse la limite de 25 Mo.' }] };
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()), verbosity: 0 });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100) return { issues: [{ severity: 'error', code: 'PAGES', message: 'Le PDF dépasse la limite de 100 pages.' }] };
    const pages: PdfPage[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number), content = await page.getTextContent();
      pages.push({ number, items: content.items.flatMap(item => 'str' in item ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }] : []) });
      page.cleanup();
    }
    return parsePdfItems(pages, file.name);
  } catch {
    return { issues: [{ severity: 'error', code: 'PDF', message: 'Lecture du PDF impossible. Il est peut-être protégé par mot de passe ou endommagé.' }] };
  } finally { await task.destroy(); }
}
