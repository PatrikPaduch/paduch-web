// Kontroller (Gamepad API, "standard" kiosztás: Xbox / PlayStation / általános).
// Bal kar: mozgás (analóg sebesség), jobb kar: kamera. A gombok a billentyűparancsokat hívják.
const DZ = 0.18;
const dead = (v) => (Math.abs(v) < DZ ? 0 : (v - Math.sign(v) * DZ) / (1 - DZ));

// gomb -> művelet (a "standard" mapping indexei)
export const PAD_MAP = {
  0: 'jump', 1: 'back', 2: 'use', 3: 'eat', 4: 'journal', 5: 'stab', 8: 'map', 9: 'menu',
  10: 'walk', 11: 'photo', 12: 'tool1', 13: 'craft', 14: 'tool2', 15: 'tool3',
};

export class Pad {
  constructor(onAction) {
    this.onAction = onAction;
    this.prev = []; this.idx = -1; this.active = false;
    this.lt = 0; this.rt = 0; this.rtDown = false;
    this.move = { x: 0, y: 0 }; this.look = { x: 0, y: 0 };
    addEventListener('gamepadconnected', (e) => { this.idx = e.gamepad.index; this.onAction('connected', e.gamepad.id); });
    addEventListener('gamepaddisconnected', (e) => { if (e.gamepad.index === this.idx) { this.idx = -1; this.active = false; this.onAction('disconnected'); } });
  }
  get gp() {
    const all = navigator.getGamepads ? navigator.getGamepads() : [];
    if (this.idx >= 0 && all[this.idx]) return all[this.idx];
    for (const g of all) if (g && g.connected) { this.idx = g.index; return g; }
    return null;
  }
  poll() {
    const g = this.gp;
    if (!g) { this.move.x = this.move.y = this.look.x = this.look.y = 0; return; }
    const ax = g.axes;
    this.move.x = dead(ax[0] || 0); this.move.y = dead(ax[1] || 0);
    this.look.x = dead(ax[2] || 0); this.look.y = dead(ax[3] || 0);
    const b = g.buttons, val = (i) => (b[i] ? b[i].value : 0), down = (i) => !!(b[i] && (b[i].pressed || b[i].value > 0.5));
    this.lt = val(6); this.rt = val(7);
    let any = Math.hypot(this.move.x, this.move.y) > 0 || Math.hypot(this.look.x, this.look.y) > 0 || this.lt > 0.3 || this.rt > 0.3;
    for (let i = 0; i < b.length; i++) {
      const d = down(i);
      if (d) any = true;
      if (d && !this.prev[i] && PAD_MAP[i]) this.onAction(PAD_MAP[i]);
      this.prev[i] = d;
    }
    // jobb ravasz: nyomás = célzás, elengedés = dobás
    const rt = this.rt > 0.45;
    if (rt && !this.rtDown) this.onAction('aimStart');
    if (!rt && this.rtDown) this.onAction('aimEnd');
    this.rtDown = rt;
    if (any && !this.active) { this.active = true; this.onAction('active'); }
  }
  // rezgés (ha a kontroller tudja)
  rumble(strong = 0.6, weak = 0.4, ms = 200) {
    const g = this.gp, a = g && g.vibrationActuator;
    if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
  }
}
