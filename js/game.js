/* =====================================================================
   DUNGEON PRETENDERS - core game
   Renderer, input, player, towers, enemies, waves, loot, main loop.
   ===================================================================== */
(function () {
  'use strict';
  const DD = window.DD;
  const D = DD.data, U = DD.util, M = DD.models, A = DD.audio, ui = DD.ui;
  const T = THREE;
  const PI = Math.PI;
  const { rand, pick, clamp } = U;
  const ARENA = D.ARENA_R;
  const CR = D.CRYSTAL;
  const $ = (id) => document.getElementById(id);

  /* ============================== renderer / scene ============================== */
  const canvas = $('c');
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    document.body.innerHTML = '<div style="padding:40px;font:20px sans-serif;color:#fff;text-align:center">😢 Your browser could not start WebGL, which this game needs.<br><small>Try a recent Chrome, Firefox, Edge or Safari with hardware acceleration enabled.</small></div>';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  scene.background = new T.Color(0x241a3d);
  scene.fog = new T.Fog(0x241a3d, 62, 135);
  const camera = new T.PerspectiveCamera(48, 1, 0.5, 300);

  scene.add(new T.HemisphereLight(0xcfd8ff, 0x4a3b5a, 0.85));
  const sun = new T.DirectionalLight(0xfff0d8, 0.85);
  sun.position.set(26, 52, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -52; sc.right = 52; sc.top = 52; sc.bottom = -52; sc.near = 5; sc.far = 130;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  const world = M.buildWorld(scene);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ============================== helpers ============================== */
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const lerpAngle = (a, b, t) => a + angDiff(b, a) * t;
  const hyp = Math.hypot;
  const _v = new T.Vector3();

  function worldText(x, y, z, text, cls) {
    _v.set(x, y, z).project(camera);
    if (_v.z > 1) return;
    ui.floatAt((_v.x * 0.5 + 0.5) * window.innerWidth, (-_v.y * 0.5 + 0.5) * window.innerHeight, text, cls);
  }

  /* ============================== particles ============================== */
  const MAXP = 800;
  const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 3), pBase = new Float32Array(MAXP * 3);
  const pVel = new Float32Array(MAXP * 3), pLife = new Float32Array(MAXP), pMax = new Float32Array(MAXP);
  for (let i = 0; i < MAXP; i++) pPos[i * 3 + 1] = -999;
  const pGeo = new T.BufferGeometry();
  pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new T.BufferAttribute(pCol, 3));
  const points = new T.Points(pGeo, new T.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
  points.frustumCulled = false;
  scene.add(points);
  let pHead = 0;
  const _col = new T.Color();
  function burst(x, y, z, color, n, speed, life, upward) {
    _col.setHex(color);
    for (let k = 0; k < n; k++) {
      const i = pHead; pHead = (pHead + 1) % MAXP;
      const a = Math.random() * PI * 2, s = speed * (0.25 + Math.random() * 0.75);
      pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
      pVel[i * 3] = Math.cos(a) * s; pVel[i * 3 + 1] = (0.15 + Math.random() * 0.85) * speed * (upward == null ? 0.9 : upward); pVel[i * 3 + 2] = Math.sin(a) * s;
      pBase[i * 3] = _col.r; pBase[i * 3 + 1] = _col.g; pBase[i * 3 + 2] = _col.b;
      pLife[i] = pMax[i] = life * (0.6 + Math.random() * 0.4);
    }
  }
  function updateParticles(dt) {
    for (let i = 0; i < MAXP; i++) {
      if (pLife[i] <= 0) continue;
      pLife[i] -= dt;
      if (pLife[i] <= 0) { pPos[i * 3 + 1] = -999; continue; }
      pVel[i * 3 + 1] -= 16 * dt;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      if (pPos[i * 3 + 1] < 0.05) { pPos[i * 3 + 1] = 0.05; pVel[i * 3 + 1] *= -0.3; }
      const f = pLife[i] / pMax[i];
      pCol[i * 3] = pBase[i * 3] * f; pCol[i * 3 + 1] = pBase[i * 3 + 1] * f; pCol[i * 3 + 2] = pBase[i * 3 + 2] * f;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  }

  /* ============================== timed visual effects ============================== */
  const fxList = [];
  function addFx(obj, life, upd, onEnd) {
    scene.add(obj);
    fxList.push({ obj, t: 0, life, upd, onEnd });
  }
  function updateFx(dt) {
    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.life);
      if (f.upd) f.upd(f.obj, k, dt);
      if (f.t >= f.life) {
        scene.remove(f.obj);
        f.obj.traverse((c) => {
          if (c.userData.ownGeo && c.geometry) c.geometry.dispose();
          if (c.userData.ownMat && c.material) c.material.dispose();
        });
        if (f.onEnd) f.onEnd();
        fxList.splice(i, 1);
      }
    }
  }
  const RING_GEO = new T.RingGeometry(0.86, 1, 44);
  function ringFx(x, z, radius, color, life, y0) {
    const mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false });
    const m = new T.Mesh(RING_GEO, mat);
    m.rotation.x = -PI / 2; m.position.set(x, y0 || 0.12, z); m.userData.ownMat = true;
    addFx(m, life || 0.4, (o, k) => { const s = radius * (0.12 + 0.88 * k); o.scale.set(s, s, s); o.material.opacity = 0.85 * (1 - k); });
  }
  const sectorCache = {};
  function slashFx(x, z, yaw, range, arc, color) {
    const key = range.toFixed(1) + '_' + arc.toFixed(2);
    const geo = sectorCache[key] || (sectorCache[key] = new T.RingGeometry(range * 0.25, range, 20, 1, -arc / 2, arc));
    const mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: T.DoubleSide, depthWrite: false });
    const m = new T.Mesh(geo, mat);
    m.rotation.order = 'YXZ'; m.rotation.x = -PI / 2; m.rotation.y = yaw - PI / 2;
    m.position.set(x, 0.9, z); m.userData.ownMat = true;
    addFx(m, 0.2, (o, k) => { o.material.opacity = 0.7 * (1 - k); o.scale.setScalar(0.85 + 0.2 * k); });
  }
  function lightningFx(pts, color) {
    const verts = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], seg = 6;
      for (let s = 0; s < seg; s++) {
        const t = s / seg, j = s === 0 ? 0 : 0.35;
        verts.push(a.x + (b.x - a.x) * t + (Math.random() - 0.5) * j, a.y + (b.y - a.y) * t + (Math.random() - 0.5) * j, a.z + (b.z - a.z) * t + (Math.random() - 0.5) * j);
      }
    }
    const last = pts[pts.length - 1];
    verts.push(last.x, last.y, last.z);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
    const line = new T.Line(geo, new T.LineBasicMaterial({ color: color || 0x9af0ff, transparent: true }));
    line.userData.ownGeo = line.userData.ownMat = true;
    addFx(line, 0.16, (o, k) => { o.material.opacity = 1 - k; });
  }

  /* ============================== state ============================== */
  const S = {
    mode: 'title', phase: 'build', wave: 0, buildTimer: 0, time: 0,
    crystalHp: CR.hp, crystalFlash: 0, crystalWarned: false,
    selectedTower: null, classId: 'squire', endless: false, wonOnce: false,
    spawnQueue: [], spawnTimer: 0, activePortals: [], vacuum: 0, stragglerT: 0,
    shake: 0, hover: null, stats: { kills: 0, damage: 0, built: 0, loot: 0, deaths: 0 },
    panel: false, lastPhaseMusic: '', msgCooldown: 0,
  };
  let enemies = [], towers = [], projectiles = [], eprojs = [], pickups = [];
  let uid = 1;

  /* ============================== camera / input ============================== */
  const cam = { yaw: 0, pitch: 0.92, dist: 17, tx: 0, tz: 6, shakeX: 0, shakeY: 0 };
  const keys = {};
  // taps/clicks are latched until the next simulation step, so a press that begins and ends
  // between two frames (low FPS) is never lost
  const tapped = {};
  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, left: false, drag: false, clicked: false };
  const aim = { x: 0, z: 0 };
  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  const ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const _hit = new T.Vector3();

  function updateAim() {
    ndc.set((mouse.x / window.innerWidth) * 2 - 1, -(mouse.y / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(ground, _hit)) { aim.x = _hit.x; aim.z = _hit.z; }
  }

  function updateCamera(dt) {
    if (S.mode === 'title') {
      const t = performance.now() / 1000 * 0.12;
      const r = 20;
      camera.position.set(Math.sin(t) * r, 9, Math.cos(t) * r + 2);
      camera.lookAt(0, 2.4, 3);
      return;
    }
    const k = Math.min(1, dt * 7);
    if (!cam.lock) { // (lock is a debugging aid for screenshots/tests)
      cam.tx += (P.x - cam.tx) * k;
      cam.tz += (P.z - cam.tz) * k;
    }
    S.shake = Math.max(0, S.shake - dt * 2.4);
    const sh = S.shake * S.shake * 0.9;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    camera.position.set(
      cam.tx + Math.sin(cam.yaw) * cp * cam.dist + (Math.random() - 0.5) * sh,
      sp * cam.dist + 0.8 + (Math.random() - 0.5) * sh,
      cam.tz + Math.cos(cam.yaw) * cp * cam.dist + (Math.random() - 0.5) * sh
    );
    camera.lookAt(cam.tx, 0.9, cam.tz);
  }

  /* ============================== hero / player ============================== */
  const P = {
    x: 0, z: 7, vx: 0, vz: 0, yaw: PI, aimYaw: PI, alive: true, respawn: 0,
    hp: 1, maxHp: 1, level: 1, xp: 0, sp: 0, mana: 0,
    stats: { vit: 0, might: 0, swift: 0, tink: 0 },
    gear: { weapon: null, hat: null, armor: null, boots: null, trinket: null }, bag: [],
    atkCd: 0, spCd: 0, dashCd: 0, dashT: 0, dashX: 0, dashZ: 1, invuln: 0, hitFlash: 0, atkAnim: 0,
    spinT: 0, spinTick: 0, walk: 0, model: null, cls: null,
    dmgMult: 1, speed: 6, dr: 0, towerDmg: 1, towerHp: 1,
  };

  function setHeroModel(classId) {
    if (P.model) scene.remove(P.model.root);
    P.cls = D.CLASSES[classId];
    P.model = M.hero(classId);
    P.model.root.position.set(P.x, 0, P.z);
    scene.add(P.model.root);
  }

  const gv = (slot, k) => (P.gear[slot] && P.gear[slot].stat.k === k ? P.gear[slot].stat.v : 0);
  function recalc() {
    const C = P.cls, s = P.stats, old = P.maxHp;
    P.maxHp = Math.round(C.hp + (P.level - 1) * 12 + s.vit * 18 + gv('hat', 'hp'));
    if (P.maxHp > old && P.alive) P.hp = Math.min(P.maxHp, P.hp + (P.maxHp - old));
    P.hp = Math.min(P.hp, P.maxHp);
    P.dmgMult = (1 + s.might * 0.08 + (P.level - 1) * 0.03) * (1 + gv('weapon', 'dmg') / 100);
    P.speed = C.speed * (1 + s.swift * 0.035 + gv('boots', 'spd') / 100);
    P.dr = Math.min(0.6, gv('armor', 'dr') / 100);
    P.towerDmg = 1 + s.tink * 0.08 + gv('trinket', 'tower') / 100;
    P.towerHp = 1 + s.tink * 0.10 + gv('trinket', 'tower') / 100;
    towers.forEach(refreshTower);
  }

  function resetPlayer(classId) {
    setHeroModel(classId);
    P.x = 0; P.z = 7; P.vx = P.vz = 0; P.yaw = P.aimYaw = PI; P.alive = true; P.respawn = 0;
    P.level = 1; P.xp = 0; P.sp = 0; P.mana = D.START_MANA;
    P.stats = { vit: 0, might: 0, swift: 0, tink: 0 };
    P.gear = { weapon: null, hat: null, armor: null, boots: null, trinket: null };
    P.bag = [];
    P.atkCd = P.spCd = P.dashCd = P.dashT = P.invuln = P.hitFlash = P.atkAnim = P.spinT = 0;
    P.maxHp = 1; P.hp = 1;
    recalc();
    P.hp = P.maxHp;
    cam.tx = P.x; cam.tz = P.z; cam.yaw = 0;
  }

  const xpNeed = (l) => Math.floor(45 * Math.pow(l, 1.45));
  function gainXp(n) {
    P.xp += n;
    let leveled = false;
    while (P.level < D.MAX_LEVEL && P.xp >= xpNeed(P.level)) {
      P.xp -= xpNeed(P.level);
      P.level++; P.sp += 2; leveled = true;
    }
    if (P.level >= D.MAX_LEVEL) P.xp = 0;
    if (leveled) {
      recalc();
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.4);
      A.sfx.levelup();
      ringFx(P.x, P.z, 5, 0xffd23f, 0.7);
      burst(P.x, 1, P.z, 0xffd23f, 40, 8, 0.9);
      worldText(P.x, 3, P.z, 'LEVEL UP!', 'big');
      ui.toast('⭐ <b>Level ' + P.level + '!</b> +2 skill points — press <kbd>I</kbd>', '#ffd23f');
    }
  }

  function heroDamage(base) {
    const crit = Math.random() < 0.1;
    return { v: base * P.dmgMult * (0.92 + Math.random() * 0.16) * (crit ? 1.8 : 1), crit };
  }

  function damagePlayer(amt) {
    if (!P.alive || P.invuln > 0 || S.mode !== 'playing') return;
    amt = Math.max(1, amt * (1 - P.dr));
    P.hp -= amt;
    P.invuln = 0.12;
    P.hitFlash = 0.18;
    S.shake = Math.min(1, S.shake + 0.12);
    ui.hurtFlash();
    A.sfx.hurt();
    worldText(P.x, 2.6, P.z, '-' + Math.ceil(amt), 'hurt');
    if (P.hp <= 0) killPlayer();
  }
  function killPlayer() {
    P.hp = 0; P.alive = false; P.respawn = 6; P.spinT = 0; P.dashT = 0;
    S.stats.deaths++;
    A.sfx.die();
    burst(P.x, 1, P.z, 0xff6a6a, 40, 7, 0.9);
    ui.quip(pick(D.QUIPS.death));
  }
  function respawn() {
    P.alive = true; P.hp = P.maxHp; P.x = 0; P.z = 6.5; P.vx = P.vz = 0; P.invuln = 2.2;
    P.model.pivot.rotation.x = 0;
    ringFx(P.x, P.z, 4, 0x7af08f, 0.6);
    A.sfx.levelup();
  }

  /* ---- collisions (circles) ---- */
  function pushOut(o, r, ignoreCrystal) {
    const d0 = hyp(o.x, o.z), lim = ARENA - 1.2 - r;
    if (d0 > lim) { o.x *= lim / d0; o.z *= lim / d0; }
    if (!ignoreCrystal) {
      const d = hyp(o.x, o.z), mn = CR.r + r;
      if (d < mn) { const k = mn / (d || 0.001); o.x = (o.x || 0.001) * k; o.z *= k; }
    }
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];
      if (!t.def.blocks || t.dead) continue;
      const dx = o.x - t.x, dz = o.z - t.z, mn = t.r + r, d2 = dx * dx + dz * dz;
      if (d2 < mn * mn) {
        const d = Math.sqrt(d2) || 0.001;
        o.x = t.x + (dx / d) * mn; o.z = t.z + (dz / d) * mn;
      }
    }
  }

  /* ---- hero animation ---- */
  function animateHero(dt) {
    const m = P.model, sp = hyp(P.vx, P.vz);
    const moving = P.alive && sp > 0.6;
    if (moving) P.walk += dt * (6 + sp * 0.9);
    const w = Math.sin(P.walk) * (moving ? 0.8 : 0);
    m.legL.rotation.x = w; m.legR.rotation.x = -w;
    m.root.position.set(P.x, 0, P.z);
    m.body.position.y = moving ? Math.abs(Math.sin(P.walk)) * 0.08 : Math.sin(S.time * 2.2) * 0.012;
    if (P.spinT > 0) m.pivot.rotation.y += dt * 24;
    else m.pivot.rotation.y = P.yaw;
    if (!P.alive) {
      m.pivot.rotation.x += (-PI / 2 - m.pivot.rotation.x) * Math.min(1, dt * 8);
      return;
    }
    m.pivot.rotation.x = 0;
    const a = P.atkAnim, C = P.cls;
    const rest = -0.5;
    if (C.attack === 'melee') {
      const t = 1 - a;
      // resting pose holds the sword up and ready; the swing chops from behind to the front
      m.armR.rotation.x = a > 0 ? -2.7 + 2.4 * Math.min(1, t * 1.6) : -1.3 + (moving ? -w * 0.25 : 0);
      m.armL.rotation.x = moving ? w * 0.6 : 0;
      m.body.rotation.x = a > 0 ? 0.25 * Math.sin(t * PI) : 0;
    } else {
      m.armR.rotation.x = a > 0 ? -1.3 - a * 0.5 : rest + (moving ? -w * 0.5 : 0);
      if (C.id !== 'huntress') m.armL.rotation.x = moving ? w * 0.6 : 0;
      else m.armL.rotation.x = m.armLRest;
      m.body.rotation.x = a > 0 ? -0.12 * a : 0;
    }
    if (P.dashT > 0) m.body.rotation.x = 0.55;
    // damage flash
    const f = P.hitFlash > 0 ? 0.55 : 0;
    if (m._f !== f) { m._f = f; m.mats.forEach((mt) => mt.emissive.setScalar(f)); }
    if (P.invuln > 0.5 && P.alive) m.root.visible = Math.floor(S.time * 14) % 2 === 0;
    else m.root.visible = true;
    if (m.orb) m.orb.scale.setScalar(1 + Math.sin(S.time * 6) * 0.15 + a * 0.6);
  }

  /* ---- attack & specials ---- */
  function aimDir() {
    const a = P.aimYaw;
    return { x: Math.sin(a), z: Math.cos(a) };
  }

  function heroAttack() {
    const C = P.cls, d = aimDir();
    P.atkCd = C.atkCd;
    P.atkAnim = 1;
    P.yaw = P.aimYaw;
    if (C.attack === 'melee') {
      A.sfx.swing();
      slashFx(P.x, P.z, P.aimYaw, C.range, C.arc, 0xe8f0ff);
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.dead) continue;
        const dx = e.x - P.x, dz = e.z - P.z, dist = hyp(dx, dz);
        if (dist > C.range + e.r) continue;
        const ang = Math.abs(angDiff(Math.atan2(dx, dz), P.aimYaw));
        if (ang > C.arc / 2 && dist > e.r + 0.9) continue;
        const h = heroDamage(C.dmg);
        damageEnemy(e, h.v, { crit: h.crit, kx: (dx / (dist || 1)), kz: (dz / (dist || 1)), kb: 4.5 });
      }
    } else if (C.attack === 'bolt') {
      A.sfx.bolt();
      spawnProjectile({ kind: 'bolt', x: P.x + d.x * 0.9, z: P.z + d.z * 0.9, y: 1.4, dx: d.x, dz: d.z, speed: 25, r: 0.4, dmg: C.dmg, hero: true, splash: 2.0, life: C.range / 25, color: 0xff9a2a });
    } else if (C.attack === 'arrow') {
      A.sfx.arrow();
      spawnProjectile({ kind: 'arrow', x: P.x + d.x * 0.9, z: P.z + d.z * 0.9, y: 1.3, dx: d.x, dz: d.z, speed: 44, r: 0.28, dmg: C.dmg, hero: true, pierce: 2, life: C.range / 44, color: 0xe8d8b0 });
    } else if (C.attack === 'palm') {
      A.sfx.palm();
      spawnProjectile({ kind: 'palm', x: P.x + d.x * 1.0, z: P.z + d.z * 1.0, y: 1.2, dx: d.x, dz: d.z, speed: 16, r: 0.75, dmg: C.dmg, hero: true, pierce: 3, kb: 7, life: C.range / 16, color: 0xffe08a });
    }
  }

  function heroSpecial() {
    const C = P.cls, d = aimDir();
    P.spCd = C.special.cd;
    A.sfx.special();
    P.atkAnim = 1;
    if (C.id === 'squire') {
      P.spinT = 1.0; P.spinTick = 0;
      ringFx(P.x, P.z, 5, 0xffffff, 0.5);
    } else if (C.id === 'wizard') {
      let tx = aim.x, tz = aim.z;
      const dd = hyp(tx - P.x, tz - P.z);
      if (dd > 22) { tx = P.x + ((tx - P.x) / dd) * 22; tz = P.z + ((tz - P.z) / dd) * 22; }
      meteor(tx, tz, C.dmg * 6.5, 5.6);
    } else if (C.id === 'huntress') {
      for (let i = 0; i < 11; i++) {
        const a = P.aimYaw + (i - 5) * 0.115;
        spawnProjectile({ kind: 'arrow', x: P.x + Math.sin(a) * 0.9, z: P.z + Math.cos(a) * 0.9, y: 1.3, dx: Math.sin(a), dz: Math.cos(a), speed: 40, r: 0.3, dmg: C.dmg * 0.9, hero: true, pierce: 2, life: 0.8, color: 0xb5ff9a });
      }
      P.dashCd = 0; // a little treat
    } else if (C.id === 'monk') {
      const heal = P.maxHp * 0.45;
      P.hp = Math.min(P.maxHp, P.hp + heal);
      worldText(P.x, 2.8, P.z, '+' + Math.ceil(heal), 'heal');
      ringFx(P.x, P.z, 8.5, 0xff8acb, 0.7);
      ringFx(P.x, P.z, 5.5, 0xffffff, 0.45);
      burst(P.x, 1.2, P.z, 0xff8acb, 50, 9, 1.0);
      towers.forEach((t) => {
        if (t.dead || hyp(t.x - P.x, t.z - P.z) > 8.5) return;
        t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.35);
        burst(t.x, 1.5, t.z, 0xff8acb, 8, 3, 0.6);
      });
      enemies.forEach((e) => {
        if (e.dead) return;
        const dx = e.x - P.x, dz = e.z - P.z, dist = hyp(dx, dz);
        if (dist < 6) {
          e.stun = Math.max(e.stun, e.boss ? 0.5 : 1.3);
          const kk = e.boss ? 3 : 11;
          e.kx += (dx / (dist || 1)) * kk; e.kz += (dz / (dist || 1)) * kk;
        }
      });
    }
  }

  function meteor(tx, tz, dmg, radius) {
    // telegraph
    const mat = new T.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false });
    const tele = new T.Mesh(new T.RingGeometry(0.0, 1, 36), mat);
    tele.rotation.x = -PI / 2; tele.position.set(tx, 0.1, tz); tele.scale.setScalar(radius); tele.userData.ownMat = tele.userData.ownGeo = true;
    addFx(tele, 0.9, (o, k) => { o.material.opacity = 0.2 + 0.35 * Math.sin(k * 20) * Math.sin(k * 20); });
    const rock = new T.Mesh(M.G('Icosahedron', 1.1, 0), new T.MeshBasicMaterial({ color: 0xff7a2a }));
    rock.position.set(tx + 6, 40, tz - 6);
    addFx(rock, 0.9, (o, k) => { o.position.set(tx + 6 * (1 - k), 40 * (1 - k) + 0.6, tz - 6 * (1 - k)); o.rotation.x += 0.2; o.rotation.z += 0.15; }, () => {
      A.sfx.boom();
      S.shake = Math.min(1.2, S.shake + 0.8);
      ringFx(tx, tz, radius, 0xffa040, 0.5);
      ringFx(tx, tz, radius * 0.6, 0xffffff, 0.35);
      burst(tx, 0.6, tz, 0xff8a30, 70, 13, 1.1);
      burst(tx, 0.6, tz, 0xffe28a, 40, 8, 0.8);
      areaDamageEnemies(tx, tz, radius, dmg, 9, true);
    });
  }

  function areaDamageEnemies(x, z, radius, dmg, kb, isHero, falloff) {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      const dx = e.x - x, dz = e.z - z, dist = hyp(dx, dz);
      if (dist > radius + e.r) continue;
      let k = 1;
      if (falloff) k = 1 - 0.45 * clamp(dist / (radius + e.r), 0, 1);
      const h = isHero ? heroDamage(dmg) : { v: dmg, crit: false };
      damageEnemy(e, h.v * k, { crit: h.crit && isHero, kx: dx / (dist || 1), kz: dz / (dist || 1), kb: kb || 0 });
    }
  }

  function updatePlayer(dt) {
    P.atkCd = Math.max(0, P.atkCd - dt); P.spCd = Math.max(0, P.spCd - dt); P.dashCd = Math.max(0, P.dashCd - dt);
    P.invuln = Math.max(0, P.invuln - dt); P.hitFlash = Math.max(0, P.hitFlash - dt);
    P.atkAnim = Math.max(0, P.atkAnim - dt / 0.28);

    if (!P.alive) {
      P.respawn -= dt;
      if (P.respawn <= 0) respawn();
      return;
    }
    if (S.phase === 'build') P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.03 * dt);

    // aim
    const ax = aim.x - P.x, az = aim.z - P.z;
    if (hyp(ax, az) > 0.4) P.aimYaw = Math.atan2(ax, az);
    if (P.spinT <= 0) P.yaw = lerpAngle(P.yaw, P.aimYaw, Math.min(1, dt * 20));

    // movement
    const ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    const iz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    let mx = fx * iz + rx * ix, mz = fz * iz + rz * ix;
    const ml = hyp(mx, mz);
    if (ml > 0) { mx /= ml; mz /= ml; }

    if ((keys.Space || tapped.Space) && P.dashCd <= 0 && P.dashT <= 0) {
      P.dashT = 0.18; P.dashCd = 1.5; P.invuln = Math.max(P.invuln, 0.3);
      P.dashX = ml > 0 ? mx : Math.sin(P.aimYaw); P.dashZ = ml > 0 ? mz : Math.cos(P.aimYaw);
      A.sfx.dash();
      burst(P.x, 0.3, P.z, 0xffffff, 14, 4, 0.4);
    }
    let tvx, tvz;
    if (P.dashT > 0) { P.dashT -= dt; tvx = P.dashX * 21; tvz = P.dashZ * 21; P.vx = tvx; P.vz = tvz; }
    else {
      const sp = P.speed * (P.spinT > 0 ? 0.65 : 1);
      tvx = mx * sp; tvz = mz * sp;
      const k = Math.min(1, dt * 14);
      P.vx += (tvx - P.vx) * k; P.vz += (tvz - P.vz) * k;
    }
    P.x += P.vx * dt; P.z += P.vz * dt;
    pushOut(P, 0.5);

    // spin-to-win
    if (P.spinT > 0) {
      P.spinT -= dt; P.spinTick -= dt;
      if (P.spinTick <= 0) {
        P.spinTick = 0.2;
        A.sfx.swing();
        ringFx(P.x, P.z, 4.8, 0xffffff, 0.25, 0.6);
        areaDamageEnemies(P.x, P.z, 4.6, P.cls.dmg * 1.15, 5, true);
      }
    }

    // inputs that act
    if (S.mode === 'playing' && !S.panel) {
      if ((keys.KeyQ || tapped.KeyQ) && P.spCd <= 0) heroSpecial();
      if ((mouse.left || mouse.clicked) && !S.selectedTower && P.atkCd <= 0 && P.spinT <= 0) heroAttack();
    }
  }

  /* ============================== projectiles ============================== */
  const PROJ_MATS = {};
  function projMat(color) { return PROJ_MATS[color] || (PROJ_MATS[color] = new T.MeshBasicMaterial({ color })); }
  function spawnProjectile(o) {
    let mesh;
    if (o.kind === 'arrow') {
      mesh = new T.Group();
      const shaft = new T.Mesh(M.G('Cylinder', 0.035, 0.035, 0.95, 5), projMat(o.color));
      shaft.rotation.x = PI / 2;
      const tip = new T.Mesh(M.G('Cone', 0.09, 0.22, 5), projMat(0xdddddd));
      tip.rotation.x = PI / 2; tip.position.z = 0.55;
      mesh.add(shaft); mesh.add(tip);
      mesh.rotation.y = Math.atan2(o.dx, o.dz);
    } else if (o.kind === 'palm') {
      mesh = new T.Mesh(M.G('Sphere', 0.6, 12, 10), new T.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0.55 }));
      mesh.userData.ownMat = true;
    } else if (o.kind === 'rock') {
      mesh = new T.Mesh(M.G('Sphere', 0.16, 6, 5), projMat(0x9a9aae));
    } else if (o.kind === 'meatball') {
      mesh = new T.Mesh(M.G('Sphere', 0.34, 10, 8), projMat(0xb04a2a));
    } else {
      mesh = new T.Mesh(M.G('Sphere', o.r * 0.9, 10, 8), projMat(o.color));
    }
    mesh.position.set(o.x, o.y, o.z);
    scene.add(mesh);
    const p = Object.assign({ mesh, vx: o.dx * o.speed, vz: o.dz * o.speed, hit: new Set(), pierce: o.pierce || 0, life: o.life || 1.5, dead: false }, o);
    projectiles.push(p);
    return p;
  }
  function removeProj(p) { p.dead = true; scene.remove(p.mesh); if (p.mesh.userData.ownMat) p.mesh.material.dispose(); }

  function projectileImpact(p) {
    if (p.kind === 'bolt') {
      A.sfx.hit();
      ringFx(p.x, p.z, p.splash, 0xffa040, 0.3, 0.3);
      burst(p.x, p.y, p.z, 0xffb040, 18, 6, 0.5);
    } else if (p.kind === 'meatball') {
      A.sfx.boom();
      ringFx(p.x, p.z, p.splash, 0xd8663a, 0.4);
      burst(p.x, 0.5, p.z, 0xc8552e, 30, 8, 0.7);
      burst(p.x, 0.5, p.z, 0xffd23f, 12, 6, 0.5);
    }
  }

  function updateProjectiles(dt) {
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      if (p.dead) continue;
      if (p.lob) {
        p.t += dt;
        const f = Math.min(1, p.t / p.T);
        p.x = p.sx + (p.tx - p.sx) * f; p.z = p.sz + (p.tz - p.sz) * f;
        p.y = 2.2 + Math.sin(f * PI) * p.h - f * 1.8;
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.rotation.x += dt * 8;
        if (f >= 1) {
          projectileImpact(p);
          areaDamageEnemies(p.tx, p.tz, p.splash, p.dmg, 6, false, true);
          removeProj(p);
        }
        continue;
      }
      p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt;
      p.mesh.position.set(p.x, p.y, p.z);
      if (p.kind === 'bolt' && Math.random() < 0.8) burst(p.x, p.y, p.z, 0xff8a2a, 1, 1.2, 0.35, 0.3);
      if (p.kind === 'palm') p.mesh.scale.setScalar(1 + Math.sin(S.time * 25) * 0.08);
      if (p.life <= 0 || hyp(p.x, p.z) > ARENA + 4) {
        if (p.splash) { projectileImpact(p); areaDamageEnemies(p.x, p.z, p.splash, p.dmg * 0.6, 3, !!p.hero, true); }
        removeProj(p); continue;
      }
      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        if (e.dead || p.hit.has(e)) continue;
        const dx = e.x - p.x, dz = e.z - p.z, rr = e.r + p.r;
        if (dx * dx + dz * dz > rr * rr) continue;
        p.hit.add(e);
        const h = p.hero ? heroDamage(p.dmg) : { v: p.dmg, crit: false };
        damageEnemy(e, h.v, { crit: h.crit, kx: p.vx / p.speed, kz: p.vz / p.speed, kb: p.kb || 0 });
        if (p.splash) {
          projectileImpact(p);
          areaDamageEnemies(p.x, p.z, p.splash, p.dmg * 0.6, 3, !!p.hero, true);
          removeProj(p);
        } else if (p.pierce-- <= 0) { removeProj(p); }
        if (p.dead) break;
      }
    }
    // hostile projectiles
    for (let i = 0; i < eprojs.length; i++) {
      const p = eprojs[i];
      if (p.dead) continue;
      p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt;
      p.mesh.position.set(p.x, p.y, p.z);
      let hit = null;
      if (P.alive && hyp(P.x - p.x, P.z - p.z) < 0.6 + p.r) hit = { kind: 'player' };
      if (!hit) {
        for (let j = 0; j < towers.length; j++) {
          const t = towers[j];
          if (!t.dead && t.def.blocks && hyp(t.x - p.x, t.z - p.z) < t.r + p.r) { hit = { kind: 'tower', ref: t }; break; }
        }
      }
      if (!hit && hyp(p.x, p.z) < CR.r + p.r) hit = { kind: 'crystal' };
      if (hit || p.life <= 0) {
        if (p.splash) {
          A.sfx.boom();
          ringFx(p.x, p.z, p.splash, 0xff7a1a, 0.4);
          burst(p.x, 0.6, p.z, 0xff8a2a, 26, 8, 0.7);
          enemyAoE(p.x, p.z, p.splash, p.dmg);
        } else if (hit) {
          burst(p.x, p.y, p.z, 0xaaaaaa, 5, 3, 0.3);
          if (hit.kind === 'player') damagePlayer(p.dmg);
          else if (hit.kind === 'tower') damageTower(hit.ref, p.dmg);
          else damageCrystal(p.dmg);
        }
        p.dead = true; scene.remove(p.mesh);
      }
    }
  }

  function enemyShot(x, z, tx, tz, dmg, speed, opts) {
    const dx = tx - x, dz = tz - z, d = hyp(dx, dz) || 1;
    const big = opts && opts.splash;
    const mesh = new T.Mesh(M.G('Sphere', big ? 0.5 : 0.16, 8, 6), projMat(big ? 0xff7a1a : 0x9a9aae));
    mesh.position.set(x, 1.3, z);
    scene.add(mesh);
    eprojs.push(Object.assign({ x, z, y: 1.3, vx: (dx / d) * speed, vz: (dz / d) * speed, dmg, life: 3, r: big ? 0.5 : 0.18, mesh, dead: false }, opts || {}));
  }

  /* damage to the player's side by enemy area attacks */
  function enemyAoE(x, z, radius, dmg) {
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];
      if (t.dead) continue;
      const d = hyp(t.x - x, t.z - z) - t.r;
      if (d < radius) damageTower(t, dmg * (1 - 0.4 * clamp(d / radius, 0, 1)));
    }
    if (P.alive && hyp(P.x - x, P.z - z) - 0.5 < radius) damagePlayer(dmg * 0.8);
    if (hyp(x, z) - CR.r < radius) damageCrystal(dmg * 0.6);
  }

  /* ============================== towers ============================== */
  function bonus(stat, id) { const b = P.cls.bonus; return b.tower === id && b.stat === stat ? b.mult : 1; }
  function tstats(t) {
    const d = t.def, lv = t.lv, lvD = 1 + 0.45 * (lv - 1);
    return {
      dmg: (d.dmg || 0) * lvD * P.towerDmg * bonus('dmg', d.id),
      range: (d.range || 0) + 0.7 * (lv - 1),
      rate: (d.rate || 0) * (1 + 0.10 * (lv - 1)),
      maxHp: d.hp * (1 + 0.6 * (lv - 1)) * P.towerHp * bonus('hp', d.id),
      radius: (d.radius || 0) * (1 + 0.06 * (lv - 1)) * (bonus('heal', d.id) > 1 ? 1.25 : 1),
      heal: (d.heal || 0) * (1 + 0.25 * (lv - 1)) * bonus('heal', d.id),
      stun: (d.stun || 0) * (1 + 0.1 * (lv - 1)) * (bonus('dmg', d.id) > 1 ? 1.3 : 1),
    };
  }
  function refreshTower(t) {
    const s = tstats(t);
    const ratio = t.maxHp ? t.hp / t.maxHp : 1;
    t.maxHp = s.maxHp;
    t.hp = Math.min(t.maxHp, ratio * t.maxHp);
    const sc2 = 1 + 0.07 * (t.lv - 1);
    t.model.body.scale.setScalar(sc2);
    t.model.setLevel(t.lv, t.model.height * sc2 + 0.55);
    t.model.bar.group.position.y = t.model.height * sc2 + 0.95;
  }

  const upgradeCost = (t) => Math.round(t.def.cost * 0.75 * t.lv);
  const sellValue = (t) => Math.round(t.invest * 0.6);
  const repairCost = (t) => Math.ceil((1 - t.hp / t.maxHp) * t.def.cost * 0.5);

  function canPlace(typeId, x, z) {
    const d = D.TOWERS[typeId];
    if (P.mana < d.cost) return { ok: false, why: 'Not enough mana' };
    if (towers.length >= D.MAX_TOWERS) return { ok: false, why: 'Too many towers' };
    if (hyp(x, z) > ARENA - 2.6) return { ok: false, why: 'Too close to the wall' };
    if (hyp(x, z) < CR.r + d.r + 1.0) return { ok: false, why: 'Too close to the crystal' };
    for (let i = 0; i < world.portals.length; i++) {
      const p = world.portals[i];
      if (hyp(x - p.pos.x, z - p.pos.z) < 5.5) return { ok: false, why: 'Too close to a portal' };
    }
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];
      if (t.dead) continue;
      const dist = hyp(x - t.x, z - t.z);
      const need = (t.def.blocks && d.blocks) ? t.r + d.r - 0.15 : 1.5;
      if (dist < need) return { ok: false, why: 'Something is in the way' };
    }
    if (P.alive && d.blocks && hyp(x - P.x, z - P.z) < d.r + 0.4) return { ok: false, why: 'You are standing there' };
    return { ok: true };
  }

  function placeTower(typeId, x, z) {
    const d = D.TOWERS[typeId];
    const yaw = Math.atan2(-x, -z);
    const model = M.tower(typeId, yaw);
    model.root.position.set(x, 0, z);
    scene.add(model.root);
    const t = { id: uid++, def: d, x, z, r: d.r, lv: 1, hp: 1, maxHp: 1, model, cd: rand(0, 0.5), invest: d.cost, dead: false, flash: 0, age: 0, trapCd: 0, headYaw: yaw, spawnAnim: 0 };
    t.maxHp = tstats(t).maxHp; t.hp = t.maxHp;
    towers.push(t);
    P.mana -= d.cost;
    refreshTower(t);
    S.stats.built++;
    model.root.scale.y = 0.2;
    t.spawnAnim = 1;
    A.sfx.place();
    burst(x, 0.3, z, 0xffffff, 12, 4, 0.5);
    return t;
  }

  function damageTower(t, amt) {
    if (t.dead) return;
    t.hp -= amt; t.flash = 0.12;
    if (t.hp <= 0) destroyTower(t);
  }
  function destroyTower(t) {
    t.dead = true;
    scene.remove(t.model.root);
    A.sfx.boom();
    burst(t.x, 1, t.z, 0xc89a5a, 26, 8, 0.8);
    burst(t.x, 1, t.z, 0xffffff, 10, 5, 0.5);
    if (S.msgCooldown <= 0) { ui.toast('💥 Your <b>' + t.def.name + '</b> has been destroyed. It will be missed. Mostly by you.', '#ff7a7a'); S.msgCooldown = 1.5; }
  }

  function nearestEnemy(x, z, range, filter, minRange) {
    let best = null, bd = range * range;
    const mn2 = (minRange || 0) * (minRange || 0);
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead || (filter && !filter(e))) continue;
      const dx = e.x - x, dz = e.z - z, d2 = dx * dx + dz * dz;
      if (d2 < bd && d2 >= mn2) { bd = d2; best = e; }
    }
    return best;
  }

  function updateTowers(dt) {
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];
      if (t.dead) continue;
      t.age += dt;
      t.flash = Math.max(0, t.flash - dt);
      const m = t.model;
      if (t.spawnAnim > 0) { t.spawnAnim = Math.max(0, t.spawnAnim - dt * 5); m.root.scale.y = 1 - t.spawnAnim * 0.8; }
      const s = tstats(t), id = t.def.id;
      t.cd -= dt;

      if (id === 'sling' || id === 'zap' || id === 'mortar') {
        const tgt = nearestEnemy(t.x, t.z, s.range, id === 'mortar' ? (e) => !e.def.flying : null, id === 'mortar' ? t.def.minRange : 0);
        if (tgt) {
          const ang = Math.atan2(tgt.x - t.x, tgt.z - t.z);
          if (m.head) { t.headYaw = lerpAngle(t.headYaw, ang, Math.min(1, dt * 12)); m.head.rotation.y = t.headYaw; }
          if (t.cd <= 0) {
            t.cd = 1 / s.rate;
            if (id === 'sling') {
              A.sfx.sling();
              const d = hyp(tgt.x - t.x, tgt.z - t.z) || 1;
              const lead = d / 30;
              const tx = tgt.x + (tgt.vx || 0) * lead, tz = tgt.z + (tgt.vz || 0) * lead;
              const dd = hyp(tx - t.x, tz - t.z) || 1;
              spawnProjectile({ kind: 'rock', x: t.x, z: t.z, y: 2.4 * (1 + 0.07 * (t.lv - 1)), dx: (tx - t.x) / dd, dz: (tz - t.z) / dd, speed: 30, r: 0.3, dmg: s.dmg, life: 1.2 });
              m.body.position.z = -0.08;
            } else if (id === 'mortar') {
              A.sfx.lob();
              const d = hyp(tgt.x - t.x, tgt.z - t.z) || 1;
              const Tt = clamp(d / 13, 0.7, 2.0);
              const tx = tgt.x + (tgt.vx || 0) * Tt, tz = tgt.z + (tgt.vz || 0) * Tt;
              projectiles.push({ kind: 'meatball', lob: true, sx: t.x, sz: t.z, tx, tz, t: 0, T: Tt, h: 5 + d * 0.15, dmg: s.dmg, splash: t.def.splash + 0.15 * (t.lv - 1), x: t.x, z: t.z, y: 2, mesh: (() => { const mm = new T.Mesh(M.G('Sphere', 0.34, 10, 8), projMat(0xb04a2a)); mm.position.set(t.x, 2, t.z); scene.add(mm); return mm; })(), dead: false, hit: new Set(), vx: 0, vz: 0, speed: 1, r: 0.3 });
              burst(t.x + Math.sin(t.headYaw) * 1.2, 2, t.z + Math.cos(t.headYaw) * 1.2, 0xffd23f, 8, 3, 0.4);
            } else { // zap
              A.sfx.zap();
              const hits = [tgt];
              let last = tgt;
              for (let c = 1; c < t.def.chain + (t.lv > 3 ? 1 : 0); c++) {
                const nx = nearestEnemy(last.x, last.z, 5, (e) => !hits.includes(e));
                if (!nx) break;
                hits.push(nx); last = nx;
              }
              const pts = [new T.Vector3(t.x, 2.3 * (1 + 0.07 * (t.lv - 1)), t.z)];
              hits.forEach((e, k) => {
                pts.push(new T.Vector3(e.x, e.def.flying ? 3 : 1.1, e.z));
                damageEnemy(e, s.dmg * Math.pow(0.82, k), { kb: 0 });
              });
              lightningFx(pts, 0x9af0ff);
              burst(t.x, 2.3, t.z, 0x7ae8ff, 6, 3, 0.3);
            }
          }
        }
        m.body.position.z += (0 - m.body.position.z) * Math.min(1, dt * 10);
        if (id === 'zap' && m.top) m.top.scale.setScalar(1 + Math.sin(t.age * 8) * 0.15);
      } else if (id === 'trap') {
        t.trapCd -= dt;
        const armed = t.trapCd <= 0;
        m.peel.scale.y += ((armed ? 1 : 0.25) - m.peel.scale.y) * Math.min(1, dt * 8);
        if (armed) {
          for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            if (e.dead || e.def.flying) continue;
            if (hyp(e.x - t.x, e.z - t.z) < t.def.trigger + e.r * 0.5) {
              t.trapCd = t.def.cooldown;
              e.stun = Math.max(e.stun, e.boss ? s.stun * 0.35 : s.stun);
              e.slipT = 0.5;
              A.sfx.slip();
              worldText(e.x, 2.4, e.z, 'SLIP!', 'crit');
              burst(t.x, 0.5, t.z, 0xffe23a, 18, 5, 0.6);
              damageEnemy(e, s.dmg, {});
              // also trip any neighbours
              enemies.forEach((o) => {
                if (o !== e && !o.dead && !o.def.flying && hyp(o.x - t.x, o.z - t.z) < 2.2) { o.stun = Math.max(o.stun, s.stun * (o.boss ? 0.2 : 0.7)); o.slipT = 0.5; }
              });
              break;
            }
          }
        }
      } else if (id === 'hug') {
        m.heart.position.y = 2.9 + Math.sin(t.age * 3) * 0.15;
        m.heart.rotation.y += dt * 1.5;
        m.heart.scale.setScalar(1 + Math.sin(t.age * 6) * 0.08);
        t.cd -= 0; // use separate pulse timer
        t.pulse = (t.pulse || 0) - dt;
        if (t.pulse <= 0) {
          t.pulse = 0.5;
          let any = false;
          for (let j = 0; j < towers.length; j++) {
            const o = towers[j];
            if (o.dead || o.hp >= o.maxHp) continue;
            if (hyp(o.x - t.x, o.z - t.z) <= s.radius) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * s.heal * 0.5); any = true; if (Math.random() < 0.5) burst(o.x, 1.4, o.z, 0xff8acb, 2, 1.5, 0.6, 1.2); }
          }
          if (P.alive && P.hp < P.maxHp && hyp(P.x - t.x, P.z - t.z) <= s.radius) { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * s.heal * 0.5 * 0.6); any = true; }
          if (any) burst(t.x, 3, t.z, 0xff8acb, 3, 2, 0.8, 1.5);
        }
      }

      // visuals: damage flash and low-hp bar
      const f = t.flash > 0 ? 0.6 : 0;
      if (t._f !== f) { t._f = f; m.mats.forEach((mt) => mt.emissive.setScalar(f)); }
      const showBar = t.hp < t.maxHp - 0.5;
      m.bar.group.visible = showBar;
      if (showBar) { m.bar.set(t.hp / t.maxHp, t.hp / t.maxHp < 0.35 ? 0xff5a5a : 0x5be07a); m.bar.group.quaternion.copy(camera.quaternion); }
      m.pips.quaternion.copy(camera.quaternion);
    }
  }

  /* ============================== enemies ============================== */
  function waveScale(w) { return 1 + (w - 1) * 0.17 + Math.max(0, w - 10) * 0.04; }
  function spawnEnemy(typeId, x, z, bossDef, bossIdx) {
    const base = bossDef ? bossDef : D.ENEMIES[typeId];
    const w = Math.max(1, S.wave);
    const ws = waveScale(w);
    const model = M.enemy(typeId, bossDef);
    let hp = base.hp * (bossDef ? (1 + Math.max(0, w - 5) * 0.09 + Math.floor(bossIdx / 3) * 0.6) : ws);
    const e = {
      id: uid++, typeId, def: base, boss: !!bossDef, x, z, vx: 0, vz: 0, kx: 0, kz: 0, r: base.r,
      hp, maxHp: hp, dmg: base.dmg * (1 + (w - 1) * 0.07), speed: base.speed * (bossDef ? 1 : 1 + Math.min(0.25, w * 0.012)),
      cd: rand(0.2, 0.8), stun: 0, slipT: 0, flash: 0, anim: rand(0, 6), atkAnim: 0, dead: false, model, yaw: Math.atan2(-x, -z),
      bt: { summon: bossDef && bossDef.summon ? bossDef.summon.every * 0.6 : 0, stomp: bossDef && bossDef.stomp ? bossDef.stomp.every * 0.7 : 0, fire: bossDef && bossDef.fire ? 2.5 : 0 },
      wind: 0, windKind: '', bossIdx: bossIdx || 0, spawnT: 0.4,
    };
    model.root.position.set(x, 0, z);
    model.pivot.rotation.y = e.yaw;
    scene.add(model.root);
    enemies.push(e);
    return e;
  }

  function damageEnemy(e, amt, o) {
    if (e.dead) return;
    o = o || {};
    e.hp -= amt;
    e.flash = 0.12;
    S.stats.damage += amt;
    if (o.kb) { const k = e.boss ? 0.15 : (e.def.r > 1 ? 0.4 : 1); e.kx += o.kx * o.kb * 3 * k; e.kz += o.kz * o.kb * 3 * k; }
    const big = o.crit;
    if (amt >= 1) worldText(e.x, (e.def.flying ? 3.4 : 2.4) + e.model.height * 0.2, e.z, (big ? '★' : '') + Math.ceil(amt), big ? 'crit' : '');
    A.sfx.hit();
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    scene.remove(e.model.root);
    S.stats.kills++;
    A.sfx.hit();
    burst(e.x, 1, e.z, 0xffffff, 10, 5, 0.5);
    burst(e.x, 1, e.z, e.boss ? 0xffd23f : 0x6bbf4a, e.boss ? 60 : 14, e.boss ? 14 : 6, e.boss ? 1.2 : 0.6);
    gainXp(e.def.xp * (e.boss ? 1 : 1));
    dropMana(e.x, e.z, e.def.mana * (1 + S.wave * 0.04));
    if (e.boss) {
      S.shake = 1;
      A.sfx.boom();
      ringFx(e.x, e.z, 12, 0xffd23f, 0.8);
      ui.banner('BOSS DEFEATED!', e.def.name + ' has been dealt with.', 3000);
      for (let k = 0; k < 2; k++) dropLoot(e.x, e.z, 2 + k);
    } else if (Math.random() < 0.09 + S.wave * 0.002) dropLoot(e.x, e.z, 0);
  }

  function nearestStructure(x, z, edgeRange, blocksOnly) {
    let best = null, bd = edgeRange;
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];
      if (t.dead || (blocksOnly && !t.def.blocks)) continue;
      const d = hyp(t.x - x, t.z - z) - t.r;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  function hurtTarget(tgt, dmg) {
    if (tgt.kind === 'tower') damageTower(tgt.ref, dmg);
    else if (tgt.kind === 'player') damagePlayer(dmg);
    else damageCrystal(dmg);
  }

  function explodeKabloomer(e) {
    e.dead = true;
    scene.remove(e.model.root);
    A.sfx.boom();
    S.shake = Math.min(1, S.shake + 0.35);
    ringFx(e.x, e.z, e.def.splash, 0xff9a2a, 0.4);
    burst(e.x, 0.8, e.z, 0xff7a1a, 40, 10, 0.8);
    burst(e.x, 0.8, e.z, 0xffe28a, 20, 6, 0.5);
    enemyAoE(e.x, e.z, e.def.splash, e.dmg);
  }

  function bossLogic(e, dt) {
    const b = e.def;
    if (e.wind > 0) {
      e.wind -= dt;
      if (e.windKind === 'fire' && e.model.mouth) e.model.mouth.visible = true;
      if (e.wind <= 0) {
        if (e.model.mouth) e.model.mouth.visible = false;
        if (e.windKind === 'stomp') {
          S.shake = Math.min(1.3, S.shake + 0.7);
          A.sfx.boom();
          ringFx(e.x, e.z, b.stomp.radius, 0xffffff, 0.5);
          ringFx(e.x, e.z, b.stomp.radius * 0.6, 0xff7a4a, 0.4);
          burst(e.x, 0.5, e.z, 0xff5a3a, 40, 11, 0.8);
          enemyAoE(e.x, e.z, b.stomp.radius, b.stomp.dmg * (1 + (S.wave - 5) * 0.06));
        } else if (e.windKind === 'fire') {
          A.sfx.zap();
          const tgtS = nearestStructure(e.x, e.z, 26, true);
          const tx = tgtS ? tgtS.x : (P.alive && hyp(P.x - e.x, P.z - e.z) < 18 ? P.x : 0);
          const tz = tgtS ? tgtS.z : (P.alive && hyp(P.x - e.x, P.z - e.z) < 18 ? P.z : 0);
          const base = Math.atan2(tx - e.x, tz - e.z);
          for (let k = 0; k < b.fire.n; k++) {
            const a = base + (k - (b.fire.n - 1) / 2) * 0.22;
            enemyShot(e.x + Math.sin(e.yaw) * 2.5, e.z + Math.cos(e.yaw) * 2.5, e.x + Math.sin(a) * 30, e.z + Math.cos(a) * 30, b.fire.dmg * (1 + (S.wave - 5) * 0.06), 13, { splash: b.fire.splash, life: 2.2 });
          }
        }
      }
      return true; // busy winding up
    }
    if (b.summon) {
      e.bt.summon -= dt;
      if (e.bt.summon <= 0) {
        e.bt.summon = b.summon.every;
        ui.quip('Gobbo Prime shouts: "Hey guys, come here! There is a hero!"', 3500);
        for (let k = 0; k < b.summon.n; k++) {
          const a = (k / b.summon.n) * PI * 2;
          spawnEnemy(b.summon.type, e.x + Math.sin(a) * 2.8, e.z + Math.cos(a) * 2.8);
        }
        ringFx(e.x, e.z, 4, 0x6bbf4a, 0.5);
      }
    }
    if (b.stomp) {
      e.bt.stomp -= dt;
      if (e.bt.stomp <= 0) {
        e.bt.stomp = b.stomp.every; e.wind = 0.9; e.windKind = 'stomp';
        ringFx(e.x, e.z, b.stomp.radius, 0xff4a2a, 0.9);
      }
    }
    if (b.fire) {
      e.bt.fire -= dt;
      if (e.bt.fire <= 0) { e.bt.fire = b.fire.every; e.wind = 0.8; e.windKind = 'fire'; }
    }
    return false;
  }

  function updateEnemy(e, dt) {
    const def = e.def;
    e.cd = Math.max(0, e.cd - dt);
    e.flash = Math.max(0, e.flash - dt);
    e.atkAnim = Math.max(0, e.atkAnim - dt * 4);
    e.spawnT = Math.max(0, e.spawnT - dt);
    e.slipT = Math.max(0, e.slipT - dt);
    const ox = e.x, oz = e.z;

    // knockback glide
    e.x += e.kx * dt; e.z += e.kz * dt;
    const kd = Math.exp(-7 * dt); e.kx *= kd; e.kz *= kd;

    let moved = false;
    if (e.stun > 0) {
      e.stun -= dt;
    } else if (e.spawnT > 0) {
      // portal-pop grace
    } else if (!(e.boss && bossLogic(e, dt))) {
      const dp = hyp(P.x - e.x, P.z - e.z);
      const crystalEdge = hyp(e.x, e.z) - CR.r - e.r;
      let tgt = null, edge = 1e9;

      if (def.explode) {
        const s = nearestStructure(e.x, e.z, 18, true);
        if (s) { tgt = { kind: 'tower', ref: s, x: s.x, z: s.z }; edge = hyp(s.x - e.x, s.z - e.z) - s.r - e.r; }
        else { tgt = { kind: 'crystal', x: 0, z: 0 }; edge = crystalEdge; }
        if (edge < 0.5) { explodeKabloomer(e); return; }
      } else if (def.flying) {
        const s = nearestStructure(e.x, e.z, 5, true);
        if (s) { tgt = { kind: 'tower', ref: s, x: s.x, z: s.z }; edge = hyp(s.x - e.x, s.z - e.z) - s.r - e.r; }
        else { tgt = { kind: 'crystal', x: 0, z: 0 }; edge = crystalEdge; }
      } else {
        const gap = def.ranged ? def.range : def.reach * 0.45;
        if (P.alive && dp < (def.aggro || (e.boss ? 7 : 0))) { tgt = { kind: 'player', x: P.x, z: P.z }; edge = dp - 0.5 - e.r; }
        else {
          // stragglers (see updateSpawner) stop sniping from afar and march on the crystal
          const s = (S.stragglerT > 40 && def.ranged) ? null : nearestStructure(e.x, e.z, gap + e.r + 0.3, true);
          if (s) { tgt = { kind: 'tower', ref: s, x: s.x, z: s.z }; edge = hyp(s.x - e.x, s.z - e.z) - s.r - e.r; }
          else { tgt = { kind: 'crystal', x: 0, z: 0 }; edge = crystalEdge; }
        }
      }

      const gapNow = def.ranged ? def.range : (def.reach || 1.5) * 0.45;
      if (edge <= gapNow) {
        // in range: stop & attack
        const ang = Math.atan2(tgt.x - e.x, tgt.z - e.z);
        e.yaw = lerpAngle(e.yaw, ang, Math.min(1, dt * 10));
        if (e.cd <= 0) {
          e.cd = def.atkCd * rand(0.9, 1.1);
          e.atkAnim = 1;
          if (def.ranged) {
            enemyShot(e.x, e.z, tgt.x, tgt.z, e.dmg, 13, {});
            A.sfx.sling();
          } else {
            if (def.aoe) {
              A.sfx.boom();
              ringFx(tgt.x, tgt.z, def.aoe, 0xffaa55, 0.35);
              burst(tgt.x, 0.5, tgt.z, 0xc8a070, 16, 6, 0.6);
              S.shake = Math.min(1, S.shake + 0.15);
              enemyAoE(tgt.x, tgt.z, def.aoe, e.dmg);
            } else {
              hurtTarget(tgt, e.dmg);
              A.sfx.swing();
            }
          }
        }
      } else {
        // move toward player (if chasing) or crystal / structure target
        let gx = tgt.kind === 'player' || def.explode || def.flying ? tgt.x : 0;
        let gz = tgt.kind === 'player' || def.explode || def.flying ? tgt.z : 0;
        const dx = gx - e.x, dz = gz - e.z, d = hyp(dx, dz) || 1;
        const sp = def.speed === undefined ? e.speed : e.speed;
        const slowMul = e.slowT > 0 ? 0.55 : 1;
        e.x += (dx / d) * sp * slowMul * dt;
        e.z += (dz / d) * sp * slowMul * dt;
        e.yaw = lerpAngle(e.yaw, Math.atan2(dx, dz), Math.min(1, dt * 9));
        moved = true;
      }
    }

    // separation from other enemies
    for (let i = 0; i < enemies.length; i++) {
      const o = enemies[i];
      if (o === e || o.dead) continue;
      const dx = e.x - o.x, dz = e.z - o.z, mn = (e.r + o.r) * 0.85, d2 = dx * dx + dz * dz;
      if (d2 < mn * mn && d2 > 1e-6) {
        const d = Math.sqrt(d2), push = (mn - d) * 0.5 * (o.r > e.r ? 1.3 : 0.7);
        e.x += (dx / d) * push; e.z += (dz / d) * push;
      }
    }
    if (!def.flying) pushOut(e, e.r);
    else { const dc = hyp(e.x, e.z), lim = ARENA + 2; if (dc > lim) { e.x *= lim / dc; e.z *= lim / dc; } }
    e.vx = (e.x - ox) / dt; e.vz = (e.z - oz) / dt;
    e.moving = moved;
  }

  function animateEnemy(e, dt) {
    const m = e.model, def = e.def;
    m.root.position.x = e.x; m.root.position.z = e.z;
    m.pivot.rotation.y = e.yaw;
    const spd = Math.min(1, hyp(e.vx, e.vz) / 3);
    e.anim += dt * (e.stun > 0 ? 0 : (4 + (def.speed || 3) * 2.2));
    const sw = Math.sin(e.anim) * (e.moving && e.stun <= 0 ? 0.85 : 0);
    if (m.legL) { m.legL.rotation.x = sw; m.legR.rotation.x = -sw; }
    if (m.legL2) { m.legL2.rotation.x = sw; m.legR2.rotation.x = -sw; }
    if (def.flying) {
      m.root.position.y = 2.9 + Math.sin(e.anim * 0.7) * 0.25;
      const flap = Math.sin(S.time * 18 + e.id) * 0.7;
      m.wingL.rotation.z = flap; m.wingR.rotation.z = -flap;
    } else if (e.typeId === 'dragon' || def.id === 'boss_dragon') {
      const flap = Math.sin(S.time * 4) * 0.25;
      m.wingL.rotation.z = flap; m.wingR.rotation.z = -flap;
      m.body.position.y = Math.abs(Math.sin(e.anim)) * (e.moving ? 0.12 : 0);
    } else {
      m.body.position.y = e.moving ? Math.abs(Math.sin(e.anim)) * 0.07 : 0;
      if (m.armR) {
        const a = e.atkAnim;
        m.armR.rotation.x = a > 0 ? -2.6 + 2.2 * (1 - a) : (e.moving ? -sw * 0.6 : -0.3);
        if (m.armL && !(def.id === 'kabloomer')) m.armL.rotation.x = e.moving ? sw * 0.6 : 0;
      }
      if (def.id === 'kabloomer' && m.flame) m.flame.scale.setScalar(0.8 + Math.sin(S.time * 30 + e.id) * 0.4);
    }
    // stun wobble / slip
    if (e.slipT > 0) { m.pivot.rotation.x = -Math.min(1, e.slipT * 3) * 1.2; m.pivot.rotation.y += e.slipT * 20; }
    else m.pivot.rotation.x = 0;
    if (e.stun > 0 && m.head && e.slipT <= 0) m.head.rotation.y = Math.sin(S.time * 14) * 0.5; else if (m.head) m.head.rotation.y = 0;
    if (e.spawnT > 0) m.root.scale.setScalar(1 - e.spawnT * 0.6); else if (m.root.scale.x !== 1) m.root.scale.setScalar(1);
    // flash
    const f = e.flash > 0 ? 0.7 : 0;
    if (e._f !== f) { e._f = f; m.mats.forEach((mt) => mt.emissive.setScalar(f)); }
    // bar
    if (!e.boss) {
      const show = e.hp < e.maxHp - 0.5;
      m.bar.group.visible = show;
      if (show) { m.bar.set(e.hp / e.maxHp); m.bar.group.quaternion.copy(camera.quaternion); }
    }
  }

  function updateEnemies(dt) {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      updateEnemy(e, dt);
      if (!e.dead) animateEnemy(e, dt);
    }
  }

  /* ============================== crystal ============================== */
  function damageCrystal(amt) {
    if (S.mode !== 'playing') return;
    S.crystalHp -= amt;
    S.crystalFlash = 0.18;
    S.shake = Math.min(1, S.shake + 0.1);
    A.sfx.hurt();
    if (S.crystalHp < CR.hp * 0.3 && !S.crystalWarned) { S.crystalWarned = true; ui.quip(pick(D.QUIPS.crystalLow)); }
    if (S.crystalHp >= CR.hp * 0.45) S.crystalWarned = false;
    if (S.crystalHp <= 0) { S.crystalHp = 0; endGame(false); }
  }

  const _pup = new T.Vector3();
  function updateCrystal(dt) {
    const c = world.crystal;
    c.gem.position.y = 3.1 + Math.sin(S.time * 1.6) * 0.18;
    c.gem.rotation.y += dt * 0.25;
    c.eyes.position.y = c.gem.position.y + 0.1;
    c.eyes.rotation.y = lerpAngle(c.eyes.rotation.y, cam.yaw, Math.min(1, dt * 4));
    // pupils look at the nearest enemy (or the hero)
    const tgt = nearestEnemy(0, 0, 60) || (P.alive ? P : null);
    let lx = 0, lz = 1;
    if (tgt) { const a = Math.atan2(tgt.x, tgt.z) - c.eyes.rotation.y; lx = Math.sin(a); lz = Math.cos(a); }
    const scared = S.crystalHp < CR.hp * 0.3;
    c.pupils.forEach((p) => {
      p.mesh.position.x = p.bx + lx * 0.12 + (scared ? (Math.random() - 0.5) * 0.06 : 0);
      p.mesh.position.y = p.by + (scared ? 0.05 : 0);
    });
    S.crystalFlash = Math.max(0, S.crystalFlash - dt);
    const red = S.crystalFlash > 0;
    c.gemMat.emissive.setHex(red ? 0xaa2020 : (scared ? 0x6a2a50 : 0x145f80));
    c.light.intensity = 1.2 + Math.sin(S.time * 3) * 0.25;
    c.halo.rotation.z += dt * 0.5;
    // torches
    world.torches.forEach((f, i) => { f.scale.y = 0.85 + Math.sin(S.time * 11 + i * 2.1) * 0.2; });
    // portals
    world.portals.forEach((p) => {
      const on = S.activePortals.includes(p.idx);
      p.disc2.rotation.z += dt * (on ? 3 : 0.6);
      p.disc.rotation.z -= dt * 0.8;
      const target = on ? 0.8 : 0.28;
      p.discMat.opacity += (target - p.discMat.opacity) * Math.min(1, dt * 4);
      p.ring.rotation.z += dt * 0.3;
      p.ringMat.emissive.setHex(on ? 0x7a30d0 : 0x2a1450);
    });
  }

  /* ============================== loot / pickups ============================== */
  const manaGeo = M.G('Octahedron', 0.26, 0);
  const manaMat = new T.MeshBasicMaterial({ color: 0x62e6ff });
  function dropMana(x, z, total) {
    const n = Math.min(4, Math.max(1, Math.round(total / 8)));
    for (let i = 0; i < n; i++) {
      const mesh = new T.Mesh(manaGeo, manaMat);
      mesh.position.set(x, 0.8, z);
      scene.add(mesh);
      const a = Math.random() * PI * 2, s = rand(1.5, 4);
      pickups.push({ kind: 'mana', x, z, y: 0.8, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: rand(4, 7), value: Math.max(1, Math.round(total / n)), mesh, life: 40, t: 0, dead: false });
    }
  }
  function rollItem(wave, minRarity, luck) {
    const slot = pick(D.SLOTS);
    const r = Math.random() + (luck || 0) + wave * 0.004;
    let rarity = r < 0.5 ? 0 : r < 0.8 ? 1 : r < 0.94 ? 2 : r < 0.99 ? 3 : 4;
    rarity = Math.max(rarity, minRarity || 0);
    const power = (1 + Math.max(1, wave) * 0.3) * D.RARITY[rarity].mult;
    const stat = {
      weapon: { k: 'dmg', v: Math.max(2, Math.round(power * 3.6)) },
      hat: { k: 'hp', v: Math.max(5, Math.round(power * 10)) },
      armor: { k: 'dr', v: Math.max(1, Math.round(power * 1.5)) },
      boots: { k: 'spd', v: Math.max(1, Math.round(power * 1.2)) },
      trinket: { k: 'tower', v: Math.max(2, Math.round(power * 3.2)) },
    }[slot];
    const suffix = pick(D.LOOT_SUFFIX);
    const name = pick(D.LOOT_PREFIX) + ' ' + pick(D.LOOT_BASE[slot]) + (suffix ? ' ' + suffix : '');
    return { id: uid++, slot, rarity, name, power, stat, sell: Math.round(18 * power) };
  }
  function dropLoot(x, z, minRarity) {
    const item = rollItem(S.wave, minRarity, minRarity ? 0.15 : 0);
    const col = parseInt(D.RARITY[item.rarity].color.slice(1), 16);
    const g = new T.Group();
    const gem = new T.Mesh(M.G('Box', 0.5, 0.5, 0.5), new T.MeshBasicMaterial({ color: col }));
    gem.position.y = 0.0;
    g.add(gem);
    const beam = new T.Mesh(M.G('Cylinder', 0.07, 0.07, 7, 5), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, depthWrite: false }));
    beam.position.y = 3.2;
    g.add(beam);
    g.position.set(x, 0.8, z);
    scene.add(g);
    const a = Math.random() * PI * 2, s = rand(1, 3);
    pickups.push({ kind: 'item', item, x, z, y: 0.8, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: 7, mesh: g, gem, life: 75, t: 0, dead: false });
  }
  function addItem(item) {
    S.stats.loot++;
    const cur = P.gear[item.slot];
    const rar = D.RARITY[item.rarity];
    A.sfx.loot();
    if (!cur || item.power > cur.power) {
      if (cur) P.bag.push(cur);
      P.gear[item.slot] = item;
      ui.toast('✨ Equipped <b style="color:' + rar.color + '">' + item.name + '</b><br><small>' + ui.itemDesc(item) + '</small>', rar.color);
    } else {
      P.bag.push(item);
      ui.toast('🎒 Picked up <b style="color:' + rar.color + '">' + item.name + '</b><br><small>' + ui.itemDesc(item) + '</small>', rar.color);
    }
    while (P.bag.length > D.MAX_BAG) {
      P.bag.sort((a, b) => a.power - b.power);
      const junk = P.bag.shift();
      P.mana += junk.sell;
      ui.toast('🗑️ Bag full - auto-sold <b>' + junk.name + '</b> for 💎' + junk.sell, '#aaa');
    }
    recalc();
    if (S.panel) renderInv();
  }
  function updatePickups(dt) {
    for (let i = 0; i < pickups.length; i++) {
      const p = pickups[i];
      if (p.dead) continue;
      p.t += dt; p.life -= dt;
      const dx = P.x - p.x, dz = P.z - p.z, d = hyp(dx, dz);
      const magnet = p.kind === 'mana' && P.alive && (d < 6.5 || S.vacuum > 0);
      if (magnet) {
        const sp = 12 + Math.max(0, 7 - d) * 3 + (S.vacuum > 0 ? 10 : 0);
        p.x += (dx / (d || 1)) * sp * dt; p.z += (dz / (d || 1)) * sp * dt;
        p.y += (1.0 - p.y) * Math.min(1, dt * 8);
      } else {
        p.x += p.vx * dt; p.z += p.vz * dt;
        p.vx *= Math.exp(-3 * dt); p.vz *= Math.exp(-3 * dt);
        p.vy -= 22 * dt; p.y += p.vy * dt;
        const floor = p.kind === 'item' ? 0.7 : 0.45;
        if (p.y < floor) { p.y = floor; p.vy = p.vy < -3 ? -p.vy * 0.35 : 0; }
      }
      const lim = ARENA - 1.5, dc = hyp(p.x, p.z);
      if (dc > lim) { p.x *= lim / dc; p.z *= lim / dc; }
      p.mesh.position.set(p.x, p.y + Math.sin(p.t * 4) * 0.08, p.z);
      p.mesh.rotation.y += dt * 3;
      if (p.life < 4) p.mesh.visible = Math.floor(p.t * 10) % 2 === 0;
      if (P.alive) {
        if (p.kind === 'mana' && d < 1.1) {
          P.mana += p.value;
          A.sfx.coin();
          worldText(P.x, 2.2, P.z, '+' + p.value, 'mana');
          p.dead = true;
        } else if (p.kind === 'item' && d < 1.9) {
          addItem(p.item);
          p.dead = true;
        }
      }
      if (p.life <= 0) p.dead = true;
      if (p.dead) scene.remove(p.mesh);
    }
  }

  /* ============================== waves ============================== */
  function bossForWave(w) {
    if (w % 5 !== 0) return null;
    const idx = w / 5 - 1;
    return { def: D.BOSSES[idx % D.BOSSES.length], idx };
  }
  function buildWaveQueue(w) {
    const q = [];
    let budget = 7 + w * 4.6;
    const unlocked = Object.values(D.ENEMIES).filter((d) => d.unlock <= w);
    let guard = 0;
    while (budget >= 1 && guard++ < 300) {
      const opts = unlocked.filter((d) => d.cost <= budget);
      if (!opts.length) break;
      const weights = opts.map((d) => 1 / Math.pow(d.cost, 0.75) * (d.unlock === w ? 2.2 : 1));
      const sum = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * sum, k = 0;
      while (r > weights[k] && k < weights.length - 1) { r -= weights[k]; k++; }
      q.push(opts[k].id);
      budget -= opts[k].cost;
    }
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    const boss = bossForWave(w);
    if (boss) q.splice(Math.floor(q.length * 0.5), 0, { boss });
    return q;
  }
  const PORTAL_ORDER = [0, 1, 2, 3];
  function startBuild(first) {
    S.phase = 'build';
    S.buildTimer = first ? D.BUILD_TIME_FIRST : D.BUILD_TIME;
    S.vacuum = 6;
    A.setMusic('build');
    if (!first) {
      // free patch-up between waves + hero heal
      towers.forEach((t) => { if (!t.dead) t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.3); });
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.5);
    }
    const next = S.wave + 1;
    ui.banner(first ? 'BUILD YOUR DEFENSES' : 'WAVE ' + S.wave + ' CLEARED!', first ? 'Place towers with 1-6, then press Enter to start' : 'Next up: wave ' + next + (bossForWave(next) ? ' — A BOSS APPROACHES' : ''), 2800);
    ui.quip(first ? pick(D.QUIPS.start) : pick(D.QUIPS.build), 6000);
  }
  function startWave() {
    if (S.phase !== 'build' || S.mode !== 'playing') return;
    // early-start bonus
    if (S.buildTimer > 3 && S.wave > 0) { const b = Math.floor(S.buildTimer * 0.9); P.mana += b; ui.toast('⏩ Early start bonus: 💎' + b, '#62e6ff'); }
    S.wave++;
    S.phase = 'combat';
    S.spawnQueue = buildWaveQueue(S.wave);
    S.spawnTimer = 1.2;
    S.stragglerT = 0;
    const np = Math.min(4, 1 + Math.floor(S.wave / 3));
    S.activePortals = PORTAL_ORDER.slice(0, np);
    A.setMusic('fight');
    const boss = bossForWave(S.wave);
    A.sfx.wave();
    if (boss) {
      A.sfx.boss();
      ui.banner('WAVE ' + S.wave, 'BOSS: ' + boss.def.name, 3500, true);
      ui.quip(boss.def.intro, 7000);
    } else {
      ui.banner('WAVE ' + S.wave, np + (np > 1 ? ' portals are' : ' portal is') + ' open!', 2000);
      ui.quip(pick(D.QUIPS.wave), 5000);
    }
  }
  function updateSpawner(dt) {
    if (S.phase !== 'combat') return;
    S.spawnTimer -= dt;
    if (S.spawnQueue.length && S.spawnTimer <= 0 && enemies.length < D.MAX_ENEMIES_ALIVE) {
      const item = S.spawnQueue.shift();
      const portal = world.portals[S.activePortals.length ? pick(S.activePortals) : 0];
      const x = portal.pos.x + rand(-1.4, 1.4), z = portal.pos.z + rand(-1.4, 1.4);
      if (typeof item === 'string') spawnEnemy(item, x, z);
      else {
        const e = spawnEnemy(item.boss.def.base === 'dragon' ? 'dragon' : item.boss.def.base, x, z, item.boss.def, item.boss.idx);
        S.shake = 0.7;
        ringFx(x, z, 8, 0xff5a2a, 0.8);
      }
      S.spawnTimer = Math.max(0.28, 0.95 - S.wave * 0.035) * rand(0.7, 1.2);
      burst(x, 1.5, z, 0xc58bff, 10, 4, 0.6);
    }
    if (!S.spawnQueue.length) {
      const prev = S.stragglerT;
      S.stragglerT += dt;
      if (prev <= 40 && S.stragglerT > 40 && enemies.some((e) => !e.dead)) ui.toast('🏃 The last few enemies are getting desperate and are charging the crystal!', '#ffd23f');
    } else S.stragglerT = 0;
    if (!S.spawnQueue.length && !enemies.some((e) => !e.dead)) waveClear();
  }
  function waveClear() {
    A.sfx.clear();
    const bonus = 70 + S.wave * 14;
    P.mana += bonus;
    ui.toast('🏁 Wave clear bonus: 💎' + bonus, '#62e6ff');
    dropLoot(0, 5, bossForWave(S.wave) ? 2 : 0);
    ui.quip(pick(D.QUIPS.clear), 4500);
    if (S.wave >= D.CAMPAIGN_WAVES && !S.endless && !S.wonOnce) { S.wonOnce = true; endGame(true); return; }
    startBuild(false);
  }

  /* ============================== game flow ============================== */
  function clearWorld() {
    enemies.forEach((e) => scene.remove(e.model.root));
    towers.forEach((t) => scene.remove(t.model.root));
    projectiles.forEach((p) => scene.remove(p.mesh));
    eprojs.forEach((p) => scene.remove(p.mesh));
    pickups.forEach((p) => scene.remove(p.mesh));
    enemies = []; towers = []; projectiles = []; eprojs = []; pickups = [];
    fxList.forEach((f) => scene.remove(f.obj)); fxList.length = 0;
    setGhost(null);
    for (let i = 0; i < MAXP; i++) { pLife[i] = 0; pPos[i * 3 + 1] = -999; }
  }

  function newGame() {
    clearWorld();
    S.mode = 'playing'; S.wave = 0; S.time = 0; S.endless = false; S.wonOnce = false; S.panel = false;
    S.crystalHp = CR.hp; S.crystalWarned = false; S.crystalFlash = 0; S.selectedTower = null;
    S.spawnQueue = []; S.activePortals = []; S.shake = 0; S.msgCooldown = 0;
    S.stats = { kills: 0, damage: 0, built: 0, loot: 0, deaths: 0 };
    resetPlayer(S.classId);
    ['title', 'pause', 'inv', 'end'].forEach((id) => ui.show(id, false));
    ui.hud(true);
    ui.buildTowerBar();
    startBuild(true);
    // the very first tip is shown after the build banner
    setTimeout(() => ui.toast('💡 Press <kbd>1</kbd>-<kbd>6</kbd> to pick a tower, click to place it. <kbd>Enter</kbd> starts the wave.', '#62e6ff'), 1200);
  }

  function endGame(win) {
    S.mode = 'over';
    ui.hideMessages();
    S.selectedTower = null; setGhost(null);
    A.setMusic('off');
    win ? A.sfx.win() : A.sfx.over();
    const mins = Math.floor(S.time / 60), secs = Math.floor(S.time % 60);
    ui.renderEnd(win, pick(win ? D.QUIPS.win : D.QUIPS.over), [
      ['Hero', P.cls.emoji + ' ' + P.cls.name + ' (level ' + P.level + ')'],
      ['Waves survived', win ? S.wave : Math.max(0, S.wave - (S.phase === 'combat' ? 1 : 0)) + (S.phase === 'combat' ? ' (died in wave ' + S.wave + ')' : '')],
      ['Goblins embarrassed', S.stats.kills],
      ['Damage dealt', U.fmt(S.stats.damage)],
      ['Towers built', S.stats.built],
      ['Loot found', S.stats.loot],
      ['Times you died', S.stats.deaths],
      ['Time played', mins + 'm ' + secs + 's'],
    ], win);
    setTimeout(() => { ui.show('end', true); }, win ? 900 : 1100);
  }

  function setPaused(on) {
    if (on && S.mode === 'playing') {
      S.mode = 'paused';
      $('pause-quip').textContent = pick(['The goblins are also paused. They are being very polite about it.', 'Time has stopped. The crystal is relieved.', 'Paused. Go get a snack. The dungeon will wait.']);
      ui.show('pause', true);
    } else if (!on && S.mode === 'paused') {
      S.mode = 'playing';
      ui.show('pause', false);
    }
  }
  function openInv(on) {
    if (on && S.mode === 'playing') {
      S.mode = 'paused'; S.panel = true; renderInv(); ui.show('inv', true);
    } else if (!on && S.panel) {
      S.panel = false; S.mode = 'playing'; ui.show('inv', false);
    }
  }
  function invView() {
    const gm = (slot, k) => gv(slot, k);
    return {
      emoji: P.cls.emoji, name: P.cls.name, level: P.level, sp: P.sp, stats: P.stats, gear: P.gear, bag: P.bag,
      summary: [
        '❤️ Max health: <b>' + P.maxHp + '</b>',
        '⚔️ Attack damage: <b>×' + P.dmgMult.toFixed(2) + '</b>',
        '👟 Move speed: <b>' + P.speed.toFixed(1) + '</b>',
        '🛡️ Damage reduction: <b>' + Math.round(P.dr * 100) + '%</b>',
        '🏗️ Tower power: <b>×' + P.towerDmg.toFixed(2) + '</b> damage, <b>×' + P.towerHp.toFixed(2) + '</b> health',
      ],
    };
  }
  function renderInv() { ui.renderInv(invView()); }

  /* ============================== tower interaction ============================== */
  let ghost = null; // { typeId, model, ring, ok }
  function setGhost(typeId) {
    if (ghost) { scene.remove(ghost.model.root); ghost = null; }
    if (!typeId) return;
    const d = D.TOWERS[typeId];
    const model = M.tower(typeId, 0);
    model.mats.forEach((mt) => { mt.transparent = true; mt.opacity = 0.62; });
    model.root.traverse((o) => { o.castShadow = false; });
    model.bar.group.visible = false; model.pips.visible = false;
    const range = d.range || d.radius || d.trigger || 0;
    let ring = null;
    if (range) {
      ring = new T.Mesh(new T.RingGeometry(range - 0.08, range, 64), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, side: T.DoubleSide, depthWrite: false }));
      ring.rotation.x = -PI / 2; ring.position.y = 0.08;
      model.root.add(ring);
    }
    scene.add(model.root);
    ghost = { typeId, model, ring, ok: null };
  }
  function selectTower(id) {
    if (S.mode !== 'playing') return;
    if (S.selectedTower === id) { S.selectedTower = null; setGhost(null); return; }
    A.sfx.click();
    S.selectedTower = id;
    setGhost(id);
  }
  function updateGhost() {
    if (!ghost) return;
    updateAim();
    const x = Math.round(aim.x * 2) / 2, z = Math.round(aim.z * 2) / 2;
    ghost.model.root.position.set(x, 0, z);
    ghost.model.body.rotation.y = ghost.typeId === 'wall' ? Math.atan2(-x, -z) : 0;
    const c = canPlace(ghost.typeId, x, z);
    ghost.ok = c.ok; ghost.why = c.why; ghost.x = x; ghost.z = z;
    const col = c.ok ? 0x30ff70 : 0xff3030;
    ghost.model.mats.forEach((mt) => mt.emissive.setHex(col).multiplyScalar(0.45));
    if (ghost.ring) ghost.ring.material.color.setHex(c.ok ? 0x9affb0 : 0xff8a8a);
    // show real range with upgrades? keep base
  }
  function tryPlace() {
    if (!ghost) return;
    updateGhost(); // always validate against the live cursor, not last frame's ghost
    if (!ghost.ok) { A.sfx.error(); if (ghost.why) worldText(ghost.x, 1.5, ghost.z, ghost.why, 'hurt'); return; }
    placeTower(ghost.typeId, ghost.x, ghost.z);
    updateGhost();
  }

  function towerNear(x, z, maxD) {
    let best = null, bd = maxD;
    towers.forEach((t) => { if (t.dead) return; const d = hyp(t.x - x, t.z - z) - t.r; if (d < bd) { bd = d; best = t; } });
    return best;
  }
  function actTower() {
    updateAim();
    S.hover = S.selectedTower ? null : towerNear(aim.x, aim.z, 1.1);
    return S.hover || towerNear(P.x, P.z, 4);
  }
  function upgradeTower() {
    const t = actTower();
    if (!t) return;
    if (t.lv >= D.TOWER_MAX_LV) { A.sfx.error(); worldText(t.x, 3, t.z, 'MAX LEVEL', 'hurt'); return; }
    const c = upgradeCost(t);
    if (P.mana < c) { A.sfx.error(); worldText(t.x, 3, t.z, 'Need 💎' + c, 'hurt'); return; }
    P.mana -= c; t.invest += c; t.lv++;
    refreshTower(t);
    t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.3);
    A.sfx.upgrade();
    ringFx(t.x, t.z, 3.2, 0xffd23f, 0.5);
    burst(t.x, 1.5, t.z, 0xffd23f, 22, 6, 0.8);
    worldText(t.x, 3.4, t.z, 'LEVEL ' + t.lv + '!', 'big');
  }
  function repairTower(t) {
    if (!t || t.hp >= t.maxHp - 0.5) return false;
    const c = repairCost(t);
    if (P.mana < c) { A.sfx.error(); worldText(t.x, 3, t.z, 'Need 💎' + c, 'hurt'); return false; }
    P.mana -= c; t.hp = t.maxHp;
    A.sfx.repair();
    burst(t.x, 1.5, t.z, 0x7af08f, 12, 4, 0.6);
    return true;
  }
  function sellTower() {
    const t = actTower();
    if (!t) return;
    const v = sellValue(t);
    P.mana += v;
    t.dead = true;
    scene.remove(t.model.root);
    A.sfx.sell();
    burst(t.x, 1, t.z, 0x62e6ff, 16, 5, 0.6);
    worldText(t.x, 2.5, t.z, '+' + v, 'mana');
    S.hover = null;
  }
  function repairAll() {
    let n = 0, cost = 0;
    towers.forEach((t) => { if (!t.dead && t.hp < t.maxHp - 0.5) { const c = repairCost(t); if (P.mana >= c) { P.mana -= c; t.hp = t.maxHp; n++; cost += c; burst(t.x, 1.5, t.z, 0x7af08f, 8, 4, 0.6); } } });
    if (n) { A.sfx.repair(); ui.toast('🔧 Repaired ' + n + ' tower' + (n > 1 ? 's' : '') + ' for 💎' + cost, '#7af08f'); } else A.sfx.error();
  }

  function towerTip(t) {
    const s = tstats(t), d = t.def;
    let lines = '<b>' + d.emoji + ' ' + d.name + '</b> — Lv ' + t.lv + (t.lv >= D.TOWER_MAX_LV ? ' (MAX)' : '') + '<br>';
    lines += '❤️ ' + Math.ceil(t.hp) + ' / ' + Math.ceil(s.maxHp) + '<br>';
    if (d.id === 'sling' || d.id === 'zap' || d.id === 'mortar') lines += '⚔️ ' + s.dmg.toFixed(0) + ' dmg · ' + s.rate.toFixed(1) + '/s · range ' + s.range.toFixed(0) + '<br>';
    if (d.id === 'trap') lines += '⚔️ ' + s.dmg.toFixed(0) + ' dmg · ' + s.stun.toFixed(1) + 's stun<br>';
    if (d.id === 'hug') lines += '💗 heals ' + (s.heal * 100).toFixed(1) + '%/s · radius ' + s.radius.toFixed(0) + '<br>';
    lines += '<span style="color:#b8a9d9"><kbd>E</kbd> upgrade 💎' + (t.lv >= D.TOWER_MAX_LV ? '—' : upgradeCost(t)) + ' · <kbd>R</kbd> repair 💎' + repairCost(t) + ' · <kbd>X</kbd> sell +' + sellValue(t) + '</span>';
    return lines;
  }

  /* ============================== HUD refresh ============================== */
  let mmTimer = 0;
  function aliveEnemies() { let n = 0; for (let i = 0; i < enemies.length; i++) if (!enemies[i].dead) n++; return n; }
  function hudTick(dt) {
    const left = aliveEnemies() + S.spawnQueue.length;
    let boss = null;
    for (let i = 0; i < enemies.length; i++) if (enemies[i].boss && !enemies[i].dead) boss = enemies[i];
    const mm = Math.floor(S.buildTimer / 60), ss = Math.max(0, Math.ceil(S.buildTimer % 60));
    const bossNext = bossForWave(S.wave + 1);
    const waveLabel = S.wave === 0 ? 'GET READY' : 'WAVE ' + S.wave + (S.endless ? '' : ' / ' + D.CAMPAIGN_WAVES);
    ui.updateHud({
      waveLabel,
      waveSub: S.phase === 'combat' ? 'Enemies left: ' + left : (bossNext ? '⚠ Boss next wave!' : 'Next: wave ' + (S.wave + 1)),
      phase: S.phase,
      phaseText: S.phase === 'build' ? 'BUILD PHASE ' + mm + ':' + String(ss).padStart(2, '0') : 'COMBAT!',
      crystalHp: S.crystalHp, crystalMax: CR.hp,
      boss: boss ? { name: boss.def.name, frac: boss.hp / boss.maxHp } : null,
      heroEmoji: P.cls.emoji, heroName: P.cls.name, level: P.level, hp: P.hp, maxHp: P.maxHp, alive: P.alive, respawn: P.respawn,
      xpFrac: P.level >= D.MAX_LEVEL ? 1 : P.xp / xpNeed(P.level), sp: P.sp, mana: P.mana,
      specialName: P.cls.special.name,
      selectedTower: S.selectedTower,
      spCd01: P.spCd / P.cls.special.cd, dashCd01: P.dashCd / 1.5,
      modeHint: S.selectedTower ? 'Building: ' + D.TOWERS[S.selectedTower].name + ' — click to place · right-drag rotates · ' + (D.TOWER_ORDER.indexOf(S.selectedTower) + 1) + ' or B to stop' : '',
    });
    // tooltip
    if (S.mode === 'playing' && !S.selectedTower && S.hover) ui.tip(towerTip(S.hover), mouse.x, mouse.y);
    else ui.tip(null);
    // minimap (10 Hz)
    mmTimer -= dt;
    if (mmTimer <= 0) {
      mmTimer = 0.1;
      ui.minimap({
        R: ARENA, yaw: cam.yaw, px: P.x, pz: P.z,
        portals: world.portals.map((p) => ({ x: p.pos.x, z: p.pos.z, active: S.activePortals.includes(p.idx) })),
        towers: towers.filter((t) => !t.dead).map((t) => ({ x: t.x, z: t.z, wall: t.def.id === 'wall' })),
        enemies: enemies.filter((e) => !e.dead).map((e) => ({ x: e.x, z: e.z, boss: e.boss })),
      });
    }
  }

  /* ============================== main step / loop ============================== */
  function updatePhase(dt) {
    S.msgCooldown = Math.max(0, S.msgCooldown - dt);
    S.vacuum = Math.max(0, S.vacuum - dt);
    if (S.phase === 'build') {
      S.buildTimer -= dt;
      if (S.buildTimer <= 0) { S.buildTimer = 0; startWave(); }
    }
    updateSpawner(dt);
  }

  function cleanup() {
    if (enemies.some((e) => e.dead)) enemies = enemies.filter((e) => !e.dead);
    if (towers.some((t) => t.dead)) towers = towers.filter((t) => !t.dead);
    if (projectiles.some((p) => p.dead)) projectiles = projectiles.filter((p) => !p.dead);
    if (eprojs.some((p) => p.dead)) eprojs = eprojs.filter((p) => !p.dead);
    if (pickups.some((p) => p.dead)) pickups = pickups.filter((p) => !p.dead);
  }

  function step(dt) {
    S.time += dt;
    updatePhase(dt);
    updatePlayer(dt);
    updateTowers(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updatePickups(dt);
    updateFx(dt);
    updateParticles(dt);
    updateCrystal(dt);
    animateHero(dt);
    cleanup();
    tapped.Space = tapped.KeyQ = false;
    mouse.clicked = false;
  }

  // adaptive quality: if frames are slow, drop shadows
  let slowT = 0, fpsAcc = 0, fpsN = 0, lowQ = false;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 0.016;
    const rawDt = dt;
    dt = Math.min(0.05, dt);

    updateAim();
    if (S.mode === 'playing') {
      step(dt);
      S.hover = S.selectedTower ? null : towerNear(aim.x, aim.z, 1.1);
      if (!lowQ && S.wave > 0) {
        if (rawDt < 0.25) { fpsAcc += rawDt; fpsN++; } // ignore gaps from hidden tabs / hitches
        if (fpsAcc > 3) {
          if (fpsAcc / fpsN > 0.034) slowT++; else slowT = 0;
          fpsAcc = 0; fpsN = 0;
          if (slowT >= 2) { lowQ = true; sun.castShadow = false; renderer.shadowMap.enabled = false; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); ui.toast('🐌 Slow frames detected - shadows turned off to help.', '#ffd23f'); }
        }
      }
    } else if (S.mode === 'title') {
      S.time += dt;
      updateCrystal(dt);
      P.model.pivot.rotation.y += dt * 0.6;
      updateParticles(dt);
      updateFx(dt);
    }
    if (S.mode === 'playing' || S.mode === 'over') updateGhost();
    if (ghost) ghost.model.root.visible = S.mode === 'playing';
    updateCamera(dt);
    if (S.mode !== 'title') hudTick(dt);
    // hover ring
    renderer.render(scene, camera);
  }

  /* ============================== input wiring ============================== */
  const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);
  window.addEventListener('keydown', (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    A.init();
    if (e.repeat) { keys[e.code] = true; return; }
    keys[e.code] = true;

    if (S.mode === 'title') { if (e.code === 'Enter') startFromTitle(); return; }
    if (S.mode === 'over') return;

    if (e.code === 'KeyM') { ui.h.mute(); return; }
    if (e.code === 'Escape') { if (S.panel) openInv(false); else setPaused(S.mode === 'playing'); return; }
    if (e.code === 'KeyP') { if (S.mode === 'paused' && !S.panel) setPaused(false); else if (S.mode === 'playing') setPaused(true); return; }
    if (e.code === 'KeyI') { openInv(!S.panel); return; }
    if (S.mode !== 'playing') return;
    tapped[e.code] = true;

    if (e.code === 'Enter') startWave();
    else if (e.code.startsWith('Digit')) {
      const n = parseInt(e.code.slice(5), 10);
      if (n >= 1 && n <= 6) selectTower(D.TOWER_ORDER[n - 1]);
      if (n === 0) { S.selectedTower = null; setGhost(null); }
    }
    else if (e.code === 'KeyB') { if (S.selectedTower) { S.selectedTower = null; setGhost(null); } else selectTower(S.lastTower || 'wall'); }
    else if (e.code === 'KeyE') upgradeTower();
    else if (e.code === 'KeyR') repairTower(actTower());
    else if (e.code === 'KeyX') sellTower();
    else if (e.code === 'KeyT') repairAll();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'playing') setPaused(true); });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.left = false; mouse.drag = false; if (S.mode === 'playing') setPaused(true); });

  canvas.addEventListener('mousedown', (e) => {
    A.init();
    if (S.mode !== 'playing') return;
    if (e.button === 0) {
      mouse.left = true; mouse.clicked = true;
      if (S.selectedTower) { S.lastTower = S.selectedTower; tryPlace(); }
    } else if (e.button === 2) { mouse.drag = true; }
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.left = false; if (e.button === 2) mouse.drag = false; });
  window.addEventListener('mousemove', (e) => {
    if (mouse.drag) cam.yaw -= (e.clientX - mouse.x) * 0.006;
    mouse.x = e.clientX; mouse.y = e.clientY;
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = clamp(cam.dist + Math.sign(e.deltaY) * 1.4, 9, 30); }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // Z / C rotate the camera too (keyboard friendly)
  setInterval(() => { if (S.mode === 'playing') { if (keys.KeyZ) cam.yaw += 0.04; if (keys.KeyC) cam.yaw -= 0.04; } }, 16);

  /* ui callbacks */
  function startFromTitle() { A.init(); A.sfx.gong(); newGame(); }
  Object.assign(ui.h, {
    selectHero(id) { S.classId = id; setHeroModel(id); ui.showHeroDetail(id); P.model.root.position.set(0, 0, 8); P.x = 0; P.z = 8; },
    play() { startFromTitle(); },
    resume() { setPaused(false); },
    quit() { ui.show('pause', false); clearWorld(); S.mode = 'title'; A.setMusic('off'); ui.hud(false); showTitle(); },
    again() { ui.show('end', false); newGame(); },
    endless() { ui.show('end', false); S.endless = true; S.mode = 'playing'; startBuild(false); ui.toast('♾️ Endless mode: the goblins never stop. Neither do the puns.', '#c58bff'); },
    menu() { ui.show('end', false); clearWorld(); S.mode = 'title'; ui.hud(false); showTitle(); },
    pickTower(id) { selectTower(id); },
    startWave() { startWave(); },
    openInv() { openInv(!S.panel); },
    closeInv() { openInv(false); },
    mute() { const m = A.toggleMute(); $('btn-mute').innerHTML = (m ? '🔇' : '🔊') + ' <kbd>M</kbd>'; ui.toast(m ? '🔇 Muted' : '🔊 Sound on', '#fff'); },
    pause() { if (S.mode === 'paused' && !S.panel) setPaused(false); else setPaused(true); },
    spend(k) { if (P.sp > 0 && P.stats[k] !== undefined) { P.sp--; P.stats[k]++; A.sfx.click(); recalc(); renderInv(); } },
    equip(i) {
      const it = P.bag[i];
      if (!it) return;
      const cur = P.gear[it.slot];
      P.gear[it.slot] = it;
      P.bag.splice(i, 1);
      if (cur) P.bag.push(cur);
      A.sfx.upgrade(); recalc(); renderInv();
    },
    sellBag(i) {
      const it = P.bag[i];
      if (!it) return;
      P.mana += it.sell; P.bag.splice(i, 1); A.sfx.sell(); renderInv();
    },
  });

  function showTitle() {
    resetPlayerForTitle();
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) $('title-note').textContent = '📱 Heads up: this game needs a keyboard and mouse. Touch controls are not supported.';
    ui.show('title', true);
    ui.show('end', false); ui.show('pause', false); ui.show('inv', false);
    ui.buildHeroCards(S.classId);
  }
  function resetPlayerForTitle() {
    S.mode = 'title';
    P.x = 0; P.z = 8; P.alive = true;
    setHeroModel(S.classId);
    P.model.root.position.set(0, 0, 8);
    P.model.pivot.rotation.set(0, 0, 0);
    S.crystalHp = CR.hp; S.activePortals = [];
  }

  /* ============================== boot ============================== */
  ui.buildTowerBar();
  showTitle();
  requestAnimationFrame(frame);

  // exposed for debugging / automated self-checks
  DD.game = {
    S, P, cam, aim, world, scene, camera, renderer, step,
    get enemies() { return enemies; }, get towers() { return towers; }, get projectiles() { return projectiles; }, get eprojs() { return eprojs; }, get pickups() { return pickups; },
    newGame, startWave, placeTower, canPlace, spawnEnemy, damageEnemy, damageCrystal, damagePlayer, gainXp, rollItem, addItem, recalc, tstats,
    upgradeTower, heroAttack, heroSpecial, endGame, setPaused, openInv, selectTower, tryPlace, updateAim, keys, mouse,
    bossForWave, buildWaveQueue, upgradeCost, sellValue, repairCost, selectedHero: () => S.classId,
  };
})();
