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
    // város: zsivaj-alap (három sávban), folyó
    this.crowd = [this.loop('bandpass', 380, 1.1), this.loop('bandpass', 760, 1.3), this.loop('bandpass', 1500, 1.6)];
    this.river = this.loop('lowpass', 480, .7); this.river2 = this.loop('bandpass', 1800, .9);
    this.nSyl = 0; this.nHag = 0; this.nLyre = 0; this.nDog = 0; this.nFire = 0; this.nRiv = 0; this.lyreBuf = {}; this.mel = 0;
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
  // a város: st.city = { market, marketPan, haggle, haggleSide, river, riverPan, music, musicPan, fire, dogs }
  cityUpdate(c) {
    if (!this.ctx || this.muted || !this.crowd) return;
    const C = this.ctx, now = C.currentTime, set = (g, v) => g.gain.setTargetAtTime(v, now, .5), R = (a, b) => a + Math.random() * (b - a);
    const m = c.market;
    set(this.crowd[0], m * .11); set(this.crowd[1], m * .07); set(this.crowd[2], m * .025);
    const sw = .75 + .25 * Math.sin(now * .45) * Math.sin(now * .17 + 1); set(this.river, c.river * .32 * sw); set(this.river2, c.river * .035 * sw);
    // távoli beszéd: rövid "szótagok" formánsszűrt hanggal
    if (this.nSyl < now) this.nSyl = now;
    while (m > .04 && this.nSyl < now + .4) { this.syl(this.nSyl, R(.004, .012) * m, Math.max(-1, Math.min(1, c.marketPan + R(-.8, .8))), R(105, 250)); this.nSyl += R(.05, .2) / (.35 + m); }
    // alkudozás: egy közelebbi, élénk mondat a standok felől
    if (c.haggle > .1 && now > this.nHag) { this.nHag = now + R(4, 10); const f0 = R(110, 230), n = 4 + Math.floor(Math.random() * 5), up = Math.random() < .5, pan = R(-.7, .7); for (let k = 0; k < n; k++) this.syl(now + k * R(.12, .17), .035 * c.haggle, pan, f0 * (1 + (up ? k / n * .35 : -k / n * .2)), true); }
    // folyó: loccsanás, csónaknyikorgás
    if (c.river > .15 && now > this.nRiv) { this.nRiv = now + R(3, 8); Math.random() < .6 ? this.splash(c.river, R(-.8, .8)) : this.creak(c.river, R(-.6, .6)); }
    // éjjel: lant, pattogó tűz, távoli kutyák
    if (c.music > .03 && now > this.nLyre) { const SC = [293.66, 349.23, 392, 440, 523.25, 587.33, 698.46]; this.mel = Math.max(0, Math.min(SC.length - 1, this.mel + Math.floor(R(-2, 3)))); this.pluck(SC[this.mel], .09 * c.music, c.musicPan); if (Math.random() < .25) this.pluck(SC[Math.max(0, this.mel - 2)] / 2, .06 * c.music, c.musicPan); this.nLyre = now + (Math.random() < .15 ? R(.9, 1.6) : R(.28, .5)); }
    if (c.fire > .05 && now > this.nFire) { this.nFire = now + R(.05, .4) / c.fire; this.crackle(.05 * c.fire); }
    if (c.dogs && now > this.nDog) { this.nDog = now + R(14, 40); const pan = R(-1, 1), n = 2 + Math.floor(Math.random() * 3); for (let k = 0; k < n; k++) this.bark(now + k * R(.28, .4), pan); }
  }
  syl(t, vol, pan, f0, loud) {
    const C = this.ctx, o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (.92 + Math.random() * .16), t + .15);
    const V = [[730, 1090], [270, 2290], [300, 870], [530, 1840], [570, 840], [440, 1020], [660, 1720]][Math.floor(Math.random() * 7)];
    const g = C.createGain(), p = C.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(this.master);
    for (const [f, q, a] of [[V[0], 7, 1], [V[1], 9, .6]]) { const b = C.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = C.createGain(); bg.gain.value = a; o.connect(b).connect(bg).connect(g); }
    const d = loud ? .1 + Math.random() * .08 : .06 + Math.random() * .14; this.env(g, t, .015, vol, d); o.start(t); o.stop(t + d + .05);
  }
  // időjárás: eső (sziszegő zaj két sávban) és viharos szél (lüktető széllökések)
  weather(rain, wind) {
    if (!this.ctx || this.muted) return;
    if (!this.rainG) { this.rainG = [this.loop('highpass', 2200, .4), this.loop('bandpass', 750, .5)]; this.gust = [this.loop('bandpass', 420, .8), this.loop('lowpass', 900, .5)]; }
    const now = this.ctx.currentTime, set = (g, v) => g.gain.setTargetAtTime(v, now, .6), gs = .6 + .4 * Math.sin(now * .7) * Math.sin(now * .23 + 2);
    set(this.rainG[0], rain * .2); set(this.rainG[1], rain * .1); set(this.gust[0], wind * .5 * gs); set(this.gust[1], wind * .22 * gs);
  }
  thunder(vol) {
    if (!this.ctx || this.muted || vol <= 0) return;
    const C = this.ctx, t = C.currentTime;
    for (const [d, f, a, len] of [[0, 160, 1, 2.6], [.15, 80, .9, 3.4], [.9, 120, .6, 2.2]]) {
      const src = C.createBufferSource(); src.buffer = this.noise; const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f; lp.Q.value = .7; const g = C.createGain();
      src.connect(lp).connect(g).connect(this.master); g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.9 * vol * a, t + d + .08); g.gain.exponentialRampToValueAtTime(.001, t + d + len);
      src.start(t + d, Math.random() * 2); src.stop(t + d + len + .1);
    }
  }
  // kürtszó: két hang, fémes felhangokkal
  horn(vol, pan) {
    if (!this.ctx || this.muted || vol <= 0) return;
    const C = this.ctx, t = C.currentTime, p = C.createStereoPanner(); p.pan.value = pan; p.connect(this.master);
    for (const [st, f, len] of [[0, 233, .5], [.55, 311, .45], [1.05, 349, 1.1]]) {
      const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .97, t + st); o.frequency.linearRampToValueAtTime(f, t + st + .08);
      const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; const g = C.createGain(); o.connect(lp).connect(g).connect(p);
      this.env(g, t + st, .05, .05 * vol, len); o.start(t + st); o.stop(t + st + len + .1);
    }
  }
  // taps: sok rövid zajcsattanás
  clap(vol, pan) {
    if (!this.ctx || this.muted || vol <= 0) return;
    const C = this.ctx, t = C.currentTime;
    for (let k = 0; k < 40; k++) { const tk = t + Math.random() * 2.4, src = C.createBufferSource(); src.buffer = this.noise; const f = C.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100 + Math.random() * 900; f.Q.value = 1.2; const g = C.createGain(), p = C.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan + Math.random() * .8 - .4)); src.connect(f).connect(g).connect(p).connect(this.master); this.env(g, tk, .002, .06 * vol * (1 - (tk - t) / 3), .05); src.start(tk, Math.random() * 2); src.stop(tk + .08); }
  }
  hammer(vol, pan) {
    if (!this.ctx || this.muted || vol <= 0) return;
    const C = this.ctx, t = C.currentTime, f0 = 720 + Math.random() * 60, p = C.createStereoPanner(); p.pan.value = pan; p.connect(this.master);
    for (const [r, a, d] of [[1, 1, .5], [2.76, .5, .3], [5.4, .3, .18], [8.93, .15, .1]]) { const o = C.createOscillator(); o.frequency.value = f0 * r; const g = C.createGain(); o.connect(g).connect(p); this.env(g, t, .002, .05 * vol * a, d); o.start(t); o.stop(t + d + .05); }
    const src = C.createBufferSource(); src.buffer = this.noise; const f = C.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; const g = C.createGain(); src.connect(f).connect(g).connect(p); this.env(g, t, .001, .06 * vol, .04); src.start(t, Math.random() * 2); src.stop(t + .06);
  }
  splash(v, pan) { const C = this.ctx, t = C.currentTime, src = C.createBufferSource(); src.buffer = this.noise; const f = C.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(500, t + .35); f.Q.value = .8; const g = C.createGain(), p = C.createStereoPanner(); p.pan.value = pan; src.connect(f).connect(g).connect(p).connect(this.master); this.env(g, t, .02, .09 * v, .4); src.start(t, Math.random() * 2); src.stop(t + .5); }
  creak(v, pan) { const C = this.ctx, t = C.currentTime, o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(70, t + .6); const f = C.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 3; const g = C.createGain(), p = C.createStereoPanner(); p.pan.value = pan; o.connect(f).connect(g).connect(p).connect(this.master); this.env(g, t, .08, .025 * v, .7); o.start(t); o.stop(t + .8); }
  crackle(vol) { const C = this.ctx, t = C.currentTime + Math.random() * .05, src = C.createBufferSource(); src.buffer = this.noise; const f = C.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800; const g = C.createGain(), p = C.createStereoPanner(); p.pan.value = Math.random() * 1.2 - .6; src.connect(f).connect(g).connect(p).connect(this.master); this.env(g, t, .001, vol, .012 + Math.random() * .02); src.start(t, Math.random() * 2); src.stop(t + .05); }
  bark(t, pan) { const C = this.ctx, o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(230, t + .13); const f = C.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 950; f.Q.value = 2.2; const g = C.createGain(), p = C.createStereoPanner(); p.pan.value = pan; o.connect(f).connect(g).connect(p).connect(this.master); this.env(g, t, .01, .018, .16); o.start(t); o.stop(t + .2); }
  // lant: Karplus-Strong pengetés (a hangmagasságonként egyszer kiszámolt hullámforma)
  pluck(freq, vol, pan) {
    const C = this.ctx; let buf = this.lyreBuf[freq];
    if (!buf) { const sr = C.sampleRate, len = Math.floor(sr * 2.2), N = Math.round(sr / freq), d = new Float32Array(len); for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1; for (let i = N; i < len; i++) d[i] = .4985 * (d[i - N] + d[i - N + 1]); buf = C.createBuffer(1, len, sr); buf.getChannelData(0).set(d); this.lyreBuf[freq] = buf; }
    const t = C.currentTime, src = C.createBufferSource(); src.buffer = buf; const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; const g = C.createGain(); g.gain.value = vol; const p = C.createStereoPanner(); p.pan.value = pan;
    src.connect(f).connect(g).connect(p).connect(this.master); src.start(t);
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
