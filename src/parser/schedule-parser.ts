import type { ParseResult } from '../domain/schedule';

/**
 * Browser-side parsing boundary. The implementation will use PDF.js text items
 * and their coordinates, then validate the resulting schedule before storage.
 */
export async function parseSchedulePdf(_file: File): Promise<ParseResult> {
  return {
    issues: [
      {
        severity: 'error',
        code: 'PARSER_NOT_IMPLEMENTED',
        message: 'Il parser PDF non è ancora implementato.',
      },
    ],
  };
}
