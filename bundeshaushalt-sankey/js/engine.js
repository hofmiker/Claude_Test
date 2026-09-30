// Kleine Animations-Engine für Sankey-Diagramme in SVG.
// Jedes Element hat eine feste id und numerische Eigenschaften (p), die zwischen zwei Zuständen interpoliert werden.
// Neue Elemente starten bei ihrer "en"-Geometrie (eingeklappt), entfernte Elemente fahren dorthin zurück und blenden aus.

const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

function toSVG(e) {
  const p = e.p, d = e.cid ? ` class="hit" data-id="${e.cid}"` : '';
  if (e.k === 'b') {
    const m = (p.x0 + p.x1) / 2;
    return `<path${d} d="M${p.x0} ${p.a0} C${m} ${p.a0} ${m} ${p.a1} ${p.x1} ${p.a1} L${p.x1} ${p.b1} C${m} ${p.b1} ${m} ${p.b0} ${p.x0} ${p.b0} Z" fill="${e.fill}" fill-opacity="${p.op}"/>`;
  }
  if (e.k === 'r')
    return `<rect${d} x="${p.x}" y="${p.y}" width="${Math.max(p.w, 0)}" height="${Math.max(p.h, 0.5)}" fill="${e.fill}" opacity="${p.op}"/>`;
  return `<text${d} x="${p.x}" y="${p.y}" text-anchor="${e.anchor || 'start'}" dominant-baseline="central" style="font-size:${e.size || 12}px;font-weight:${e.weight || 400};${e.cid ? '' : 'pointer-events:none'}" fill="${e.fill}" opacity="${p.op}">${e.txt}</text>`;
}

export function createEngine(svg, onTap) {
  const st = { live: new Map(), H: 100, W: 380, raf: 0 };
  svg.addEventListener('click', ev => {
    const t = ev.target.closest('[data-id]');
    if (t) onTap(t.getAttribute('data-id'));
  });
  st.go = (targets, H, W, dur) => {
    cancelAnimationFrame(st.raf);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) dur = 0;
    const to = new Map(), from = new Map();
    targets.forEach(t => to.set(t.id, t));
    targets.forEach(t => {
      const c = st.live.get(t.id);
      from.set(t.id, c ? { ...c.p } : { ...t.p, ...(t.en || {}), op: 0 });
    });
    st.live.forEach((c, id) => {
      if (!to.has(id)) { from.set(id, { ...c.p }); to.set(id, { ...c, p: { ...c.p, ...(c.en || {}), op: 0 }, dead: 1 }); }
    });
    const H0 = st.H, t0 = performance.now();
    const step = now => {
      const u = dur ? Math.min(1, (now - t0) / dur) : 1, e = ease(u);
      const live = new Map(), layers = ['', '', ''];
      to.forEach((t, id) => {
        const a = from.get(id), p = {};
        for (const q in t.p) p[q] = a[q] + (t.p[q] - a[q]) * e;
        const n = { ...t, p };
        if (!(t.dead && u >= 1)) live.set(id, n);
        layers[t.z] += toSVG(n);
      });
      st.H = H0 + (H - H0) * e;
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
