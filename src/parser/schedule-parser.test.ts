import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseSchedulePdf } from './schedule-parser';
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }));
const file = { name: 'synthetic.pdf', size: 1, arrayBuffer: async () => new ArrayBuffer(1) } as File;
beforeEach(() => vi.clearAllMocks());
describe('PDF import failures', () => {
  it('reads text streams without relying on async iteration support', async () => {
    const read = vi.fn()
      .mockResolvedValueOnce({ done: false, value: { items: [], styles: {}, lang: null } })
      .mockResolvedValueOnce({ done: true, value: undefined });
    const releaseLock = vi.fn();
    const page = {
      streamTextContent: vi.fn(() => ({ getReader: () => ({ read, releaseLock }) })),
      getTextContent: vi.fn(() => { throw new TypeError('async iterator unavailable'); }),
      cleanup: vi.fn(),
    };
    vi.mocked(getDocument).mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage: vi.fn().mockResolvedValue(page) }),
      destroy: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof getDocument>);

    const result = await parseSchedulePdf(file);

    expect(result.issues.some(issue => issue.code === 'PDF')).toBe(false);
    expect(page.getTextContent).not.toHaveBeenCalled();
    expect(read).toHaveBeenCalledTimes(2);
    expect(releaseLock).toHaveBeenCalledOnce();
  });
  it.each([['PasswordException', 'PASSWORD'], ['InvalidPDFException', 'INVALID_PDF'], ['UnknownErrorException', 'PDF']])('classifies %s without exposing raw document data', async (name, code) => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getDocument).mockReturnValue({ promise: Promise.reject({ name, message: 'PRIVATE-SENTINEL' }), destroy } as unknown as ReturnType<typeof getDocument>);
    const result = await parseSchedulePdf(file);
    expect(result.issues[0].code).toBe(code);
    expect(JSON.stringify(result)).not.toContain('PRIVATE-SENTINEL');
    expect(destroy).toHaveBeenCalledOnce();
  });
  it('does not let cleanup errors hide the useful result', async () => {
    vi.mocked(getDocument).mockReturnValue({ promise: Promise.reject({ name: 'PasswordException' }), destroy: vi.fn().mockRejectedValue(new Error('cleanup')) } as unknown as ReturnType<typeof getDocument>);
    expect((await parseSchedulePdf(file)).issues[0].code).toBe('PASSWORD');
  });
  it('handles file access errors before creating a PDF task', async () => {
    const inaccessible = { ...file, arrayBuffer: async () => { throw new Error('private file path'); } } as File;
    expect((await parseSchedulePdf(inaccessible)).issues[0].code).toBe('FILE');
    expect(getDocument).not.toHaveBeenCalled();
  });
});
