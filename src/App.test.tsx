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
  it('imports and saves immediately, then opens the calendar', async () => { await render(); expect(container.textContent).toContain('Importer le PDF de votre planning'); await upload(); expect(saveSchedule).toHaveBeenCalledOnce(); expect(container.textContent).not.toContain('Vérifiez le planning'); expect(container.textContent).toContain('Touchez une date'); });
  it('restores saved data and opens a scrollable multi-day detail stream', async () => { vi.mocked(listSchedules).mockResolvedValue([sampleSchedule()]); await render(); if (container.textContent?.includes('Voir le planning importé')) await click('Voir le planning importé'); const button = container.querySelector<HTMLButtonElement>('[aria-label="1 octobre 2026, service simple"]')!; expect(button).toBeTruthy(); await act(async () => button.click()); expect(container.querySelector('.day-stream')).toBeTruthy(); expect(container.querySelectorAll('.day-card').length).toBeGreaterThan(1); expect(container.textContent).toContain('01:31 (+1)'); expect(container.textContent).toContain('SERVICE COUPÉ'); expect(container.textContent).toContain('Pause entre les blocs4h 00'); const metrics = container.querySelector('.day-card .day-metrics'); expect(metrics?.textContent).toContain('IDSYN-01'); expect(metrics?.textContent).toContain('Travail4h 00'); expect(metrics?.textContent).toContain('Pay12.34'); expect(metrics?.textContent).toContain('Total journée4h 31'); expect(container.querySelectorAll('.split-block')).toHaveLength(2); await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); expect(container.textContent).toContain('Touchez une date'); });
  it('keeps the onboarding and shows an error when saving fails', async () => { vi.mocked(saveSchedule).mockRejectedValue(new Error()); await render(); await upload(); expect(container.textContent).toContain('Importer le PDF de votre planning'); expect(container.querySelector('[role="alert"]')).toBeTruthy(); });
  it('requires confirmation of parser warnings before saving', async () => { vi.mocked(parseSchedulePdf).mockResolvedValue({ schedule: sampleSchedule(), issues: [{ severity: 'warning', code: 'STATUS', date: '2026-10-03', message: 'Vérifiez le code' }] }); await render(); await upload(); expect(saveSchedule).not.toHaveBeenCalled(); const checkbox = container.querySelector<HTMLInputElement>('input[type=checkbox]')!; await act(async () => checkbox.click()); await click('Enregistrer le planning'); expect(saveSchedule).toHaveBeenCalledOnce(); });
  it('blocks parser errors and does not save', async () => { vi.mocked(parseSchedulePdf).mockResolvedValue({ schedule: sampleSchedule(), issues: [{ severity: 'error', code: 'STATUS', date: '2026-10-03', message: 'Code invalide' }] }); await render(); await upload(); expect(saveSchedule).not.toHaveBeenCalled(); expect(container.querySelector('[role="alert"]')).toBeTruthy(); });
  it('lets the user confirm a one-minute work discrepancy without changing PDF values', async () => {
    const incoming = sampleSchedule(); incoming.days[0].shift!.workedMinutes = 272;
    vi.mocked(parseSchedulePdf).mockResolvedValue({ schedule: incoming, issues: [] });
    await render(); await upload();
    expect(saveSchedule).not.toHaveBeenCalled();
    expect(container.textContent).toContain('dépasse la présence d’une minute');
    const save = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('Enregistrer le planning'))!;
    expect(save.disabled).toBe(true);
    await act(async () => container.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
    expect(save.disabled).toBe(false);
    await click('Enregistrer le planning');
    expect(saveSchedule).toHaveBeenCalledOnce();
    expect(vi.mocked(saveSchedule).mock.calls[0][0].days).toEqual(incoming.days);
    expect(container.querySelector('.calendar')).toBeTruthy();
  });
  it('shows the affected day for a blocking validation error and lets the user cancel', async () => {
    const incoming = sampleSchedule(); incoming.days[0].shift!.workedMinutes = 300;
    vi.mocked(parseSchedulePdf).mockResolvedValue({ schedule: incoming, issues: [] });
    await render(); await upload();
    expect(saveSchedule).not.toHaveBeenCalled();
    expect(container.textContent).toContain('1 octobre 2026');
    expect(container.textContent).toContain('Durée de travail ou de RR');
    await click('Annuler l’import');
    expect(container.textContent).toContain('Importer le PDF de votre planning');
  });
  it('automatically replaces an overlapping imported period', async () => { vi.mocked(listSchedules).mockResolvedValue([sampleSchedule()]); await render(); await upload(); expect(saveSchedule).toHaveBeenCalledOnce(); expect(container.textContent).not.toContain('chevauche'); });
  it('uses French by default and switches the full interface to Italian', async () => {
    await render();
    const language = container.querySelector<HTMLSelectElement>('select[aria-label="Langue"]')!;
    expect(language.value).toBe('fr'); expect(document.documentElement.lang).toBe('fr');
    await act(async () => { language.value = 'it'; language.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(container.textContent).toContain('Importa il PDF dei tuoi turni'); expect(document.documentElement.lang).toBe('it'); expect(localStorage.setItem).toHaveBeenCalledWith('lsd-locale', 'it');
  });
});
