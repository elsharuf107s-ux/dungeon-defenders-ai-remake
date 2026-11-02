/* =====================================================================
   DUNGEON PRETENDERS - synthesized audio (no asset files needed)
   ===================================================================== */
(function () {
  'use strict';
  const DD = (window.DD = window.DD || {});

  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let muted = false;
  let musicMode = 'off';
  let nextNoteTime = 0, step = 0, timer = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      if (!timer) timer = setInterval(schedule, 90);
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, type, vol, slideTo, delay, bus) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, freq, delay, q) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq || 1200; f.Q.value = q || 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
  }

  /* throttle so a swarm of hits doesn't melt the speakers */
  const last = {};
  function ok(name, gap) {
    if (!ctx) return false;
    const n = performance.now();
    if (last[name] && n - last[name] < gap) return false;
    last[name] = n;
    return true;
  }

  const sfx = {
    hit() { if (ok('hit', 45)) { tone(220 + Math.random() * 80, 0.08, 'square', 0.14, 90); noise(0.05, 0.1, 2500); } },
    swing() { if (ok('swing', 80)) noise(0.12, 0.18, 1800, 0, 1.4); },
    shoot() { if (ok('shoot', 50)) tone(520 + Math.random() * 60, 0.09, 'triangle', 0.13, 220); },
    bolt() { if (ok('bolt', 60)) { tone(300, 0.2, 'sawtooth', 0.1, 700); } },
    arrow() { if (ok('arrow', 40)) { tone(900, 0.06, 'triangle', 0.09, 400); } },
    palm() { if (ok('palm', 60)) { tone(180, 0.18, 'sine', 0.2, 340); } },
    sling() { if (ok('sling', 50)) tone(380, 0.07, 'triangle', 0.09, 160); },
    lob() { if (ok('lob', 80)) { tone(120, 0.18, 'sawtooth', 0.14, 60); noise(0.12, 0.14, 700); } },
    zap() { if (ok('zap', 60)) { tone(1200, 0.14, 'sawtooth', 0.09, 200); noise(0.1, 0.12, 5000); } },
    boom() { if (ok('boom', 60)) { noise(0.5, 0.45, 600, 0, 0.5); tone(90, 0.4, 'sine', 0.35, 30); } },
    place() { tone(180, 0.08, 'square', 0.2, 300); tone(300, 0.1, 'square', 0.16, 420, 0.06); },
    sell() { tone(500, 0.08, 'triangle', 0.18, 250); },
    error() { tone(120, 0.18, 'sawtooth', 0.2, 80); },
    upgrade() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.18, null, i * 0.07)); },
    repair() { tone(330, 0.1, 'triangle', 0.15, 440); tone(440, 0.12, 'triangle', 0.15, 550, 0.08); },
    coin() { if (ok('coin', 35)) { tone(1046, 0.06, 'square', 0.07); tone(1568, 0.1, 'square', 0.07, null, 0.05); } },
    loot() { [523, 659, 880].forEach((f, i) => tone(f, 0.1, 'triangle', 0.2, null, i * 0.06)); },
    levelup() { [392, 494, 587, 784, 988].forEach((f, i) => tone(f, 0.16, 'square', 0.15, null, i * 0.08)); },
    hurt() { if (ok('hurt', 120)) { tone(200, 0.2, 'sawtooth', 0.22, 70); } },
    dash() { noise(0.15, 0.2, 3000, 0, 0.6); tone(300, 0.14, 'sine', 0.1, 700); },
    slip() { tone(700, 0.35, 'sine', 0.18, 120); tone(900, 0.2, 'triangle', 0.1, 200, 0.05); },
    special() { tone(220, 0.35, 'sawtooth', 0.18, 880); tone(330, 0.35, 'square', 0.1, 1100, 0.04); },
    wave() { [196, 196, 262, 196, 330].forEach((f, i) => tone(f, 0.18, 'square', 0.18, null, i * 0.13)); },
    boss() { [110, 104, 98, 92].forEach((f, i) => tone(f, 0.5, 'sawtooth', 0.22, f * 0.8, i * 0.32)); noise(1.2, 0.3, 300); },
    clear() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.2, null, i * 0.1)); },
    die() { tone(400, 0.6, 'sawtooth', 0.22, 60); },
    over() { [330, 311, 294, 262].forEach((f, i) => tone(f, 0.5, 'triangle', 0.22, f * 0.97, i * 0.4)); },
    win() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'square', 0.16, null, i * 0.12)); },
    click() { tone(660, 0.05, 'square', 0.1); },
    gong() { tone(110, 1.2, 'sine', 0.3, 100); tone(220, 1.0, 'sine', 0.15, 210); },
  };

  /* -------- music: elevator jazz for building, panicky chiptune for fighting -------- */
  const BUILD = {
    bpm: 84, wave: 'sine', vol: 0.5,
    bass: [48, null, 55, null, 52, null, 55, null, 50, null, 57, null, 53, null, 57, null],
    arp:  [72, 76, 79, 83, 79, 76, 72, 76, 74, 77, 81, 84, 81, 77, 74, 77],
  };
  const FIGHT = {
    bpm: 150, wave: 'square', vol: 0.32,
    bass: [45, 45, 52, 45, 45, 45, 52, 55, 43, 43, 50, 43, 43, 43, 50, 53],
    arp:  [69, null, 72, null, 76, null, 72, 69, 67, null, 71, null, 74, null, 71, 67],
  };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function schedule() {
    if (!ctx || muted || musicMode === 'off') { return; }
    if (ctx.state === 'suspended') return;
    const song = musicMode === 'fight' ? FIGHT : BUILD;
    const stepDur = 60 / song.bpm / 2;
    if (nextNoteTime < ctx.currentTime) nextNoteTime = ctx.currentTime + 0.05;
    while (nextNoteTime < ctx.currentTime + 0.25) {
      const i = step % 16;
      const t = nextNoteTime - ctx.currentTime;
      if (song.bass[i] != null && (musicMode === 'fight' || i % 2 === 0)) tone(mtof(song.bass[i] - 12), stepDur * 1.6, musicMode === 'fight' ? 'triangle' : 'sine', song.vol, null, t, musicBus);
      if (song.arp[i] != null) tone(mtof(song.arp[i]), stepDur * 1.2, song.wave, song.vol * 0.55, null, t, musicBus);
      step++;
      nextNoteTime += stepDur;
    }
  }

  DD.audio = {
    init,
    sfx,
    setMusic(mode) { musicMode = mode; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.8;
      return muted;
    },
    isMuted: () => muted,
  };
})();
