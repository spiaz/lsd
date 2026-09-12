# Synthetic planning fixture

`planning-synthetic.pdf` is a fully synthetic three-page planning used to develop and test the local PDF parser.

- It follows the density and row/sub-row structure of the supported planning format.
- The synthetic `Bloc` column gives explicit split boundaries; operational PDFs use repeated presence rows.
- Names, identifiers, dates, shifts, routes, lines and vehicles are invented.
- It deliberately includes single shifts, split shifts, rest days, RR, leave and the operational time `25:31`.
- Regenerate it with `scripts/generate-synthetic-planning.py` using Python and ReportLab.

Never replace it with a real or derived employee planning.
