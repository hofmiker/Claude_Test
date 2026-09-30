// Lädt alle CSV-Tabellen aus /data und baut daraus die Strukturen für die Diagramme.
// Die CSVs sind die einzige Datenquelle: Zahlen hier nie hart codieren.

const DATA_DIR = 'data/';

export function parseCSV(text, delimiter = ';') {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some(c => c !== '')) rows.push(row); }
  const [header, ...body] = rows;
  return body.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

async function load(name) {
  const res = await fetch(DATA_DIR + name, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${name} konnte nicht geladen werden (${res.status})`);
  return parseCSV(await res.text());
}

const num = v => Number(String(v).replace(',', '.'));
const byOrder = (a, b) => num(a.reihenfolge) - num(b.reihenfolge);

export async function loadAll() {
  const names = ['meta', 'quellen', 'kernhaushalt_kategorien', 'kernhaushalt_einnahmen', 'kernhaushalt_ausgaben',
    'sondervermoegen_toepfe', 'sondervermoegen_herkunft', 'sondervermoegen_zufluesse', 'sondervermoegen_verwendung'];
  const raw = Object.fromEntries(await Promise.all(names.map(async n => [n, await load(n + '.csv')])));

  const meta = Object.fromEntries(raw.meta.map(r => [r.schluessel, r.wert]));
  const quellen = Object.fromEntries(raw.quellen.map(r => [r.quelle_id, r]));

  // Kernhaushalt: Kategorien (Ebene 1) mit ihren Posten (Ebene 2), Werte in Mrd. Euro
  const side = (seite, rows) => raw.kernhaushalt_kategorien
    .filter(k => k.seite === seite).sort(byOrder)
    .map(k => {
      const kids = rows.filter(r => r.kategorie === k.kategorie)
        .map(r => ({ n: r.posten, v: num(r.wert_mio_eur) / 1000, d: r.beschreibung, q: r.quelle_id }));
      return { n: k.kategorie, c: k.farbe, d: k.beschreibung, k: kids, v: kids.reduce((s, a) => s + a.v, 0) };
    })
    .filter(g => g.k.length);
  const kern = { L: side('einnahmen', raw.kernhaushalt_einnahmen), R: side('ausgaben', raw.kernhaushalt_ausgaben) };
  kern.totL = kern.L.reduce((s, g) => s + g.v, 0);
  kern.totR = kern.R.reduce((s, g) => s + g.v, 0);
  kern.spend = kern.R.filter(g => g.c !== 'tr').reduce((s, g) => s + g.v, 0);

  // Sondervermögen: Herkunft (Ebene 1) → Töpfe (Ebene 2) → Verwendung (Ebene 3)
  const toepfe = raw.sondervermoegen_toepfe.sort(byOrder);
  const herkunft = raw.sondervermoegen_herkunft.sort(byOrder);
  const S = herkunft.map(h => ({
    n: h.gruppe, c: h.farbe, d: h.beschreibung,
    v: raw.sondervermoegen_zufluesse.filter(z => z.herkunft_gruppe === h.gruppe).reduce((s, z) => s + num(z.wert_mio_eur) / 1000, 0),
  }));
  const P = toepfe.map(t => ({
    id: t.topf_id, n: t.name, s: t.langname, c: t.farbe, d: t.beschreibung,
    v: raw.sondervermoegen_zufluesse.filter(z => z.ziel_topf === t.topf_id).reduce((s, z) => s + num(z.wert_mio_eur) / 1000, 0),
  }));
  // Flüsse gleicher Herkunftsgruppe, gleichem Ziel und gleichem Typ werden zu einem Band zusammengefasst
  const F = [];
  raw.sondervermoegen_zufluesse.forEach(z => {
    const a = S.findIndex(s => s.n === z.herkunft_gruppe), b = P.findIndex(p => p.id === z.ziel_topf);
    const typ = z.typ === 'kredit' ? 'debt' : z.typ === 'transfer' ? 'tr' : 'oth';
    const ex = F.find(f => f[0] === a && f[1] === b && f[4] === typ);
    if (ex) { ex[2] += num(z.wert_mio_eur) / 1000; ex[3] += ' · ' + z.herkunft; }
    else F.push([a, b, num(z.wert_mio_eur) / 1000, z.beschreibung, typ]);
  });
  const U = raw.sondervermoegen_verwendung.map(u => [P.findIndex(p => p.id === u.topf_id), u.posten, num(u.wert_mio_eur) / 1000, u.beschreibung]);
  const sv = { S, P, F, U, TOT: S.reduce((s, a) => s + a.v, 0) };

  return { meta, quellen, kern, sv, raw, warnings: validate(kern, sv) };
}

// Prüft, ob Ein- und Ausgänge je Topf zusammenpassen (Toleranz 0,1 Mrd. für Rundung)
function validate(kern, sv) {
  const w = [];
  if (Math.abs(kern.totL - kern.totR) > 0.1)
    w.push(`Kernhaushalt: Einnahmen ${kern.totL.toFixed(1)} ≠ Ausgaben ${kern.totR.toFixed(1)} Mrd.`);
  sv.P.forEach((p, i) => {
    const out = sv.U.filter(u => u[0] === i).reduce((s, u) => s + u[2], 0);
    if (Math.abs(p.v - out) > 0.1) w.push(`${p.s}: Zuflüsse ${p.v.toFixed(1)} ≠ Verwendung ${out.toFixed(1)} Mrd.`);
  });
  return w;
}
