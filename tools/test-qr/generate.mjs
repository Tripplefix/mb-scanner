// Generates test MB2 QR codes as PNG images + an HTML contact sheet.
// Usage: node generate.mjs
import QRCode from 'qrcode';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(outDir, { recursive: true });

// A fake signature — the app retains but does not verify it (no public key yet),
// so any placeholder works for testing the scan + validation flow.
const SIG = 'TESTSIGNATURExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==';

// Build an MB2 payload from field values.
const mb2 = (f) => [
  'MB2', f.id, f.last, f.first, f.dob, f.rank, f.unit,
  f.start, f.time, f.location, f.venue, f.end, f.endLoc,
  f.status ?? 'U', f.flag ?? '1', f.issue,
].join(';') + '|' + SIG;

// Test cases. Dates chosen around "today" = 2026-06-07 so you can exercise
// granted / denied outcomes against an event configured for Bonaduz / Hotel Post
// with a valid range of 2026-06-05 .. 2026-06-09.
const cases = [
  {
    file: '01-valid-bonaduz',
    note: 'VALID for "Bonaduz / Hotel Post" event active 2026-06-05..09. Should GRANT.',
    f: { id: '9256161413', last: 'Isler', first: 'Rolf', dob: '19950307', rank: 'Hptm',
         unit: 'Ter Div Stabskp 3', start: '20260605', time: '1730', location: 'Bonaduz',
         venue: 'Hotel Post', end: '20260609', endLoc: 'Bonaduz', issue: '20260513' },
  },
  {
    file: '02-wrong-location',
    note: 'Wrong location (Andermatt). Should DENY on Location check.',
    f: { id: '9256161413', last: 'Isler', first: 'Rolf', dob: '19950307', rank: 'Hptm',
         unit: 'Ter Div Stabskp 3', start: '20260605', time: '0915', location: 'Andermatt',
         venue: 'Kaserne Altkirch', end: '20260605', endLoc: 'Andermatt', issue: '20260513' },
  },
  {
    file: '03-expired-dates',
    note: 'Event dates in the past (2026-05). Should DENY on date check.',
    f: { id: '7781002211', last: 'Muster', first: 'Anna', dob: '19880101', rank: 'Lt',
         unit: 'Ter Div Stabskp 3', start: '20260501', time: '0800', location: 'Bonaduz',
         venue: 'Hotel Post', end: '20260503', endLoc: 'Bonaduz', issue: '20260401' },
  },
  {
    file: '04-future-dates',
    note: 'Event dates in the future (2026-07). DENY if "active today" is required.',
    f: { id: '5544889900', last: 'Beispiel', first: 'Hans', dob: '19900615', rank: 'Wm',
         unit: 'Ter Div Stabskp 3', start: '20260701', time: '0800', location: 'Bonaduz',
         venue: 'Hotel Post', end: '20260703', endLoc: 'Bonaduz', issue: '20260601' },
  },
  {
    file: '05-different-unit',
    note: 'Different unit (SK 2 Ter Div 3). DENY only if "Unit must match" is enabled.',
    f: { id: '1122334455', last: 'Keller', first: 'Lea', dob: '19920920', rank: 'Hptm',
         unit: 'SK 2 Ter Div 3', start: '20260605', time: '0915', location: 'Bonaduz',
         venue: 'Hotel Post', end: '20260609', endLoc: 'Bonaduz', issue: '20260513' },
  },
];

const rows = [];
for (const c of cases) {
  const payload = mb2(c.f);
  const png = join(outDir, `${c.file}.png`);
  await QRCode.toFile(png, payload, { width: 420, margin: 2 });
  rows.push({ ...c, payload });
  console.log(`✓ ${c.file}.png — ${c.note}`);
}

// Contact sheet so you can scan everything from one screen / printout.
const html = `<!doctype html><meta charset="utf-8">
<title>MB Scanner — test QR codes</title>
<style>
  body{font-family:system-ui;background:#0f172a;color:#f1f5f9;margin:0;padding:24px}
  h1{font-size:1.3rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
  .card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;text-align:center}
  .card img{width:100%;max-width:260px;background:#fff;border-radius:8px}
  .note{font-size:.85rem;color:#94a3b8;margin-top:10px}
  code{font-size:.7rem;color:#64748b;word-break:break-all;display:block;margin-top:8px}
</style>
<h1>MB Scanner — test QR codes</h1>
<p style="color:#94a3b8">Suggested event: name <b>Test</b>, location <b>Bonaduz</b>, venue <b>Hotel Post</b>, valid <b>2026-06-05 → 2026-06-09</b>.</p>
<div class="grid">
${rows.map((r) => `<div class="card">
  <img src="${r.file}.png" alt="${r.file}">
  <div class="note"><b>${r.file}</b><br>${r.note}</div>
  <code>${r.payload.split('|')[0]}</code>
</div>`).join('\n')}
</div>`;
writeFileSync(join(outDir, 'index.html'), html);
console.log(`\nContact sheet: ${join(outDir, 'index.html')}`);
