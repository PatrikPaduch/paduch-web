// Procedurális kerti hangkép WebAudio-val (nincs hangfájl): víz (közelség szerint), szél, madarak nappal,
// tücskök és bagoly éjjel, lépések kövön és füvön. A Dzsungel hangképének egyszerűsített rokona.
export class GardenAudio {
  constructor() { this.ctx = null; this.vol = .7; this.muted = localStorage.getItem('kert-hang') === '0'; this.nb = 0; this.nn = 0; }
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = C.createGain(); this.master.gain.value = this.muted ? 0 : this.vol; this.master.connect(C.destination);
    const len = C.sampleRate * 3, buf = C.createBuffer(1, len, C.sampleRate), d = buf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
    this.noise = buf;
    this.water = this.loop('bandpass', 900, .5); this.water2 = this.loop('lowpass', 2400, .4); this.fall = this.loop('lowpass', 1200, .6); this.wind = this.loop('lowpass', 380, .5);
    const o = C.createOscillator(); o.frequency.value = 4400; const am = C.createGain(); am.gain.value = 0;
    const lfo = C.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 21; const lg = C.createGain(); lg.gain.value = .5; lfo.connect(lg).connect(am.gain);
    this.cricket = C.createGain(); this.cricket.gain.value = 0; o.connect(am).connect(this.cricket).connect(this.master); o.start(); lfo.start();
  }
  loop(type, freq, q) {
    const C = this.ctx, src = C.createBufferSource(); src.buffer = this.noise; src.loop = true; src.playbackRate.value = .9 + Math.random() * .2;
    const f = C.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = C.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(this.master); src.start(0, Math.random() * 2); return g;
  }
  setMuted(m) { this.muted = m; localStorage.setItem('kert-hang', m ? '0' : '1'); if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.vol, this.ctx.currentTime, .1); }
  pause(on) { if (this.ctx) on ? this.ctx.suspend() : this.ctx.resume(); }
  // st: { water: 0..1 (szökőkút/csatorna közelsége), fall: 0..1 (vízesés), day: 0..1, height: a törpe magassága }
  update(st) {
    if (!this.ctx || this.muted) return;
    const C = this.ctx, now = C.currentTime, set = (g, v) => g.gain.setTargetAtTime(v, now, .4);
    set(this.water, st.water * .5); set(this.water2, st.water * .12); set(this.fall, st.fall * .55); set(this.wind, .05 + Math.min(.12, st.height * .006));
    set(this.cricket, (1 - st.day) * .018);
    if (st.day > .3 && now > this.nb) { this.nb = now + .7 + Math.random() * 3; this.bird(); }
    if (st.day < .25 && now > this.nn) { this.nn = now + 5 + Math.random() * 9; this.owl(); }
  }
  voice(type, pan, vol) { const C = this.ctx, o = C.createOscillator(); o.type = type; const g = C.createGain(); g.gain.value = 0; const p = C.createStereoPanner(); p.pan.value = pan; o.connect(g).connect(p).connect(this.master); return { o, g }; }
  env(g, s, a, v, d) { g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + a); g.gain.exponentialRampToValueAtTime(.0001, s + d); }
  bird() {
    const C = this.ctx, t = C.currentTime, pan = Math.random() * 1.6 - .8, vol = .025 + Math.random() * .04, kind = Math.floor(Math.random() * 3);
    if (kind === 0) { const n = 2 + Math.floor(Math.random() * 4), f0 = 2200 + Math.random() * 1400; for (let i = 0; i < n; i++) { const v = this.voice('sine', pan, vol), s = t + i * .16; v.o.frequency.setValueAtTime(f0, s); v.o.frequency.exponentialRampToValueAtTime(f0 * 1.5, s + .1); this.env(v.g, s, .02, vol, .14); v.o.start(s); v.o.stop(s + .18); } }
    else if (kind === 1) { const v = this.voice('sine', pan, vol), l = C.createOscillator(), lg = C.createGain(); l.frequency.value = 24 + Math.random() * 10; lg.gain.value = 420; l.connect(lg).connect(v.o.frequency); v.o.frequency.value = 3600 + Math.random() * 800; this.env(v.g, t, .05, vol * .8, .6); v.o.start(t); l.start(t); v.o.stop(t + .65); l.stop(t + .65); }
    else for (const [dt, f1, f2] of [[0, 1500, 1900], [.22, 1900, 1400], [.5, 1700, 2300]]) { const v = this.voice('sine', pan, vol), s = t + dt; v.o.frequency.setValueAtTime(f1, s); v.o.frequency.exponentialRampToValueAtTime(f2, s + .16); this.env(v.g, s, .02, vol, .2); v.o.start(s); v.o.stop(s + .22); }
  }
  owl() { const t = this.ctx.currentTime, pan = Math.random() * 1.2 - .6; for (const [dt, d] of [[0, .35], [.55, .2], [.8, .5]]) { const v = this.voice('sine', pan, .05), s = t + dt; v.o.frequency.setValueAtTime(420, s); v.o.frequency.linearRampToValueAtTime(380, s + d); this.env(v.g, s, .05, .05, d); v.o.start(s); v.o.stop(s + d + .05); } }
  step(grass) {
    if (!this.ctx || this.muted) return;
    const C = this.ctx, t = C.currentTime, src = C.createBufferSource(); src.buffer = this.noise; const f = C.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = grass ? 900 : 2600; f.Q.value = grass ? .8 : 1.6;
    const g = C.createGain(); src.connect(f).connect(g).connect(this.master); this.env(g, t, .005, grass ? .05 : .07, grass ? .12 : .07); src.start(t, Math.random() * 2); src.stop(t + .15);
  }
}
