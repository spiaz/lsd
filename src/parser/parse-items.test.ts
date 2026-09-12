import { describe, expect, it } from 'vitest';
import { parsePdfItems, type PdfItem, type PdfPage } from './parse-items';
import { validateSchedule } from '../domain/validation';
const headers = [['Jour',22],['Date',52],['Service',95],['Type',131],['Pres. debut',180],['Pres. fin',226],['Bloc',250],['Ligne',267],['Voiture',294],['De',332],['Début',401],['À',434],['Fin',504],['Travail',535],['RR',570]] as const;
const item = (text: string, x: number, y: number): PdfItem => ({ text, x, y, width: text.length * 2 });
function page(rows: Array<Array<readonly [string, number]>>): PdfPage { return { number: 1, items: [...headers.map(([text,x]) => item(text,x,800)), ...rows.flatMap((row,i) => row.map(([text,x]) => item(text,x,780-i*12)))] }; }
const unique = [['01/10/2026',52],['UNICO',131],['21:00',180],['25:31',226],['04:00',535],['00:31',570]] as const;
const trip = [['1',250],['D1',267],['V-001',294],['Alfa',332],['21:10',401],['Beta',434],['25:20',504]] as const;
describe('coordinate parser', () => {
  it('extracts presence, trip origin, destination, line, vehicle, worked and RR', () => {
    const r = parsePdfItems([page([[...unique],[...trip]])], 'synthetic.pdf'); const s = r.schedule!;
    expect(r.issues).toEqual([]); expect(validateSchedule(s)).toEqual([]);
    expect(s.days[0].shift).toMatchObject({ presenceEnd: '25:31', workedMinutes: 240, rrMinutes: 31, origin: 'Alfa', destination: 'Beta', blocks: [{ trips: [{ line: 'D1', vehicle: 'V-001', origin: 'Alfa', destination: 'Beta', start: '21:10', end: '25:20' }] }] });
  });
  it('parses explicit split block identifiers', () => {
    const p = page([[['02/10/2026',52],['SPEZZATO',131],['06:00',180],['18:00',226]], [['1',250],['Alfa',332],['06:00',401],['Beta',434],['10:00',504]], [['2',250],['Beta',332],['14:00',401],['Alfa',434],['18:00',504]]]);
    const r = parsePdfItems([p], 'synthetic.pdf'); expect(r.issues).toEqual([]); expect(r.schedule!.days[0].shift!.blocks).toHaveLength(2); expect(validateSchedule(r.schedule!)).toEqual([]);
  });
  it('requires review for a split without explicit block identifiers', () => { const p = page([[['02/10/2026',52],['SPEZZATO',131],['06:00',180],['18:00',226]]]); p.items = p.items.filter(i => i.text !== 'Bloc'); expect(parsePdfItems([p], 'synthetic.pdf').issues.some(i => i.code === 'SPLIT')).toBe(true); });
  it('distinguishes rest and compensatory rest', () => { const r = parsePdfItems([page([[['01/10/2026',52],['RIPOSO',131]], [['02/10/2026',52],['RR',131]]])], 'synthetic.pdf'); expect(r.schedule!.days.map(d => d.status)).toEqual(['rest','compensatory-rest']); });
  it('requires review of unknown statuses instead of silently accepting them', () => { const r = parsePdfItems([page([[['01/10/2026',52],['UNKNOWN',131]]])], 'synthetic.pdf'); expect(r.issues).toEqual([expect.objectContaining({ code: 'STATUS', date: '2026-10-01' })]); });
  it('rejects scans and unknown layouts visibly', () => { expect(parsePdfItems([{ number: 1, items: [] }], 'scan.pdf').schedule).toBeUndefined(); expect(parsePdfItems([{ number: 1, items: [item('Unrelated',10,10)] }], 'other.pdf').issues[0].code).toBe('NO_DAYS'); });
  it('keeps duplicate dates for validation rather than overwriting them', () => { const r = parsePdfItems([page([[['01/10/2026',52],['RR',131]], [['01/10/2026',52],['RR',131]]])], 'synthetic.pdf'); expect(validateSchedule(r.schedule!).some(i => i.code === 'DUPLICATE')).toBe(true); });
  it('attaches continuation trips on the next page to the same day', () => { const r = parsePdfItems([page([[...unique]]), { ...page([[...trip]]), number: 2 }], 'synthetic.pdf'); expect(r.schedule!.days).toHaveLength(1); expect(r.schedule!.days[0].shift!.blocks[0].trips).toHaveLength(1); });
});

