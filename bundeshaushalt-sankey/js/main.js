import { loadAll } from './data.js';
import { createEngine } from './engine.js';
import { buildKern, buildSV, fmt } from './charts.js';

const $ = id => document.getElementById(id);
const DUR = 480;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function info(el, name, v, pct, d) {
  el.innerHTML = `<strong>${esc(name)}: ${fmt(v)} Mrd € · ${fmt(pct)} %</strong><br><span>${esc(d || '')}</span>`;
}

async function main() {
  let data;
  try { data = await loadAll(); }
  catch (err) {
    $('app').innerHTML = `<p class="error">Die Daten konnten nicht geladen werden: ${esc(err.message)}.<br>
      Die Seite muss über einen Webserver geöffnet werden, z. B. mit <code>python3 -m http.server</code> im Projektordner.</p>`;
    return;
  }
  const { meta, kern, sv } = data;

  // Zeitraum und Stand gut sichtbar
  document.title = meta.titel || document.title;
  $('title').textContent = meta.titel;
  $('period').innerHTML = `<span class="chip">Haushaltsjahr ${esc(meta.haushaltsjahr)}</span>
    <span class="chip">${esc(meta.zeitraum)}</span><span class="chip">${esc(meta.wertart)}</span>`;
  $('kStand').textContent = `Plan für ${meta.haushaltsjahr} · ${meta.stand_kernhaushalt}`;
  $('sStand').textContent = `Plan für ${meta.haushaltsjahr} · ${meta.stand_sondervermoegen}`;
  $('kNote').textContent = meta.hinweis_kernhaushalt || '';
  $('sNote').textContent = meta.hinweis_sondervermoegen || '';
  $('abruf').textContent = meta.datenabruf;
  if (data.warnings.length) $('warn').innerHTML = '<strong>Datenprüfung:</strong> ' + data.warnings.map(esc).join('<br>');

  const width = svg => Math.max(360, Math.min(960, Math.round(svg.clientWidth || 380)));

  // Kernhaushalt
  const K = { eL: new Set(), eR: new Set(), sel: null };
  const kInfo = $('kInfo'), kDefault = kInfo.innerHTML;
  const kShare = (S, g, v) => (S === 'L' || g.c === 'tr' ? (v / kern.totL) * 100 : (v / kern.spend) * 100);
  const eK = createEngine($('kSvg'), id => {
    const S = id[0], kind = id[1], rest = id.slice(2), gs = S === 'L' ? kern.L : kern.R;
    const wide = width($('kSvg')) >= 640;
    if (kind === 't' || kind === 'b') {
      const gi = +rest, g = gs[gi];
      if (kind === 't' && g.k.length > 1) {
        const ex = S === 'L' ? K.eL : K.eR, other = S === 'L' ? K.eR : K.eL;
        if (ex.has(gi)) { ex.delete(gi); K.sel = null; }
        else { ex.add(gi); if (!wide) other.clear(); K.sel = S + gi; }
      } else K.sel = K.sel === S + gi ? null : S + gi;
      K.sel ? info(kInfo, g.n, g.v, kShare(S, g, g.v), g.d) : (kInfo.innerHTML = kDefault);
    } else {
      const [gi, ci] = rest.split('_').map(Number), g = gs[gi], a = g.k[ci];
      K.sel = K.sel === id ? null : id;
      K.sel ? info(kInfo, a.n, a.v, kShare(S, g, a.v), a.d || g.d) : (kInfo.innerHTML = kDefault);
    }
    drawK(DUR);
  });
  const drawK = dur => { const W = width($('kSvg')), r = buildKern(kern, K, W); eK.go(r.els, r.H, W, dur); };

  // Sondervermögen
  const V = { exp: new Set(), sel: null };
  const sInfo = $('sInfo'), sDefault = sInfo.innerHTML, pct = v => (v / sv.TOT) * 100;
  const eV = createEngine($('sSvg'), id => {
    const t = id[0], i = +id.slice(1);
    if (t === 'P') {
      if (V.exp.has(i)) { V.exp.delete(i); V.sel = null; } else { V.exp.add(i); V.sel = id; }
      const a = sv.P[i];
      V.sel ? info(sInfo, a.s, a.v, pct(a.v), a.d) : (sInfo.innerHTML = sDefault);
    } else {
      V.sel = V.sel === id ? null : id;
      if (!V.sel) sInfo.innerHTML = sDefault;
      else if (t === 'S') { const a = sv.S[i]; info(sInfo, a.n, a.v, pct(a.v), a.d); }
      else if (t === 'F') { const f = sv.F[i]; info(sInfo, `${sv.S[f[0]].n} → ${sv.P[f[1]].n}`, f[2], pct(f[2]), f[3]); }
      else { const u = sv.U[i]; info(sInfo, u[1], u[2], pct(u[2]), u[3]); }
    }
    drawV(DUR);
  });
  const drawV = dur => { const W = width($('sSvg')), r = buildSV(sv, V, W); eV.go(r.els, r.H, W, dur); };

  drawK(0); drawV(0);
  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (width($('kSvg')) < 640 && K.eL.size && K.eR.size) K.eL.clear();
      drawK(0); drawV(0);
    }, 150);
  });

  renderTables(data);
}

