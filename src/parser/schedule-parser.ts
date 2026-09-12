import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import type { ParseResult } from '../domain/schedule';
import { parsePdfItems, type PdfPage } from './parse-items';
import { translator, type Locale } from '../i18n';
GlobalWorkerOptions.workerSrc = workerUrl;
export async function parseSchedulePdf(file: File, locale: Locale = 'fr'): Promise<ParseResult> {
  const t = translator(locale);
  if (file.size > 25 * 1024 * 1024) return { issues: [{ severity: 'error', code: 'SIZE', message: t('parser.size') }] };
  let task: ReturnType<typeof getDocument> | undefined;
  let stage = 'FILE';
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    stage = 'PDF';
    task = getDocument({ data, verbosity: 0 });
    const pdf = await task.promise;
    if (pdf.numPages > 100) return { issues: [{ severity: 'error', code: 'PAGES', message: t('parser.pages') }] };
    const pages: PdfPage[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const reader = page.streamTextContent().getReader();
      const items: PdfPage['items'] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          items.push(...value.items.flatMap((item: TextItem | TextMarkedContent) => 'str' in item ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }] : []));
        }
      } finally { reader.releaseLock(); }
      pages.push({ number, items });
      page.cleanup();
    }
    stage = 'PARSER';
    return parsePdfItems(pages, file.name, locale);
  } catch (error) {
    // Never expose exception messages: they can contain source document data.
    const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
    const code = name === 'PasswordException' ? 'PASSWORD' : name === 'InvalidPDFException' ? 'INVALID_PDF' : stage;
    const messages: Record<string, string> = {
      PASSWORD: t('parser.password'),
      INVALID_PDF: t('parser.invalidPdf'),
      FILE: t('parser.file'),
      PARSER: t('parser.parser'),
      PDF: t('parser.pdf'),
    };
    return { issues: [{ severity: 'error', code, message: messages[code] }] };
  } finally { await task?.destroy().catch(() => { /* Cleanup must not hide the import result. */ }); }
}
