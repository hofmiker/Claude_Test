// Kleine Animations-Engine für Sankey-Diagramme in SVG.
// Jedes Element hat eine feste id und numerische Eigenschaften (p), die zwischen zwei Zuständen interpoliert werden.
// Neue Elemente starten bei ihrer "en"-Geometrie (eingeklappt). Haben sie eine "mid"-Geometrie, laufen sie in zwei
// Phasen: erst en → mid (ausfahren), dann mid → p (auffächern). Entfernte Elemente laufen denselben Weg rückwärts.
// Alle übrigen Elemente (Hervorheben, Verschieben) sind nach FAST der Gesamtdauer fertig.

const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const FAST = 0.6;

function toSVG(e) {
  const p = e.p, d = e.cid ? ` class="hit" data-id="${e.cid}"` : '';
  if (e.k === 'b') {
    const m = (p.x0 + p.x1) / 2;
    return `<path${d} d="M${p.x0} ${p.a0} C${m} ${p.a0} ${m} ${p.a1} ${p.x1} ${p.a1} L${p.x1} ${p.b1} C${m} ${p.b1} ${m} ${p.b0} ${p.x0} ${p.b0} Z" fill="${e.fill}" fill-opacity="${p.op}"/>`;
  }
  if (e.k === 'r')
    return `<rect${d} x="${p.x}" y="${p.y}" width="${Math.max(p.w, 0)}" height="${Math.max(p.h, 0.5)}" fill="${e.fill}" opacity="${p.op}"/>`;
  return `<text${d} x="${p.x}" y="${p.y}" text-anchor="${e.anchor || 'start'}" dominant-baseline="central" class="${e.num ? 'num' : ''}" style="font-size:${e.size || 12}px;font-weight:${e.weight || 400};${e.cid ? '' : 'pointer-events:none'}" fill="${e.fill}" opacity="${Math.max(p.op, 0)}">${e.txt}</text>`;
}

const lerp = (a, b, e) => { const o = {}; for (const q in b) o[q] = a[q] + (b[q] - a[q]) * e; return o; };

export function createEngine(svg, onTap) {
  const st = { live: new Map(), H: 100, W: 380, raf: 0 };
  svg.addEventListener('click', ev => {
    const t = ev.target.closest('[data-id]');
    if (t) onTap(t.getAttribute('data-id'));
  });
  st.go = (targets, H, W, dur) => {
    cancelAnimationFrame(st.raf);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) dur = 0;
    // Je Element eine Folge von Stützpunkten (2 oder 3)
    const tracks = new Map();
    targets.forEach(t => {
      const c = st.live.get(t.id);
      if (c) tracks.set(t.id, { el: t, keys: [{ ...c.p }, t.p] });
      else {
        const from = { ...t.p, ...(t.en || {}), op: 0 };
        tracks.set(t.id, { el: t, keys: t.mid ? [from, { ...t.p, ...t.mid }, t.p] : [from, t.p] });
      }
    });
    st.live.forEach((c, id) => {
      if (tracks.has(id)) return;
      const gone = { ...c.p, ...(c.en || {}), op: 0 };
      tracks.set(id, { el: c, dead: 1, keys: c.mid ? [{ ...c.p }, { ...c.p, ...c.mid }, gone] : [{ ...c.p }, gone] });
    });
    // Höhe wächst beim Auffächern früh mit und schrumpft beim Zuklappen erst in der zweiten Phase
    const H0 = st.H, grow = H >= H0, t0 = performance.now();
    const step = now => {
      const u = dur ? Math.min(1, (now - t0) / dur) : 1;
      const live = new Map(), layers = ['', '', ''];
      tracks.forEach((tr, id) => {
        const k = tr.keys;
        const p = k.length === 3
          ? (u < 0.5 ? lerp(k[0], k[1], ease(u * 2)) : lerp(k[1], k[2], ease(u * 2 - 1)))
          : lerp(k[0], k[1], ease(tr.dead ? u : Math.min(1, u / FAST)));
        if (tr.dead && u >= 1) return;
        const n = { ...tr.el, p };
        live.set(id, n);
        layers[tr.el.z] += toSVG(n);
      });
      const hu = grow ? Math.min(1, u / 0.5) : Math.max(0, u * 2 - 1);
      st.H = H0 + (H - H0) * ease(hu);
      st.W = W;
      svg.setAttribute('viewBox', `0 0 ${W} ${st.H}`);
      svg.innerHTML = layers.join('');
      st.live = live;
      if (u < 1) st.raf = requestAnimationFrame(step);
    };
    st.raf = requestAnimationFrame(step);
  };
  return st;
}