// Datentabellen mit Quellenangaben unter den Diagrammen
function renderTables({ raw, quellen }) {
  const q = id => {
    const s = quellen[id];
    return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.titel)}">${esc(id)}</a>` : esc(id || '');
  };
  const mio = v => Number(v).toLocaleString('de-DE');
  const table = (title, file, rows, cols) => `
    <details class="tbl"><summary>${esc(title)} <span class="file">data/${file}</span></summary>
    <div class="scroll"><table><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.f ? c.f(r[c.k]) : esc(r[c.k] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div></details>`;
  const post = [
    { h: 'Kategorie', k: 'kategorie' }, { h: 'Posten', k: 'posten' }, { h: 'Mio. €', k: 'wert_mio_eur', num: 1, f: mio },
    { h: 'Beschreibung', k: 'beschreibung' }, { h: 'Quelle', k: 'quelle_id', f: q }, { h: 'Fundstelle', k: 'fundstelle' }, { h: 'Anmerkung', k: 'anmerkung' }];
  $('tables').innerHTML =
    table('Kernhaushalt: Einnahmen', 'kernhaushalt_einnahmen.csv', raw.kernhaushalt_einnahmen, post) +
    table('Kernhaushalt: Ausgaben', 'kernhaushalt_ausgaben.csv', raw.kernhaushalt_ausgaben, post) +
    table('Sondervermögen: Zuflüsse', 'sondervermoegen_zufluesse.csv', raw.sondervermoegen_zufluesse, [
      { h: 'Gruppe', k: 'herkunft_gruppe' }, { h: 'Herkunft', k: 'herkunft' }, { h: 'Ziel', k: 'ziel_topf' },
      { h: 'Mio. €', k: 'wert_mio_eur', num: 1, f: mio }, { h: 'Typ', k: 'typ' }, { h: 'Beschreibung', k: 'beschreibung' },
      { h: 'Quelle', k: 'quelle_id', f: q }, { h: 'Anmerkung', k: 'anmerkung' }]) +
    table('Sondervermögen: Verwendung', 'sondervermoegen_verwendung.csv', raw.sondervermoegen_verwendung, [
      { h: 'Topf', k: 'topf_id' }, { h: 'Posten', k: 'posten' }, { h: 'Mio. €', k: 'wert_mio_eur', num: 1, f: mio },
      { h: 'Beschreibung', k: 'beschreibung' }, { h: 'Quelle', k: 'quelle_id', f: q }, { h: 'Anmerkung', k: 'anmerkung' }]);
  $('sources').innerHTML = Object.values(quellen).map(s =>
    `<li><strong>${esc(s.quelle_id)}</strong> · ${esc(s.herausgeber)}: <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.titel)}</a> (Stand ${esc(s.stand)})</li>`).join('');
}

main();
