// Prozedural erzeugte Soundeffekte (Web Audio API, keine externen Assets/
// keine CDN-Abhängigkeit) für Schritte, Absprung und Landung.
let ctx = null;

function ensureCtx() {
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

// Browser-Autoplay-Policy: der AudioContext darf nur innerhalb eines echten
// User-Gesture-Handlers erzeugt/fortgesetzt werden — nicht erst später aus
// der rAF-Loop heraus, wenn der erste Schritt-/Sprung-Sound fällig wird.
export function unlockAudioOnFirstInput() {
    const unlock = () => {
        ensureCtx();
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('mousedown', unlock);
    };
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('mousedown', unlock, { once: true });
}

function noiseBuffer(c, duration) {
    const n = Math.max(1, Math.floor(c.sampleRate * duration));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    return buf;
}

export function playFootstep() {
    if (!ctx) return;
    const c = ctx, t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.05);
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 320 + Math.random() * 180;
    filter.Q.value = 0.9;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t);
}

export function playJump() {
    if (!ctx) return;
    const c = ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(560, t + 0.16);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.22);
}

export function playLand() {
    if (!ctx) return;
    const c = ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.15);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.26, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.2);

    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.08);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const ngain = c.createGain();
    ngain.gain.setValueAtTime(0.13, t);
    ngain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(filter).connect(ngain).connect(c.destination);
    src.start(t);
}
