/* =====================================================================
   DUNGEON PRETENDERS - UI layer (DOM). Passive: game.js pushes data in,
   user actions go back out through ui.h.* callbacks.
   ===================================================================== */
(function () {
  'use strict';
  const DD = (window.DD = window.DD || {});
  const D = DD.data;
  const $ = (id) => document.getElementById(id);

  const ui = {
    // handlers - the game fills these in
    h: {
      selectHero() {}, play() {}, resume() {}, quit() {}, again() {}, endless() {}, menu() {},
      pickTower() {}, startWave() {}, openInv() {}, closeInv() {}, mute() {}, pause() {},
      spend() {}, equip() {}, sellBag() {},
    },
  };

  /* ---------- tiny cached setters (avoid layout thrash) ---------- */
  function setText(el, v) { v = String(v); if (el._v !== v) { el._v = v; el.textContent = v; } }
  function setW(el, frac) { const v = Math.max(0, Math.min(1, frac)).toFixed(3); if (el._w !== v) { el._w = v; el.style.width = (v * 100) + '%'; } }
  function setCls(el, cls, on) { if (el._c === undefined) el._c = {}; if (el._c[cls] !== on) { el._c[cls] = on; el.classList.toggle(cls, !!on); } }
  function setHidden(el, hide) { setCls(el, 'hidden', hide); }
  function setH(el, pct) { const v = pct.toFixed(1); if (el._h !== v) { el._h = v; el.style.height = v + '%'; } }

  /* ---------- feedback bits ---------- */
  let bannerTimer = 0, quipTimer = 0;
  ui.banner = function (main, sub, ms, boss) {
    const b = $('banner');
    $('banner-main').textContent = main;
    $('banner-sub').textContent = sub || '';
    b.classList.toggle('boss', !!boss);
    b.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => b.classList.remove('show'), ms || 2200);
  };
  ui.quip = function (text, ms) {
    const q = $('quip');
    q.textContent = '“' + text + '”';
    q.classList.add('show');
    clearTimeout(quipTimer);
    quipTimer = setTimeout(() => q.classList.remove('show'), ms || 5200);
  };
  ui.hideMessages = function () {
    clearTimeout(bannerTimer); clearTimeout(quipTimer);
    $('banner').classList.remove('show'); $('quip').classList.remove('show');
  };
  ui.toast = function (html, color) {
    const box = $('toasts');
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.borderLeftColor = color || '#fff';
    t.innerHTML = html;
    box.appendChild(t);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, 4200);
  };
  let fxCount = 0;
  ui.floatAt = function (x, y, text, cls) {
    if (fxCount > 38) return;
    const d = document.createElement('div');
    d.className = 'dmg ' + (cls || '');
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    $('fx').appendChild(d);
    fxCount++;
    setTimeout(() => { d.remove(); fxCount--; }, cls === 'big' ? 1450 : 900);
  };
  let vigTimer = 0;
  ui.hurtFlash = function () {
    const v = $('vignette');
    v.classList.add('on');
    clearTimeout(vigTimer);
    vigTimer = setTimeout(() => v.classList.remove('on'), 90);
  };

  /* ---------- screens ---------- */
  ui.show = function (id, on) { $(id).classList.toggle('hidden', !on); };
  ui.hud = function (on) { $('hud').classList.toggle('hidden', !on); };

  /* ---------- title / hero select ---------- */
  function pips(n) { return '●'.repeat(n) + '<span style="opacity:.25">' + '●'.repeat(5 - n) + '</span>'; }
  ui.buildHeroCards = function (selected) {
    const wrap = $('hero-cards');
    wrap.innerHTML = '';
    Object.values(D.CLASSES).forEach((c) => {
      const el = document.createElement('div');
      el.className = 'hero-card' + (c.id === selected ? ' sel' : '');
      el.dataset.id = c.id;
      el.innerHTML =
        '<div class="em">' + c.emoji + '</div><div class="nm">' + c.name + '</div><div class="tt">' + c.title + '</div>' +
        '<div class="st">' + Object.keys(c.stats).map((k) => '<span>' + k + '</span><span class="pips">' + pips(c.stats[k]) + '</span>').join('') + '</div>';
      el.addEventListener('click', () => { DD.audio.init(); DD.audio.sfx.click(); ui.h.selectHero(c.id); });
      wrap.appendChild(el);
    });
    ui.showHeroDetail(selected);
  };
  ui.showHeroDetail = function (id) {
    const c = D.CLASSES[id];
    document.querySelectorAll('.hero-card').forEach((e) => e.classList.toggle('sel', e.dataset.id === id));
    $('hero-detail').innerHTML =
      '<b>' + c.name + '</b> — ' + c.desc + '<br>' +
      '⚔️ <b>' + c.attackName + '</b> &nbsp; ✨ <b>' + c.special.name + '</b>: ' + c.special.desc + '<br>' +
      '🏗️ <b>Tower bonus:</b> ' + c.bonus.text;
  };

  /* ---------- tower bar ---------- */
  ui.buildTowerBar = function () {
    const bar = $('tower-bar');
    bar.innerHTML = '';
    D.TOWER_ORDER.forEach((id, i) => {
      const t = D.TOWERS[id];
      const el = document.createElement('div');
      el.className = 'slot';
      el.id = 'tw-' + id;
      el.title = t.name + ' — ' + t.desc;
      el.innerHTML = '<span class="k">' + (i + 1) + '</span><span class="e">' + t.emoji + '</span><span class="n">' + t.name + '</span><span class="c">💎' + t.cost + '</span>';
      el.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); ui.h.pickTower(id); });
      bar.appendChild(el);
    });
  };

  /* ---------- HUD refresh ---------- */
  ui.updateHud = function (v) {
    setText($('wave-label'), v.waveLabel);
    setText($('wave-sub'), v.waveSub);
    const ph = $('phase-label');
    setText(ph, v.phaseText);
    setCls(ph, 'build', v.phase === 'build');
    setCls(ph, 'combat', v.phase === 'combat');
    setHidden($('btn-start-wave'), v.phase !== 'build');

    const cf = v.crystalHp / v.crystalMax;
    setW($('crystal-fill'), cf);
    setText($('crystal-text'), Math.ceil(v.crystalHp) + ' / ' + v.crystalMax);
    setCls($('crystal-fill').parentNode, 'low', cf < 0.3);

    setHidden($('boss-wrap'), !v.boss);
    if (v.boss) { setText($('boss-name'), v.boss.name); setW($('boss-fill'), v.boss.frac); }

    setText($('hero-emoji'), v.heroEmoji);
    setText($('hero-name'), v.heroName);
    setText($('hero-level'), 'Lv ' + v.level);
    setW($('hp-fill'), v.hp / v.maxHp);
    setText($('hp-text'), v.alive ? Math.ceil(v.hp) + ' / ' + Math.ceil(v.maxHp) : 'Respawning in ' + Math.ceil(v.respawn) + '...');
    setCls($('hp-fill').parentNode, 'low', v.hp / v.maxHp < 0.3);
    setW($('xp-fill'), v.xpFrac);
    setHidden($('sp-alert'), v.sp <= 0);
    setText($('sp-count'), v.sp);

    setText($('mana-val'), Math.floor(v.mana));
    setText($('sp-name'), v.specialName);

    D.TOWER_ORDER.forEach((id) => {
      const el = $('tw-' + id);
      setCls(el, 'sel', v.selectedTower === id);
      setCls(el, 'poor', v.mana < D.TOWERS[id].cost);
    });
    const q = $('slot-q'), dsh = $('slot-dash');
    setH($('cd-q'), v.spCd01 * 100);
    setH($('cd-dash'), v.dashCd01 * 100);
    setCls(q, 'ready', v.spCd01 <= 0);
    setCls(dsh, 'ready', v.dashCd01 <= 0);

    const mh = $('mode-hint');
    setHidden(mh, !v.modeHint);
    if (v.modeHint) setText(mh, v.modeHint);
  };

  ui.tip = function (html, x, y) {
    const t = $('tip');
    if (!html) { t.classList.add('hidden'); return; }
    if (t._html !== html) { t._html = html; t.innerHTML = html; }
    t.classList.remove('hidden');
    const w = t.offsetWidth, h = t.offsetHeight;
    t.style.left = Math.min(innerWidth - w - 10, x + 18) + 'px';
    t.style.top = Math.min(innerHeight - h - 10, y + 18) + 'px';
  };

  /* ---------- minimap ---------- */
  const mm = $('minimap');
  const mctx = mm.getContext('2d');
  ui.minimap = function (d) {
    const W = mm.width, H = mm.height, cx = W / 2, cy = H / 2, sc = (W / 2 - 6) / d.R;
    mctx.clearRect(0, 0, W, H);
    mctx.save();
    mctx.translate(cx, cy);
    // rotate so that camera-forward is up on the minimap
    mctx.rotate(d.yaw);
    function pt(x, z) { return [x * sc, z * sc]; }
    mctx.beginPath(); mctx.arc(0, 0, d.R * sc, 0, Math.PI * 2);
    mctx.fillStyle = 'rgba(70,60,100,0.55)'; mctx.fill();
    mctx.strokeStyle = 'rgba(255,255,255,0.3)'; mctx.lineWidth = 1.5; mctx.stroke();
    d.portals.forEach((p) => {
      const [x, z] = pt(p.x, p.z);
      mctx.beginPath(); mctx.arc(x, z, 6, 0, 7);
      mctx.fillStyle = p.active ? '#c58bff' : 'rgba(150,110,200,0.4)'; mctx.fill();
    });
    const [kx, kz] = pt(0, 0);
    mctx.beginPath(); mctx.arc(kx, kz, 5, 0, 7); mctx.fillStyle = '#62e6ff'; mctx.fill();
    d.towers.forEach((t) => {
      const [x, z] = pt(t.x, t.z);
      mctx.fillStyle = t.wall ? '#c89a5a' : '#ffd23f';
      mctx.fillRect(x - 2, z - 2, 4, 4);
    });
    d.enemies.forEach((e) => {
      const [x, z] = pt(e.x, e.z);
      mctx.beginPath(); mctx.arc(x, z, e.boss ? 5 : 2.4, 0, 7);
      mctx.fillStyle = e.boss ? '#ff7a2a' : '#ff4d4d'; mctx.fill();
    });
    const [px, pz] = pt(d.px, d.pz);
    mctx.beginPath(); mctx.arc(px, pz, 4, 0, 7); mctx.fillStyle = '#fff'; mctx.fill();
    mctx.strokeStyle = '#7af08f'; mctx.lineWidth = 2; mctx.stroke();
    mctx.restore();
    // "forward" notch
    mctx.fillStyle = '#fff';
    mctx.beginPath(); mctx.moveTo(cx, 2); mctx.lineTo(cx - 5, 11); mctx.lineTo(cx + 5, 11); mctx.fill();
  };

  /* ---------- inventory ---------- */
  function itemDesc(it) {
    const s = it.stat;
    const map = { dmg: '+' + s.v + '% attack damage', hp: '+' + s.v + ' max health', dr: '+' + s.v + '% damage reduction', spd: '+' + s.v + '% move speed', tower: '+' + s.v + '% tower power' };
    return map[s.k];
  }
  ui.itemDesc = itemDesc;
  ui.renderInv = function (v) {
    const R = D.RARITY;
    const statRow = (key, name, desc, val) =>
      '<div class="stat-row"><div class="lbl"><b>' + name + '</b> ' + val + '<small>' + desc + '</small></div>' +
      '<button class="btn tiny" data-spend="' + key + '"' + (v.sp > 0 ? '' : ' disabled') + '>+1</button></div>';
    $('inv-stats').innerHTML =
      '<h3>' + v.emoji + ' ' + v.name + ' — Level ' + v.level + '</h3>' +
      '<div class="stat-row"><div class="lbl"><b>Skill points: ' + v.sp + '</b><small>Earn 2 per level-up. Spend wisely, or don\'t.</small></div></div>' +
      statRow('vit', '❤️ Vitality', '+18 max health per point', v.stats.vit) +
      statRow('might', '💪 Might', '+8% attack damage per point', v.stats.might) +
      statRow('swift', '👟 Swiftness', '+3.5% move speed per point', v.stats.swift) +
      statRow('tink', '🔧 Tinkering', '+8% tower damage and +10% tower health per point', v.stats.tink) +
      '<div class="sum">' + v.summary.join('<br>') + '</div>';

    let eq = '<h3>Equipped</h3>';
    D.SLOTS.forEach((slot) => {
      const it = v.gear[slot];
      if (it) {
        eq += '<div class="item-row"><span class="ico">' + D.SLOT_ICON[slot] + '</span><div class="meta"><div class="nm" style="color:' + R[it.rarity].color + '">' + it.name + '</div><small>' + R[it.rarity].name + ' ' + D.SLOT_LABEL[slot] + ' · ' + itemDesc(it) + '</small></div></div>';
      } else {
        eq += '<div class="item-row empty"><span class="ico">' + D.SLOT_ICON[slot] + '</span><div class="meta"><div class="nm">Empty ' + D.SLOT_LABEL[slot] + ' slot</div><small>Go kill something.</small></div></div>';
      }
    });
    $('inv-equip').innerHTML = eq;

    let bag = '<h3>Bag (' + v.bag.length + '/' + D.MAX_BAG + ')</h3>';
    if (!v.bag.length) bag += '<div class="item-row empty"><div class="meta">Your bag is empty. Disappointing, but honest.</div></div>';
    v.bag.forEach((it, i) => {
      const cur = v.gear[it.slot];
      const better = !cur || it.power > cur.power;
      bag += '<div class="item-row"><span class="ico">' + D.SLOT_ICON[it.slot] + '</span><div class="meta"><div class="nm" style="color:' + R[it.rarity].color + '">' + it.name + '</div><small>' + D.SLOT_LABEL[it.slot] + ' · ' + itemDesc(it) + (better ? ' <span style="color:#7af08f">▲ upgrade</span>' : '') + '</small></div>' +
        '<button class="btn tiny" data-equip="' + i + '">Equip</button><button class="btn tiny" data-sell="' + i + '">Sell 💎' + it.sell + '</button></div>';
    });
    $('inv-bag').innerHTML = bag;
  };

  /* ---------- end screen ---------- */
  ui.renderEnd = function (win, quip, stats, canEndless) {
    $('end-title').textContent = win ? 'YOU WIN! (TECHNICALLY)' : 'GAME OVER';
    $('end-title').style.color = win ? '#ffd23f' : '#ff7a7a';
    $('end-quip').textContent = '“' + quip + '”';
    $('end-stats').innerHTML = stats.map((s) => '<div class="stat-row"><div class="lbl">' + s[0] + '</div><b>' + s[1] + '</b></div>').join('');
    $('btn-endless').classList.toggle('hidden', !canEndless);
  };

  /* ---------- wire up static buttons ---------- */
  // buttons give up keyboard focus right after a click, otherwise Space/Enter (dash / start wave)
  // would re-press whichever HUD button was clicked last
  function wire(id, fn) { $(id).addEventListener('click', (e) => { e.stopPropagation(); DD.audio.init(); e.currentTarget.blur(); fn(); }); }
  wire('btn-play', () => ui.h.play());
  wire('btn-resume', () => ui.h.resume());
  wire('btn-quit', () => ui.h.quit());
  wire('btn-again', () => ui.h.again());
  wire('btn-endless', () => ui.h.endless());
  wire('btn-menu', () => ui.h.menu());
  wire('btn-start-wave', () => ui.h.startWave());
  wire('btn-inv', () => ui.h.openInv());
  wire('btn-inv-close', () => ui.h.closeInv());
  wire('btn-mute', () => ui.h.mute());
  wire('btn-pause', () => ui.h.pause());
  $('inv').addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    t.blur();
    if (t.dataset.spend) ui.h.spend(t.dataset.spend);
    else if (t.dataset.equip !== undefined) ui.h.equip(+t.dataset.equip);
    else if (t.dataset.sell !== undefined) ui.h.sellBag(+t.dataset.sell);
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // the bottom bar scales down on narrow windows so it never collides with the hero / mana panels
  function fitHud() {
    const side = window.innerWidth < 900 ? 220 : 300;
    const s = Math.max(0.5, Math.min(1, (window.innerWidth - 2 * side) / 660));
    document.documentElement.style.setProperty('--hud-s', s.toFixed(3));
  }
  window.addEventListener('resize', fitHud);
  fitHud();

  DD.ui = ui;
})();
