import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { ParseResult } from '../domain/schedule';
import { parsePdfItems, type PdfPage } from './parse-items';
GlobalWorkerOptions.workerSrc = workerUrl;
export async function parseSchedulePdf(file: File): Promise<ParseResult> {
  if (file.size > 25 * 1024 * 1024) return { issues: [{ severity: 'error', code: 'SIZE', message: 'Le PDF dépasse la limite de 25 Mo.' }] };
  let task: ReturnType<typeof getDocument> | undefined;
  let stage = 'FILE';
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    stage = 'PDF';
    task = getDocument({ data, verbosity: 0 });
    const pdf = await task.promise;
    if (pdf.numPages > 100) return { issues: [{ severity: 'error', code: 'PAGES', message: 'Le PDF dépasse la limite de 100 pages.' }] };
    const pages: PdfPage[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number), content = await page.getTextContent();
      pages.push({ number, items: content.items.flatMap(item => 'str' in item ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }] : []) });
      page.cleanup();
    }
    stage = 'PARSER';
    return parsePdfItems(pages, file.name);
  } catch (error) {
    // Never expose exception messages: they can contain source document data.
    const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
    const code = name === 'PasswordException' ? 'PASSWORD' : name === 'InvalidPDFException' ? 'INVALID_PDF' : stage;
    const messages: Record<string, string> = {
      PASSWORD: 'Ce PDF est protégé par un mot de passe. Utilisez une copie non protégée.',
      INVALID_PDF: 'Le fichier ne contient pas un PDF valide. Téléchargez à nouveau le document.',
      FILE: 'Impossible de lire le fichier sur cet appareil. Téléchargez-le localement puis réessayez.',
      PARSER: 'Le planning n’a pas pu être analysé. Réessayez après avoir rechargé l’application. Code : PARSER.',
      PDF: 'Le moteur PDF n’a pas pu lire le document. Fermez puis rouvrez LSD avec une connexion et réessayez. Code : PDF.',
    };
    return { issues: [{ severity: 'error', code, message: messages[code] }] };
  } finally { await task?.destroy().catch(() => { /* Cleanup must not hide the import result. */ }); }
}
