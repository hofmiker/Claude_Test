// Baut aus Daten + Zustand die Zielgeometrie beider Diagramme.
// Die Engine interpoliert dann zwischen dem alten und neuen Zustand.

export const COL = {
  tax: ['#534AB7', '#7F77DD'], oth: ['#5F5E5A', '#888780'], debt: ['#993C1D', '#D85A30'],
  soc: ['#0F6E56', '#1D9E75'], tr: ['#993556', '#D4537E'],
  bw: ['#534AB7', '#7F77DD'], sv: ['#0F6E56', '#1D9E75'], kt: ['#3B6D11', '#639922'],
};
const colOf = c => COL[c] || COL.oth;
export const fmt = v => v.toFixed(1).replace('.', ',');

function place(hs, gap, minC) {
  const o = []; let pc = -1e9, pb = -1e9;
  hs.forEach(h => { const y = Math.max(pb + gap, pc + minC - h / 2, 0); o.push({ y, h }); pc = y + h / 2; pb = y + h; });
  return o;
}
const spanOf = a => (a.length ? a[a.length - 1].y + a[a.length - 1].h : 0);
const DW = 8, WHITE = '#FFFFFF', TP = 'var(--text-primary)', TS = 'var(--text-secondary)';

// Detail-Knoten (dünner Balken + zweizeilige Beschriftung) inkl. Band vom Elternknoten.
// en = eingeklappt am Elternknoten, mid = ausgefahren, aber noch nicht aufgefächert (Engine animiert en → mid → p).
function detail(els, { id, side, edge, dx, ty, dy, dh, col, on, name, value }) {
  const lm = dy + dh / 2, tm = ty + dh / 2, R = side === 'R', tx = R ? dx + DW + 6 : dx - 6, anchor = R ? 'start' : 'end';
  const band = R
    ? { p: { x0: edge, a0: ty, b0: ty + dh, x1: dx, a1: dy, b1: dy + dh }, en: { x1: edge, a1: ty, b1: ty + dh }, mid: { a1: ty, b1: ty + dh } }
    : { p: { x0: dx + DW, a0: dy, b0: dy + dh, x1: edge, a1: ty, b1: ty + dh }, en: { x0: edge, a0: ty, b0: ty + dh }, mid: { a0: ty, b0: ty + dh } };
  const op = on ? 1 : 0.35;
  els.push({ id: id + 'b', cid: id, k: 'b', z: 0, fill: col[1], p: { ...band.p, op: on ? 0.42 : 0.08 }, en: band.en, mid: band.mid });
  els.push({ id: id + 'r', cid: id, k: 'r', z: 1, fill: col[0], p: { x: dx, y: dy, w: DW, h: dh, op: on ? 1 : 0.3 }, en: { x: edge, w: 0, y: ty }, mid: { y: ty } });
  els.push({ id: id + 'n', cid: id, k: 't', z: 2, fill: TP, anchor, size: 12.5, weight: 600, txt: name, p: { x: tx, y: lm - 7, op }, en: { x: edge, y: tm }, mid: { y: tm - 7, op: 0 } });
  els.push({ id: id + 'v', k: 't', z: 2, fill: TS, anchor, size: 11, num: 1, txt: value, p: { x: tx, y: lm + 8, op }, en: { x: edge, y: tm }, mid: { y: tm + 8, op: 0 } });
}

// Verteilt Spalten fester Breite mit gleich großen Abständen zwischen a und b (Abstand höchstens gMax, dann zentriert)
function columns(a, b, widths, gMax = Infinity) {
  const sum = widths.reduce((s, w) => s + w, 0), n = widths.length - 1;
  const g = Math.min(gMax, (b - a - sum) / n), off = (b - a - sum - g * n) / 2;
  let x = a + off;
  return widths.map(w => { const r = x; x += w + g; return r; });
}

