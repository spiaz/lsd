import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleSchedule } from './test/fixtures';
import { App } from './App';
import { listSchedules, saveSchedule } from './storage/database';
import { parseSchedulePdf } from './parser/schedule-parser';
vi.mock('./storage/database', () => ({ listSchedules: vi.fn(), saveSchedule: vi.fn() }));
vi.mock('./parser/schedule-parser', () => ({ parseSchedulePdf: vi.fn() }));
let root: Root, container: HTMLDivElement;
beforeEach(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), clear: vi.fn() }); container = document.createElement('div'); document.body.append(container); root = createRoot(container); vi.mocked(listSchedules).mockResolvedValue([]); vi.mocked(saveSchedule).mockResolvedValue(undefined); vi.mocked(parseSchedulePdf).mockResolvedValue({ schedule: sampleSchedule(), issues: [] }); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.clearAllMocks(); });
async function render() { await act(async () => root.render(<App />)); }
async function click(text: string) { const button = [...container.querySelectorAll('button')].find(b => b.textContent?.includes(text) || b.getAttribute('aria-label') === text); expect(button, text).toBeTruthy(); await act(async () => button!.click()); }
async function upload() { const input = container.querySelector('input[type=file]')!; Object.defineProperty(input, 'files', { configurable: true, value: [new File(['synthetic'], 'synthetic.pdf', { type: 'application/pdf' })] }); await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); }
describe('planning user flow', () => {
  it('previews an import, saves only on confirmation, and reopens on the calendar', async () => { await render(); expect(container.textContent).toContain('Importer le PDF de votre planning'); await upload(); expect(container.textContent).toContain('Vérifiez le planning'); expect(saveSchedule).not.toHaveBeenCalled(); await click('Enregistrer le planning'); expect(saveSchedule).toHaveBeenCalledOnce(); expect(container.textContent).toContain('Touchez une date'); });
  it('cancels an import without changing storage', async () => { await render(); await upload(); await click('Annuler'); expect(saveSchedule).not.toHaveBeenCalled(); expect(container.textContent).toContain('Importer le PDF de votre planning'); });
  it('restores saved data and navigates from the month to overnight details and back', async () => { vi.mocked(listSchedules).mockResolvedValue([sampleSchedule()]); await render(); if (container.textContent?.includes('Voir le planning importé')) await click('Voir le planning importé'); const button = container.querySelector<HTMLButtonElement>('[aria-label="1 octobre 2026, service simple"]')!; expect(button).toBeTruthy(); await act(async () => button.click()); expect(container.textContent).toContain('01:31 (+1)'); await click('Jour suivant'); expect(container.textContent).toContain('SERVICE COUPÉ'); expect(container.textContent).toContain('Pause entre les blocs: 4h 00'); await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); expect(container.textContent).toContain('Touchez une date'); });
  it('keeps the preview and current planning when saving fails', async () => { vi.mocked(saveSchedule).mockRejectedValue(new Error()); await render(); await upload(); await click('Enregistrer le planning'); expect(container.textContent).toContain('Échec de l’enregistrement'); expect(container.textContent).toContain('Vérifiez le planning'); });
  it('blocks saving an unresolved parser warning until explicitly reviewed', async () => { vi.mocked(parseSchedulePdf).mockResolvedValue({ schedule: sampleSchedule(), issues: [{ severity: 'warning', code: 'STATUS', date: '2026-10-03', message: 'Vérifiez le code' }] }); await render(); await upload(); const save = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('Enregistrer le planning'))!; expect(save.disabled).toBe(true); await act(async () => container.querySelector<HTMLInputElement>('input[type=checkbox]')!.click()); expect(save.disabled).toBe(false); });
  it('blocks overwriting a saved overlap with add mode', async () => { vi.mocked(listSchedules).mockResolvedValue([sampleSchedule()]); await render(); await upload(); await click('Enregistrer le planning'); expect(container.textContent).toContain('chevauche'); expect(saveSchedule).not.toHaveBeenCalled(); });
  it('uses French by default and switches the full interface to Italian', async () => {
    await render();
    const language = container.querySelector<HTMLSelectElement>('select[aria-label="Langue"]')!;
    expect(language.value).toBe('fr'); expect(document.documentElement.lang).toBe('fr');
    await act(async () => { language.value = 'it'; language.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(container.textContent).toContain('Importa il PDF dei tuoi turni'); expect(document.documentElement.lang).toBe('it'); expect(localStorage.setItem).toHaveBeenCalledWith('lsd-locale', 'it');
  });
});
