// Procedurális dzsungel-hangkép WebAudio-val (nincs külső hangfájl)
export class JungleAudio {
  constructor() { this.ctx = null; this.vol = 0.7; this.muted = false; this.next = 0; this.nextNight = 0; this.nextCrack = 0; }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = C.createGain(); this.master.gain.value = this.vol; this.master.connect(C.destination);
    const len = C.sampleRate * 3, buf = C.createBuffer(1, len, C.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
    this.noise = buf;
    this.fall = this.loop('lowpass', 1500, 0.6);
    this.fall2 = this.loop('bandpass', 380, 0.8);
    this.river = this.loop('lowpass', 650, 0.7);
    this.insect = this.loop('bandpass', 5600, 9);
    this.wind = this.loop('lowpass', 420, 0.5);
    // tücsökciripelés éjjel: szinusz amplitúdó-modulálva
    const o = C.createOscillator(); o.frequency.value = 4300;
    const am = C.createGain(); am.gain.value = 0;
    const lfo = C.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 22;
    const lg = C.createGain(); lg.gain.value = 0.5;
    lfo.connect(lg).connect(am.gain);
    this.cricketG = C.createGain(); this.cricketG.gain.value = 0;
    o.connect(am).connect(this.cricketG).connect(this.master);
    o.start(); lfo.start();
    // rovar-zümmögés lüktetése
    const il = C.createOscillator(); il.frequency.value = 11;
    const ilg = C.createGain(); ilg.gain.value = 0.4;
    il.connect(ilg).connect(this.insect.g.gain); il.start();
  }

  loop(type, freq, q) {
    const C = this.ctx;
    const src = C.createBufferSource(); src.buffer = this.noise; src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = C.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = C.createGain(); g.gain.value = 0;
    const p = C.createStereoPanner();
    src.connect(f).connect(g).connect(p).connect(this.master);
    src.start(0, Math.random() * 2);
    return { g, p, f };
  }

  // háttérben (másik fül/ablak) ne szóljon
  pause(on) {
    if (!this.ctx) return;
    if (on) this.ctx.suspend(); else this.ctx.resume();
  }

  // eső: sziszegő zaj + mélyebb dobolás a leveleken
  // cov: lombtakarás a játékos fölött; lomb alatt halkabb a sziszegés, erősebb a levelek tompa dobolása
  setRain(r, cov = 0) {
    if (!this.ctx) return;
    if (!this.rainA) { this.rainA = this.loop('bandpass', 2600, 0.45); this.rainB = this.loop('lowpass', 700, 0.6); }
    const now = this.ctx.currentTime;
    this.rainA.g.gain.setTargetAtTime(0.32 * r * (1 - 0.55 * cov), now, 0.6);
    this.rainB.g.gain.setTargetAtTime(0.22 * r * r * (1 + 0.9 * cov), now, 0.6);
  }