// Kachel mit Beschriftung im Inneren
function tile(els, { id, x, y, w, h, col, on, name, value }) {
  els.push({ id, cid: id, k: 'r', z: 1, fill: col, p: { x, y, w, h, op: on ? 1 : 0.45 } });
  const cx = x + w / 2, m = y + h / 2, op = on ? 1 : 0.75;
  if (h >= 30) {
    els.push({ id: id + 'a', k: 't', z: 2, fill: WHITE, anchor: 'middle', size: 12.5, weight: 600, txt: name, p: { x: cx, y: m - 8, op } });
    els.push({ id: id + 'v', k: 't', z: 2, fill: WHITE, anchor: 'middle', size: 11, num: 1, txt: value, p: { x: cx, y: m + 8, op } });
  } else {
    els.push({ id: id + 'a', k: 't', z: 2, fill: WHITE, anchor: 'middle', size: 11, weight: 600, txt: `${name} ${value}`, p: { x: cx, y: m, op } });
  }
}

export function buildKern(kern, st, W) {
  const k = 0.8, TW = 96, CW = 12, T = 10, G = 12, wide = W >= 640;
  const showL = wide || st.eL.size > 0, showR = wide || st.eR.size > 0;
  // Ebenen: [Details links] Kacheln links | Summe | Kacheln rechts [Details rechts], alle mit gleichem Abstand
  const LL = 100, LR = 116, ws = [...(showL ? [DW] : []), TW, CW, TW, ...(showR ? [DW] : [])];
  const xs = columns(showL ? LL : 12, showR ? W - LR + DW : W - 12, ws);
  if (!showL) xs.unshift(LL);
  if (!showR) xs.push(W - LR);
  const [dL, tL, c, tR, dR] = xs;
  const stack = gs => { let y = 0; return gs.map(g => { const h = g.v * k, r = { y, h }; y += h + G; return r; }); };
  const sl = stack(kern.L), sr = stack(kern.R), Ch = Math.max(kern.totL, kern.totR) * k;
  const H0 = Math.max(spanOf(sl), spanOf(sr), Ch);
  const oL = T + (H0 - spanOf(sl)) / 2, oR = T + (H0 - spanOf(sr)) / 2, oC = T + (H0 - Ch) / 2;
  const lit = g => !st.sel || g.includes(st.sel);
  const els = [{ id: 'c', k: 'r', z: 1, fill: TS, p: { x: c, y: oC, w: CW, h: Ch, op: 1 } }];
  let maxB = H0 + 2 * T;

  [['L', kern.L, sl, oL, st.eL], ['R', kern.R, sr, oR, st.eR]].forEach(([S, gs, stk, off, ex]) => {
    let cy = oC, pb = -1e9;
    gs.forEach((g, gi) => {
      const y = stk[gi].y + off, h = stk[gi].h, col = colOf(g.c), multi = g.k.length > 1, open = multi && ex.has(gi);
      const gid = S + gi, gr = [gid, ...g.k.map((a, ci) => `${S}d${gi}_${ci}`)], on = lit(gr);
      const tx = S === 'L' ? tL : tR, bid = `${S}b${gi}`;
      const bp = S === 'L'
        ? { x0: tx + TW, a0: y, b0: y + h, x1: c, a1: cy, b1: cy + h }
        : { x0: c + CW, a0: cy, b0: cy + h, x1: tx, a1: y, b1: y + h };
      els.push({ id: bid, cid: bid, k: 'b', z: 0, fill: col[1], p: { ...bp, op: on ? 0.42 : 0.08 } });
      cy += h;
      const ar = !multi ? '' : S === 'L' ? (open ? ' ›' : ' ‹') : (open ? ' ‹' : ' ›');
      tile(els, { id: `${S}t${gi}`, x: tx, y, w: TW, h, col: col[0], on, name: g.n + ar, value: fmt(g.v) + (h >= 30 ? ' Mrd' : '') });
      if (!open) return;
      const ps = place(g.k.map(a => a.v * k), 6, 28), m = y + h / 2;
      const start = Math.max(pb + 24, m - spanOf(ps) / 2, T), edge = S === 'R' ? tx + TW : tx;
      let ty = y;
      g.k.forEach((a, ci) => {
        const id = `${S}d${gi}_${ci}`, dh = a.v * k, dy = start + ps[ci].y;
        detail(els, { id, side: S, edge, dx: S === 'R' ? dR : dL, ty, dy, dh, col, on: lit([gid, id]), name: a.n, value: fmt(a.v) + ' Mrd' });
        ty += dh; pb = dy + dh; maxB = Math.max(maxB, pb + T);
      });
    });
  });
  return { els, H: maxB };
}