// Public invented centred-column layout: presence stations differ from trip stations.
describe('operational column layout', () => {
  function operational(extra: Array<[string, number, number]> = []): PdfPage {
    const labels = ['Date', 'Service', 'De', 'Début', 'À', 'Fin', 'Ligne', 'Voiture', 'De', 'Début', 'À', 'Fin', 'Travail', 'RR'];
    const cell = (text: string, column: number, y: number) => ({ text, x: column * 60 + 20 - text.length, y, width: text.length * 2 });
    return { number: 1, items: [...labels.map((t, i) => cell(t, i, 800)), ...[
      ['01/10/2026', 0, 780], ['Depot A', 2, 780], ['06:00', 3, 780], ['Depot B', 4, 780], ['18:00', 5, 780],
      ['L1', 6, 780], ['V1', 7, 780], ['Stop A', 8, 780], ['06:10', 9, 780], ['Stop B', 10, 780], ['17:50', 11, 780], ...extra,
    ].map(([t, i, y]) => cell(String(t), Number(i), Number(y)))] };
  }
  it('preserves presence stations independently of the first and last trips', () => {
    const result = parsePdfItems([operational()], 'synthetic.pdf');
    expect(result.issues).toEqual([]);
    expect(result.schedule!.days[0].shift).toMatchObject({ origin: 'Depot A', destination: 'Depot B', blocks: [{ trips: [{ origin: 'Stop A', destination: 'Stop B' }] }] });
  });
  it('does not flag a service code as an unknown day code when shift details continue on the next row', () => {
    const p = operational();
    const cell = (text: string, column: number, y: number) => ({ text, x: column * 60 + 20 - text.length, y, width: text.length * 2 });
    p.items = p.items.filter(i => i.y === 800);
    p.items.push(
      cell('01/10/2026', 0, 780), cell('SERV-42', 1, 780),
      cell('Depot A', 2, 768), cell('06:00', 3, 768), cell('Depot B', 4, 768), cell('18:00', 5, 768),
      cell('L1', 6, 768), cell('V1', 7, 768), cell('Stop A', 8, 768), cell('06:10', 9, 768), cell('Stop B', 10, 768), cell('17:50', 11, 768),
    );
    const result = parsePdfItems([p], 'synthetic.pdf');
    expect(result.issues.some(i => i.code === 'STATUS')).toBe(false);
    expect(result.schedule!.days[0]).toMatchObject({ status: 'work', shift: { presenceStart: '06:00', presenceEnd: '18:00' } });
  });
  it('reports missing presence stations instead of substituting a trip station', () => {
    const p = operational(); p.items = p.items.filter(i => i.text !== 'Depot A');
    const result = parsePdfItems([p], 'synthetic.pdf');
    expect(result.issues.some(i => i.code === 'PRESENCE_ROUTE')).toBe(true);
    expect(result.schedule!.days[0].shift!.origin).toBeFalsy();
  });
  it('rejects an invalid date without attaching its trips to the preceding day', () => {
    const result = parsePdfItems([operational([['31/02/2026', 0, 760], ['19:00', 9, 760], ['20:00', 11, 760]])], 'synthetic.pdf');
    expect(result.issues.some(i => i.code === 'DATE' && i.severity === 'error')).toBe(true);
    expect(result.schedule!.days[0].shift!.blocks[0].trips).toHaveLength(1);
  });
});