  // mennydörgés: közelben éles reccsenés, utána hosszú, hullámzó dübörgés
  thunder(dist) {
    if (!this.ctx) return;
    const C = this.ctx, t = C.currentTime, near = Math.max(0, 1 - dist / 500);
    const src = C.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900 * (0.4 + near), t); f.frequency.exponentialRampToValueAtTime(90, t + 4);
    const g = C.createGain(), p = C.createStereoPanner(); p.pan.value = Math.random() * 1.2 - 0.6;
    src.connect(f).connect(g).connect(p).connect(this.master);
    const v = 0.9 * (0.45 + near);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.08 + (1 - near) * 0.3);
    for (let k = 1; k < 5; k++) g.gain.linearRampToValueAtTime(v * (0.35 + Math.random() * 0.55) / k ** 0.4, t + 0.4 * k + Math.random() * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 5 + Math.random() * 2);
    src.start(t, Math.random() * 2); src.stop(t + 7.5);
    if (near > 0.35) this.burst(3000, 0.6, 0.5 * near, 0.25, p.pan.value);
  }

  // arapapagáj: rekedt, frekvencia-modulált rikácsolás, többször egymás után
  parrot(pan = 0, vol = 0.1) {
    if (!this.ctx) return;
    const C = this.ctx, t0 = C.currentTime, n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const s = t0 + i * (0.22 + Math.random() * 0.12);
      const v = this.voice('sawtooth', pan, vol), mod = C.createOscillator(), mg = C.createGain();
      mod.frequency.value = 70 + Math.random() * 40; mg.gain.value = 500;
      mod.connect(mg).connect(v.o.frequency);
      const f = C.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 1.4;
      v.o.disconnect(); v.o.connect(f).connect(v.g);
      v.o.frequency.setValueAtTime(900 + Math.random() * 300, s); v.o.frequency.linearRampToValueAtTime(1500, s + 0.08); v.o.frequency.linearRampToValueAtTime(800, s + 0.18);
      this.env(v.g, s, 0.015, vol, 0.2); v.o.start(s); mod.start(s); v.o.stop(s + 0.22); mod.stop(s + 0.22);
    }
  }
  // bőgőmajom: mély, hörgő, hullámzó üvöltés messziről
  howl(pan = 0) {
    if (!this.ctx) return;
    const C = this.ctx, t = C.currentTime;
    for (let k = 0; k < 3; k++) {
      const s = t + k * 0.9 + Math.random() * 0.3;
      const src = C.createBufferSource(); src.buffer = this.noise;
      const f1 = C.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 6; f1.frequency.setValueAtTime(320, s); f1.frequency.linearRampToValueAtTime(520, s + 0.5); f1.frequency.linearRampToValueAtTime(280, s + 1.6);
      const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(95, s); o.frequency.linearRampToValueAtTime(130, s + 0.5); o.frequency.linearRampToValueAtTime(85, s + 1.6);
      const og = C.createGain(); og.gain.value = 0.4;
      const g = C.createGain(), p = C.createStereoPanner(); p.pan.value = pan;
      src.connect(f1).connect(g); o.connect(og).connect(f1);
      g.connect(p).connect(this.master);
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.09, s + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, s + 1.8);
      src.start(s, Math.random() * 2, 2); o.start(s); o.stop(s + 2);
    }
  }
  // vadászat: suhogás, becsapódás, pekari-röfögés és visítás, sercegés a tűzön
  whoosh(power = 1) { if (this.ctx) { this.burst(500 + power * 500, 0.7, 0.1 + power * 0.08, 0.35); this.burst(1600, 1.5, 0.04 * power, 0.25); } }
  thunk(vol = 0.3, wood = false) { if (this.ctx) { this.burst(wood ? 420 : 160, wood ? 3 : 1, vol, wood ? 0.09 : 0.14); this.crack(vol * 0.5); } }
  grunt(pan = 0, vol = 0.15, high = false) {
    if (!this.ctx) return;
    const C = this.ctx, s = C.currentTime + Math.random() * 0.05;
    for (let k = 0; k < (high ? 1 : 2); k++) {
      const t = s + k * 0.17, o = C.createOscillator(), f = C.createBiquadFilter(), g = C.createGain(), p = C.createStereoPanner();
      o.type = 'sawtooth'; const f0 = high ? 520 : 105 + Math.random() * 30;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (high ? 1.7 : 0.75), t + (high ? 0.28 : 0.12));
      f.type = 'lowpass'; f.frequency.value = high ? 2600 : 650; p.pan.value = pan;
      o.connect(f).connect(g).connect(p).connect(this.master);
      this.env(g, t, 0.01, vol, high ? 0.5 : 0.15); o.start(t); o.stop(t + (high ? 0.55 : 0.2));
    }
  }
  squeal(pan = 0, vol = 0.3) { this.grunt(pan, vol, true); }
  sizzle() { if (this.ctx) { this.burst(4200, 0.4, 0.07, 1.6); this.burst(2600, 0.6, 0.05, 1.1); } }
  plop() { if (this.ctx) this.burst(500 + Math.random() * 300, 1.2, 0.12, 0.18); }
  // jaguár: mély, reszelős morgás
  growl(vol = 0.5) {
    if (!this.ctx) return;
    const C = this.ctx, s = C.currentTime;
    const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, s); o.frequency.linearRampToValueAtTime(55, s + 1.2);
    const am = C.createOscillator(); am.frequency.value = 22; const ag = C.createGain(); ag.gain.value = 0.5;
    const g = C.createGain(); g.gain.value = 0;
    am.connect(ag).connect(g.gain);
    const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    o.connect(f).connect(g).connect(this.master);
    g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.35 * vol, s + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, s + 1.4);
    o.start(s); am.start(s); o.stop(s + 1.5); am.stop(s + 1.5);
    this.burst(300, 0.7, 0.1 * vol, 1.0);
  }

  setVolume(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.1); }
  toggleMute() { this.muted = !this.muted; this.setVolume(this.vol); return this.muted; }

  pan(dx, dz, yaw) {
    const a = Math.atan2(dx, -dz) + yaw;
    return Math.max(-0.9, Math.min(0.9, Math.sin(a)));
  }

  update(st) {
    if (!this.ctx) return;
    const C = this.ctx, now = C.currentTime, set = (param, v) => param.setTargetAtTime(v, now, 0.25);
    const fd = Math.hypot(st.pos.x - st.fall.x, st.pos.z - st.fall.z);
    set(this.fall.g.gain, 0.9 / (1 + fd * 0.06));
    set(this.fall2.g.gain, 0.7 / (1 + fd * 0.05));
    const pf = this.pan(st.fall.x - st.pos.x, st.fall.z - st.pos.z, st.yaw);
    set(this.fall.p.pan, pf); set(this.fall2.p.pan, pf);
    set(this.river.g.gain, 0.35 / (1 + Math.max(0, st.riverD - 3) * 0.25));
    set(this.insect.g.gain, 0.025 * st.day + 0.008);
    set(this.wind.g.gain, 0.06 + 0.03 * Math.sin(now * 0.2));
    set(this.cricketG.gain, 0.012 * st.night);

    if (now > this.next && st.day > 0.15) { this.next = now + 0.8 + Math.random() * 3.5; this.bird(); }
    if (now > this.nextNight && st.night > 0.4) { this.nextNight = now + 2 + Math.random() * 6; Math.random() < 0.3 ? this.owl() : this.frog(); }
    if (st.fireD < 14 && now > this.nextCrack) { this.nextCrack = now + 0.05 + Math.random() * 0.4; this.crack(0.25 / (1 + st.fireD * 0.4)); }
  }

  env(g, t0, a, peak, dur) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }

  voice(type, pan, vol) {
    const C = this.ctx, o = C.createOscillator(), g = C.createGain(), p = C.createStereoPanner();
    o.type = type; p.pan.value = pan; g.gain.value = 0;
    o.connect(g).connect(p).connect(this.master);
    return { o, g, vol };
  }

  bird() {
    const C = this.ctx, t = C.currentTime, pan = Math.random() * 1.6 - 0.8, vol = 0.03 + Math.random() * 0.05;
    const kind = Math.floor(Math.random() * 4);
    if (kind === 0) {
      const n = 2 + Math.floor(Math.random() * 3), f0 = 1800 + Math.random() * 1200;
      for (let i = 0; i < n; i++) {
        const v = this.voice('sine', pan, vol), s = t + i * 0.18;
        v.o.frequency.setValueAtTime(f0, s); v.o.frequency.exponentialRampToValueAtTime(f0 * 1.6, s + 0.12);
        this.env(v.g, s, 0.02, vol, 0.16); v.o.start(s); v.o.stop(s + 0.2);
      }
    } else if (kind === 1) {
      const v = this.voice('sine', pan, vol), lfo = C.createOscillator(), lg = C.createGain();
      lfo.frequency.value = 26 + Math.random() * 10; lg.gain.value = 380;
      lfo.connect(lg).connect(v.o.frequency); v.o.frequency.value = 3400 + Math.random() * 900;
      this.env(v.g, t, 0.05, vol * 0.8, 0.7); v.o.start(t); lfo.start(t); v.o.stop(t + 0.75); lfo.stop(t + 0.75);
    } else if (kind === 2) {
      for (const [dt, f1, f2] of [[0, 950, 760], [0.38, 820, 640]]) {
        const v = this.voice('sine', pan, vol), s = t + dt;
        v.o.frequency.setValueAtTime(f1, s); v.o.frequency.exponentialRampToValueAtTime(f2, s + 0.3);
        this.env(v.g, s, 0.04, vol * 1.2, 0.34); v.o.start(s); v.o.stop(s + 0.36);
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const v = this.voice('sawtooth', pan, vol), s = t + i * 0.11, f = C.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 3;
        v.o.disconnect(); v.o.connect(f).connect(v.g);
        v.o.frequency.value = 420 + Math.random() * 60;
        this.env(v.g, s, 0.01, vol * 0.9, 0.08); v.o.start(s); v.o.stop(s + 0.1);
      }
    }
  }

  owl() {
    const t = this.ctx.currentTime, pan = Math.random() * 1.4 - 0.7;
    for (const [dt, d] of [[0, 0.35], [0.5, 0.6]]) {
      const v = this.voice('sine', pan, 0.05), s = t + dt;
      v.o.frequency.setValueAtTime(390, s); v.o.frequency.linearRampToValueAtTime(350, s + d);
      this.env(v.g, s, 0.06, 0.05, d); v.o.start(s); v.o.stop(s + d + 0.05);
    }
  }

  frog() {
    const t = this.ctx.currentTime, pan = Math.random() * 1.4 - 0.7, n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const v = this.voice('square', pan, 0.02), s = t + i * 0.13;
      v.o.frequency.setValueAtTime(620, s); v.o.frequency.exponentialRampToValueAtTime(380, s + 0.08);
      this.env(v.g, s, 0.005, 0.018, 0.09); v.o.start(s); v.o.stop(s + 0.1);
    }
  }

  burst(freq, q, vol, dur, pan = 0) {
    const C = this.ctx, t = C.currentTime;
    const src = C.createBufferSource(); src.buffer = this.noise;
    const f = C.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = C.createGain(), p = C.createStereoPanner(); p.pan.value = pan;
    src.connect(f).connect(g).connect(p).connect(this.master);
    this.env(g, t, 0.004, vol, dur);
    src.start(t, Math.random() * 2, dur + 0.05);
  }
  crack(vol) { this.burst(1800 + Math.random() * 2500, 2, vol * (0.3 + Math.random()), 0.03 + Math.random() * 0.04); }
  step(surface, run) {
    if (!this.ctx) return;
    if (surface === 'water') this.burst(700 + Math.random() * 400, 0.8, 0.18 + run * 0.08, 0.22);
    else this.burst(900 + Math.random() * 500, 1.2, 0.07 + run * 0.05, 0.08);
  }
}
