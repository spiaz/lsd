import { useRef, useState } from 'react';
import { CalendarDays, FileUp, ShieldCheck } from 'lucide-react';

const PDF_MIME_TYPE = 'application/pdf';

export function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFile(file?: File) {
    if (!file) return;
    if (file.type !== PDF_MIME_TYPE && !file.name.toLowerCase().endsWith('.pdf')) return;
    setSelectedFile(file);
  }

  return (
    <main className="app-shell">
      <header className="brand" aria-label="LSD — Lausanne Shift Driver">
        <div className="brand-mark" aria-hidden="true">LSD</div>
        <div>
          <p className="eyebrow">Lausanne Shift Driver</p>
          <h1>A smoother trip through every shift.</h1>
        </div>
      </header>

      <section className="import-card" aria-labelledby="import-title">
        <div className="icon-tile"><CalendarDays aria-hidden="true" /></div>
        <p className="eyebrow">Il tuo planning</p>
        <h2 id="import-title">Importa il PDF dei turni</h2>
        <p className="intro">
          Il file viene letto sul dispositivo. Prima di salvare il planning potrai controllare date,
          turni singoli, turni spezzati e anomalie.
        </p>

        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <button className="primary-action" type="button" onClick={() => inputRef.current?.click()}>
          <FileUp aria-hidden="true" />
          {selectedFile ? 'Scegli un altro PDF' : 'Scegli il PDF'}
        </button>

        {selectedFile && (
          <p className="file-selection" role="status">
            Selezionato: <strong>{selectedFile.name}</strong>
          </p>
        )}

        <div className="privacy-note">
          <ShieldCheck aria-hidden="true" />
          <span>Nessun PDF viene caricato su un server.</span>
        </div>
      </section>
    </main>
  );
}