export function buildSV(sv, st, W) {
  const k = 1.55, T = 10, WP = 92;
  // Ebenen: Herkunft | Töpfe | Verwendung, mit gleichem Abstand
  const [X1, XP, X3] = columns(86, W - 118 + DW, [DW, WP, DW], 160);
  const p1 = place(sv.S.map(a => a.v * k), 48, 30), p2 = place(sv.P.map(a => a.v * k), 32, 0);
  const H0 = Math.max(spanOf(p1), spanOf(p2));
  const o1 = T + (H0 - spanOf(p1)) / 2, o2 = T + (H0 - spanOf(p2)) / 2;
  const lit = g => !st.sel || g.includes(st.sel), els = [];
  let maxB = H0 + 2 * T;
  const out1 = sv.S.map((a, i) => p1[i].y + o1), in2 = sv.P.map((a, i) => p2[i].y + o2), out2 = [...in2];

  sv.F.forEach(([a, b, v, , c], j) => {
    const h = v * k, id = 'F' + j, on = lit(['S' + a, 'P' + b, id]);
    els.push({ id, cid: id, k: 'b', z: 0, fill: colOf(c)[1], p: { x0: X1 + DW, a0: out1[a], b0: out1[a] + h, x1: XP, a1: in2[b], b1: in2[b] + h, op: on ? 0.45 : 0.08 } });
    out1[a] += h; in2[b] += h;
  });
  sv.S.forEach((a, i) => {
    const y = p1[i].y + o1, h = a.v * k, id = 'S' + i, m = y + h / 2;
    const on = lit([id, ...sv.F.map((f, j) => (f[0] === i ? 'F' + j : ''))]);
    els.push({ id, cid: id, k: 'r', z: 1, fill: colOf(a.c)[0], p: { x: X1, y, w: DW, h, op: on ? 1 : 0.3 } });
    els.push({ id: id + 'n', cid: id, k: 't', z: 2, fill: TP, anchor: 'end', size: 12.5, weight: 600, txt: a.n, p: { x: X1 - 6, y: m - 7, op: on ? 1 : 0.35 } });
    els.push({ id: id + 'v', k: 't', z: 2, fill: TS, anchor: 'end', size: 11, num: 1, txt: fmt(a.v) + ' Mrd', p: { x: X1 - 6, y: m + 8, op: on ? 1 : 0.35 } });
  });
  let pb = -1e9;
  sv.P.forEach((a, i) => {
    const y = p2[i].y + o2, h = a.v * k, id = 'P' + i, open = st.exp.has(i), col = colOf(a.c);
    const kids = sv.U.map((u, ui) => ui).filter(ui => sv.U[ui][0] === i);
    const on = lit([id, ...kids.map(ui => 'U' + ui), ...sv.F.map((f, j) => (f[1] === i ? 'F' + j : ''))]);
    tile(els, { id, x: XP, y, w: WP, h, col: col[0], on, name: a.n + (kids.length ? (open ? ' ‹' : ' ›') : ''), value: fmt(a.v) + ' Mrd' });
    if (!open) return;
    const ps = place(kids.map(ui => sv.U[ui][2] * k), 8, 30), start = Math.max(pb + 24, y + h / 2 - spanOf(ps) / 2, T);
    kids.forEach((ui, j) => {
      const u = sv.U[ui], uid = 'U' + ui, dh = u[2] * k, dy = start + ps[j].y;
      detail(els, { id: uid, side: 'R', edge: XP + WP, dx: X3, ty: out2[i], dy, dh, col, on: lit([id, uid]), name: u[1], value: fmt(u[2]) + ' Mrd' });
      out2[i] += dh; pb = dy + dh; maxB = Math.max(maxB, pb + T);
    });
  });
  return { els, H: maxB };
}
