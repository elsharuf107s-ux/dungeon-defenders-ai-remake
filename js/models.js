/* =====================================================================
   DUNGEON PRETENDERS - procedural models (all geometry, zero assets)
   ===================================================================== */
(function () {
  'use strict';
  const DD = (window.DD = window.DD || {});
  const T = THREE;
  const PI = Math.PI;

  /* ---------- helpers ---------- */
  const gc = {};
  function G(kind) {
    const a = Array.prototype.slice.call(arguments, 1);
    const k = kind + ':' + a.join(',');
    if (!gc[k]) gc[k] = new T[kind + 'Geometry'](...a);
    return gc[k];
  }
  function newCtx() {
    const c = { mats: [] };
    c.m = (color, extra) => {
      const m = new T.MeshLambertMaterial(Object.assign({ color }, extra || {}));
      c.mats.push(m);
      return m;
    };
    // glowing (unlit) material - never flashes
    c.glow = (color, extra) => new T.MeshBasicMaterial(Object.assign({ color }, extra || {}));
    return c;
  }
  function mk(geo, mat, x, y, z, shadow) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = shadow !== false;
    return m;
  }
  function add(parent, child) { parent.add(child); return child; }

  /* ---------- humanoid base ---------- */
  function humanoid(ctx, o) {
    const root = new T.Group();
    const pivot = add(root, new T.Group());
    const body = add(pivot, new T.Group());
    body.scale.setScalar(o.scale || 1);
    const skin = ctx.m(o.skin), torsoM = ctx.m(o.torso), legM = ctx.m(o.legs);
    const sleeveM = o.sleeve ? ctx.m(o.sleeve) : torsoM;

    function limb(x, y, w, h, mat) {
      const p = add(body, new T.Group());
      p.position.set(x, y, 0);
      p.add(mk(G('Box', w, h, w * 1.15), mat, 0, -h / 2, 0));
      return p;
    }
    const legL = limb(-0.17, 0.5, 0.21, 0.5, legM);
    const legR = limb(0.17, 0.5, 0.21, 0.5, legM);
    const torso = add(body, mk(G('Box', 0.64, 0.64, 0.42), torsoM, 0, 0.82, 0));
    const armL = limb(-0.43, 1.1, 0.18, 0.55, sleeveM);
    const armR = limb(0.43, 1.1, 0.18, 0.55, sleeveM);
    armL.add(mk(G('Sphere', 0.11, 8, 6), skin, 0, -0.56, 0));
    armR.add(mk(G('Sphere', 0.11, 8, 6), skin, 0, -0.56, 0));

    const head = add(body, new T.Group());
    head.position.y = 1.52;
    head.add(mk(G('Sphere', 0.4, 16, 12), skin, 0, 0, 0));
    if (o.eyes !== false) {
      const white = ctx.m(0xffffff);
      const pup = ctx.m(o.pupil || 0x161616);
      [-1, 1].forEach((s) => {
        head.add(mk(G('Sphere', 0.105, 10, 8), white, s * 0.15, 0.06, 0.32, false));
        head.add(mk(G('Sphere', 0.055, 8, 6), pup, s * 0.15, 0.06, 0.41, false));
      });
    }
    return { root, pivot, body, head, torso, legL, legR, armL, armR, mats: ctx.mats, ctx };
  }

  /* ---------- HEROES ---------- */
  function hero(classId) {
    const ctx = newCtx();
    const C = DD.data.CLASSES[classId].colors;
    const h = humanoid(ctx, { skin: C.skin, torso: C.torso, legs: C.legs });
    const { head, armR, armL, body, torso } = h;
    const weapon = new T.Group();

    if (classId === 'squire') {
      head.add(mk(G('Cylinder', 0.44, 0.44, 0.46, 14), ctx.m(C.accent), 0, 0.14, 0));
      head.add(mk(G('Cylinder', 0.3, 0.44, 0.14, 14), ctx.m(C.accent), 0, 0.42, 0));
      head.add(mk(G('Box', 0.52, 0.07, 0.06), ctx.m(0x111111), 0, 0.12, 0.42, false));
      head.add(mk(G('Box', 0.08, 0.22, 0.5), ctx.m(0xd23b3b), 0, 0.52, 0));
      torso.add(mk(G('Box', 0.7, 0.2, 0.46), ctx.m(C.accent), 0, 0.2, 0));
      // wooden sword, blade forward from fist
      weapon.position.set(0, -0.56, 0);
      weapon.rotation.x = PI / 2;
      weapon.add(mk(G('Box', 0.09, 0.28, 0.09), ctx.m(0x5b3a22), 0, 0.05, 0));
      weapon.add(mk(G('Box', 0.4, 0.07, 0.12), ctx.m(0xd8b45a), 0, 0.2, 0));
      weapon.add(mk(G('Box', 0.15, 1.15, 0.05), ctx.m(0xb98954), 0, 0.82, 0));
      weapon.add(mk(G('Box', 0.17, 0.12, 0.06), ctx.m(0x8a6238), 0.08, 0.95, 0));
      armR.add(weapon);
      const shield = mk(G('Cylinder', 0.42, 0.42, 0.08, 18), ctx.m(0x3d63b8), -0.14, -0.3, 0.14);
      shield.rotation.x = PI / 2;
      armL.add(shield);
      const boss = mk(G('Sphere', 0.1, 8, 6), ctx.m(0xffd23f), -0.14, -0.3, 0.2);
      armL.add(boss);
    } else if (classId === 'wizard') {
      const robe = mk(G('Cone', 0.62, 1.05, 14), ctx.m(C.torso), 0, 0.62, 0);
      body.add(robe);
      body.add(mk(G('Cylinder', 0.34, 0.34, 0.1, 12), ctx.m(C.accent), 0, 0.86, 0)); // belt
      head.add(mk(G('Cylinder', 0.66, 0.66, 0.05, 18), ctx.m(0x4a2a80), 0, 0.28, 0));
      const hat = mk(G('Cone', 0.42, 0.9, 14), ctx.m(0x4a2a80), 0, 0.72, 0);
      head.add(hat);
      const tip = mk(G('Cone', 0.16, 0.45, 10), ctx.m(0x4a2a80), 0.05, 1.28, -0.12);
      tip.rotation.x = -0.6;
      head.add(tip);
      head.add(mk(G('Sphere', 0.07, 8, 6), ctx.glow(0xffd23f), 0.05, 1.5, -0.35, false));
      const beard = mk(G('Cone', 0.28, 0.6, 8), ctx.m(0xf2f2f2), 0, -0.34, 0.2);
      beard.rotation.x = PI + 0.25;
      head.add(beard);
      weapon.position.set(0, -0.5, 0.12);
      weapon.add(mk(G('Cylinder', 0.045, 0.055, 2.0, 8), ctx.m(0x6b4a2b), 0, 0.3, 0));
      const orb = mk(G('Sphere', 0.17, 12, 10), ctx.glow(0xffa040), 0, 1.38, 0, false);
      weapon.add(orb);
      h.orb = orb;
      armR.add(weapon);
    } else if (classId === 'huntress') {
      const hood = mk(G('Sphere', 0.46, 14, 10, 0, PI * 2, 0, PI * 0.62), ctx.m(C.torso), 0, 0.02, -0.04);
      head.add(hood);
      const pt = mk(G('Sphere', 0.14, 8, 6), ctx.m(0x6b3a1e), 0, 0.05, -0.44);
      head.add(pt);
      const ptail = mk(G('Cone', 0.12, 0.5, 8), ctx.m(0x6b3a1e), 0, -0.2, -0.5);
      ptail.rotation.x = PI - 0.3;
      head.add(ptail);
      const quiver = mk(G('Cylinder', 0.12, 0.1, 0.62, 8), ctx.m(0x7b4a22), 0.16, 1.02, -0.3);
      quiver.rotation.z = -0.25;
      body.add(quiver);
      for (let i = 0; i < 3; i++) {
        const ar = mk(G('Cylinder', 0.015, 0.015, 0.3, 4), ctx.m(0xeeeeee), 0.1 + i * 0.05, 1.4, -0.3, false);
        ar.rotation.z = -0.25;
        body.add(ar);
      }
      // bow in left hand, string axis vertical, bulging forward
      const bow = new T.Group();
      bow.position.set(0, -0.54, 0.05);
      const arc = mk(G('Torus', 0.55, 0.035, 6, 14, PI), ctx.m(0x7b4a22), 0, 0, 0);
      arc.rotation.set(0, -PI / 2, -PI / 2);
      bow.add(arc);
      bow.add(mk(G('Box', 0.012, 1.1, 0.012), ctx.m(0xffffff), 0, 0, 0, false));
      armL.add(bow);
      armL.rotation.x = -1.35;
      bow.rotation.x = 1.35;
      h.bow = bow;
      h.armLRest = -1.35;
    } else if (classId === 'monk') {
      torso.add(mk(G('Box', 0.68, 0.14, 0.46), ctx.m(0x5a2f12), 0, -0.1, 0)); // sash
      head.add(mk(G('Torus', 0.4, 0.045, 6, 18), ctx.m(0xd23b3b), 0, 0.14, 0));
      head.children[0].scale.set(1, 1.0, 1);
      const trail = mk(G('Box', 0.06, 0.4, 0.04), ctx.m(0xd23b3b), 0.2, 0.0, -0.4);
      head.add(trail);
      weapon.position.set(0, -0.5, 0.1);
      weapon.add(mk(G('Cylinder', 0.045, 0.05, 1.9, 8), ctx.m(0x9a6a3a), 0, 0.3, 0));
      // rubber duck
      const duck = new T.Group();
      duck.position.set(0, 1.3, 0);
      duck.add(mk(G('Sphere', 0.15, 10, 8), ctx.m(0xffe033), 0, 0, 0));
      duck.add(mk(G('Sphere', 0.1, 10, 8), ctx.m(0xffe033), 0, 0.17, 0.08));
      const beak = mk(G('Cone', 0.04, 0.1, 6), ctx.m(0xff8a1f), 0, 0.17, 0.2);
      beak.rotation.x = PI / 2;
      duck.add(beak);
      weapon.add(duck);
      armR.add(weapon);
    }
    h.weapon = weapon;
    h.root.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
    return h;
  }

  /* ---------- ENEMIES ---------- */
  function addEars(head, ctx, color, size) {
    [-1, 1].forEach((s) => {
      const ear = mk(G('Cone', 0.13 * size, 0.5 * size, 6), ctx.m(color), s * 0.42 * size, 0.1, 0);
      ear.rotation.z = -s * 1.35;
      head.add(ear);
    });
  }
  function angryBrows(head, ctx) {
    [-1, 1].forEach((s) => {
      const b = mk(G('Box', 0.17, 0.045, 0.05), ctx.m(0x222222), s * 0.15, 0.2, 0.37, false);
      b.rotation.z = -s * 0.45;
      head.add(b);
    });
  }

  function buildEnemy(typeId, bossDef) {
    const ctx = newCtx();
    const base = bossDef ? bossDef.base : typeId;
    const bs = bossDef ? bossDef.scale : 1;
    let h;

    if (base === 'gobbo') {
      h = humanoid(ctx, { skin: 0x6bbf4a, torso: 0x7a5230, legs: 0x5aa23c, scale: 0.88 * bs, pupil: 0xaa1111 });
      addEars(h.head, ctx, 0x6bbf4a, 1);
      angryBrows(h.head, ctx);
      add(h.head, mk(G('Cone', 0.07, 0.2, 6), ctx.m(0x5aa23c), 0, -0.02, 0.42)).rotation.x = PI / 2;
      const club = new T.Group();
      club.position.set(0, -0.55, 0.1);
      club.rotation.x = PI / 2;
      club.add(mk(G('Cylinder', 0.07, 0.1, 0.9, 6), ctx.m(0x7a5a38), 0, 0.4, 0));
      club.add(mk(G('Sphere', 0.17, 8, 6), ctx.m(0x7a5a38), 0, 0.85, 0));
      h.armR.add(club);
      if (bossDef) {
        const gold = ctx.m(0xffd23f);
        h.head.add(mk(G('Cylinder', 0.36, 0.4, 0.2, 10), gold, 0, 0.42, 0));
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * PI * 2;
          h.head.add(mk(G('Cone', 0.08, 0.22, 4), gold, Math.sin(a) * 0.34, 0.62, Math.cos(a) * 0.34));
        }
        // cape
        const cape = mk(G('Box', 0.7, 0.9, 0.05), ctx.m(0xb02a2a), 0, 0.85, -0.3);
        h.body.add(cape);
      }
    } else if (base === 'slinger') {
      h = humanoid(ctx, { skin: 0x4aa3bf, torso: 0x34506b, legs: 0x3b87a1, scale: 0.88, pupil: 0xaa1111 });
      addEars(h.head, ctx, 0x4aa3bf, 1);
      angryBrows(h.head, ctx);
      const sling = new T.Group();
      sling.position.set(0, -0.58, 0.12);
      sling.add(mk(G('Torus', 0.18, 0.018, 5, 12), ctx.m(0x8a6a3a), 0, 0, 0));
      sling.add(mk(G('Sphere', 0.1, 8, 6), ctx.m(0x777788), 0, 0, 0));
      h.armR.add(sling);
      h.armR.rotation.x = -0.4;
      h.sling = sling;
    } else if (base === 'kabloomer') {
      h = humanoid(ctx, { skin: 0xe8812f, torso: 0x3a3a46, legs: 0xc96b21, scale: 0.8, pupil: 0x111111 });
      addEars(h.head, ctx, 0xe8812f, 0.8);
      const bomb = mk(G('Sphere', 0.34, 14, 12), ctx.m(0x222228), 0, 0.62, 0);
      h.head.add(bomb);
      h.head.add(mk(G('Cylinder', 0.04, 0.04, 0.22, 5), ctx.m(0x886644), 0.0, 1.0, 0));
      const flame = mk(G('Sphere', 0.1, 8, 6), ctx.glow(0xffc030), 0, 1.15, 0, false);
      h.head.add(flame);
      h.flame = flame;
      h.armL.rotation.z = 0.5; h.armR.rotation.z = -0.5;
    } else if (base === 'orkward') {
      h = humanoid(ctx, { skin: 0x7b8f4e, torso: 0x5b3e2b, legs: 0x5f7040, scale: 1.3 * bs, pupil: 0xaa1111 });
      angryBrows(h.head, ctx);
      [-1, 1].forEach((s) => {
        const tusk = mk(G('Cone', 0.05, 0.22, 5), ctx.m(0xf4f0dc), s * 0.14, -0.14, 0.38);
        h.head.add(tusk);
      });
      const club = new T.Group();
      club.position.set(0, -0.55, 0.1);
      club.rotation.x = PI / 2;
      club.add(mk(G('Cylinder', 0.09, 0.15, 1.2, 6), ctx.m(0x6b4a2b), 0, 0.55, 0));
      club.add(mk(G('Sphere', 0.26, 8, 6), ctx.m(0x6b4a2b), 0, 1.15, 0));
      h.armR.add(club);
      if (bossDef) {
        // giant fizzy cola can hat
        const can = mk(G('Cylinder', 0.3, 0.3, 0.62, 14), ctx.m(0xd62828), 0, 0.72, 0);
        h.head.add(can);
        h.head.add(mk(G('Cylinder', 0.31, 0.31, 0.2, 14), ctx.m(0xffffff), 0, 0.72, 0));
        h.head.add(mk(G('Cylinder', 0.24, 0.3, 0.06, 14), ctx.m(0xcccccc), 0, 1.05, 0));
      }
    } else if (base === 'ogre') {
      h = humanoid(ctx, { skin: 0x8d9a5b, torso: 0x6b4a2f, legs: 0x60683a, scale: 1.7, pupil: 0x222222 });
      angryBrows(h.head, ctx);
      h.body.add(mk(G('Sphere', 0.5, 12, 10), ctx.m(0x8d9a5b), 0, 0.78, 0.18));
      // necktie + briefcase: the Ogre-Achiever
      const tie = mk(G('Box', 0.1, 0.42, 0.04), ctx.m(0xd62828), 0, 0.98, 0.43);
      h.body.add(tie);
      h.body.add(mk(G('Box', 0.16, 0.12, 0.05), ctx.m(0xd62828), 0, 1.2, 0.43));
      [-1, 1].forEach((s) => {
        h.head.add(mk(G('Cone', 0.05, 0.2, 5), ctx.m(0xf4f0dc), s * 0.15, -0.14, 0.38));
      });
      const bc = new T.Group();
      bc.position.set(0, -0.62, 0.12);
      bc.add(mk(G('Box', 0.5, 0.36, 0.14), ctx.m(0x5a3a1c), 0, -0.16, 0));
      bc.add(mk(G('Box', 0.12, 0.04, 0.06), ctx.m(0xd8b45a), 0, -0.34, 0));
      h.armR.add(bc);
    } else if (base === 'pidgeodon') {
      const root = new T.Group();
      const pivot = add(root, new T.Group());
      const body = add(pivot, new T.Group());
      const gray = ctx.m(0x9aa0b4);
      const b = mk(G('Sphere', 0.5, 14, 12), gray, 0, 0, 0);
      b.scale.set(0.9, 0.85, 1.25);
      body.add(b);
      const head = add(body, new T.Group());
      head.position.set(0, 0.28, 0.55);
      head.add(mk(G('Sphere', 0.28, 12, 10), ctx.m(0xaeb4c8), 0, 0, 0));
      const beak = mk(G('Cone', 0.07, 0.24, 6), ctx.m(0xffa51f), 0, -0.03, 0.3);
      beak.rotation.x = PI / 2;
      head.add(beak);
      [-1, 1].forEach((s) => {
        head.add(mk(G('Sphere', 0.07, 8, 6), ctx.m(0xffffff), s * 0.13, 0.08, 0.2, false));
        head.add(mk(G('Sphere', 0.035, 6, 5), ctx.m(0xaa1111), s * 0.13, 0.08, 0.26, false));
        const horn = mk(G('Cone', 0.05, 0.22, 5), ctx.m(0xd23b3b), s * 0.12, 0.28, 0.0);
        horn.rotation.z = -s * 0.3;
        head.add(horn);
      });
      const tail = mk(G('Cone', 0.18, 0.55, 5), ctx.m(0x7b8198), 0, 0.05, -0.75);
      tail.rotation.x = -PI / 2 - 0.2;
      body.add(tail);
      const wingL = new T.Group(), wingR = new T.Group();
      wingL.position.set(-0.35, 0.15, 0.05); wingR.position.set(0.35, 0.15, 0.05);
      wingL.add(mk(G('Box', 1.1, 0.06, 0.62), ctx.m(0x7b8198), -0.55, 0, 0));
      wingR.add(mk(G('Box', 1.1, 0.06, 0.62), ctx.m(0x7b8198), 0.55, 0, 0));
      body.add(wingL); body.add(wingR);
      h = { root, pivot, body, head, wingL, wingR, mats: ctx.mats, ctx };
    } else if (base === 'dragon') {
      const root = new T.Group();
      const pivot = add(root, new T.Group());
      const body = add(pivot, new T.Group());
      body.scale.setScalar(bs);
      const red = ctx.m(0xb23a3a), belly = ctx.m(0xf0c36a), dark = ctx.m(0x7e2323);
      const torso = mk(G('Sphere', 1.3, 16, 12), red, 0, 1.7, 0);
      torso.scale.set(1, 0.88, 1.5);
      body.add(torso);
      const bel = mk(G('Sphere', 1.2, 14, 10), belly, 0, 1.45, 0.15);
      bel.scale.set(0.92, 0.75, 1.4);
      body.add(bel);
      const neck = mk(G('Cylinder', 0.5, 0.75, 1.6, 10), red, 0, 2.6, 1.7);
      neck.rotation.x = 0.75;
      body.add(neck);
      const head = add(body, new T.Group());
      head.position.set(0, 3.35, 2.45);
      head.add(mk(G('Sphere', 0.75, 14, 12), red, 0, 0, 0));
      const snout = mk(G('Box', 0.6, 0.45, 0.8), red, 0, -0.18, 0.62);
      head.add(snout);
      [-1, 1].forEach((s) => {
        head.add(mk(G('Sphere', 0.2, 10, 8), ctx.m(0xffffff), s * 0.38, 0.28, 0.5, false));
        head.add(mk(G('Sphere', 0.1, 8, 6), ctx.m(0x111111), s * 0.38, 0.28, 0.67, false));
        const horn = mk(G('Cone', 0.13, 0.7, 6), ctx.m(0xf4f0dc), s * 0.4, 0.78, -0.1);
        horn.rotation.z = -s * 0.35;
        head.add(horn);
        head.add(mk(G('Sphere', 0.07, 6, 5), dark, s * 0.15, 0.0, 1.0, false));
      });
      // tiny party hat: he was invited to a party. This is the party.
      const hat = mk(G('Cone', 0.28, 0.62, 10), ctx.m(0x3fa7ff), 0, 0.95, 0.05);
      head.add(hat);
      head.add(mk(G('Sphere', 0.1, 8, 6), ctx.m(0xffd23f), 0, 1.3, 0.05, false));
      const tail = mk(G('Cone', 0.6, 2.8, 8), red, 0, 1.3, -2.8);
      tail.rotation.x = -PI / 2 - 0.15;
      body.add(tail);
      const wingL = new T.Group(), wingR = new T.Group();
      wingL.position.set(-0.9, 2.5, -0.2); wingR.position.set(0.9, 2.5, -0.2);
      wingL.add(mk(G('Box', 2.8, 0.1, 1.9), ctx.m(0xcf5a3a), -1.4, 0, 0));
      wingR.add(mk(G('Box', 2.8, 0.1, 1.9), ctx.m(0xcf5a3a), 1.4, 0, 0));
      body.add(wingL); body.add(wingR);
      const legs = [];
      [[-0.85, 0.9], [0.85, 0.9], [-0.85, -0.9], [0.85, -0.9]].forEach((p) => {
        const l = add(body, new T.Group());
        l.position.set(p[0], 1.0, p[1]);
        l.add(mk(G('Cylinder', 0.32, 0.28, 1.0, 8), dark, 0, -0.5, 0));
        l.add(mk(G('Box', 0.5, 0.18, 0.7), dark, 0, -1.0, 0.12));
        legs.push(l);
      });
      h = { root, pivot, body, head, wingL, wingR, legL: legs[0], legR: legs[1], legL2: legs[3], legR2: legs[2], mats: ctx.mats, ctx };
      // Mouth glow used for the fire-breath telegraph
      const glow = mk(G('Sphere', 0.22, 8, 6), ctx.glow(0xff7a1a), 0, -0.2, 1.05, false);
      glow.visible = false;
      head.add(glow);
      h.mouth = glow;
    }

    // hit-point bar (billboarded, attached to the position-only root)
    const height = bossDef ? (base === 'dragon' ? 5.0 : 2.4 * bs + 0.4) : { gobbo: 2.0, slinger: 2.0, kabloomer: 2.3, orkward: 3.0, pidgeodon: 1.3, ogre: 4.0 }[base] || 2.2;
    const barW = bossDef ? 3.2 : Math.max(1.2, height * 0.5);
    const bar = makeBar(barW, bossDef ? 0.22 : 0.14);
    bar.group.position.y = height + 0.35;
    bar.group.visible = false;
    h.root.add(bar.group);
    h.bar = bar;
    h.height = height;
    return h;
  }

  const barBg = new T.MeshBasicMaterial({ color: 0x1a1020, transparent: true, depthTest: false });
  function makeBar(w, hgt) {
    const group = new T.Group();
    const bg = new T.Mesh(G('Plane', 1, 1), barBg);
    bg.scale.set(w + 0.08, hgt + 0.08, 1);
    bg.renderOrder = 20;
    const fgMat = new T.MeshBasicMaterial({ color: 0xe84a4a, transparent: true, depthTest: false });
    const fg = new T.Mesh(G('Plane', 1, 1), fgMat);
    fg.geometry = G('Plane', 1, 1);
    fg.renderOrder = 21;
    group.add(bg); group.add(fg);
    function set(frac, color) {
      frac = Math.max(0, Math.min(1, frac));
      fg.scale.set(Math.max(0.001, w * frac), hgt, 1);
      fg.position.x = -w / 2 + (w * frac) / 2;
      fg.position.z = 0.01;
      if (color != null) fgMat.color.setHex(color);
    }
    set(1);
    return { group, set, fgMat };
  }

  /* ---------- TOWERS ---------- */
  function tower(typeId, yawToCrystal) {
    const ctx = newCtx();
    const root = new T.Group();
    const body = add(root, new T.Group());
    const out = { root, body, mats: ctx.mats, ctx };
    const stone = ctx.m(0x7f7a8c), wood = ctx.m(0x8a5a2e), woodD = ctx.m(0x5d3c1e);

    if (typeId === 'wall') {
      body.rotation.y = yawToCrystal || 0;
      const card = ctx.m(0xc89a5a), tape = ctx.m(0xe9d9a8), dark = ctx.m(0xa57a40);
      body.add(mk(G('Box', 2.0, 1.7, 0.9), card, 0, 0.85, 0));
      body.add(mk(G('Box', 2.04, 0.12, 0.94), dark, 0, 1.68, 0));
      body.add(mk(G('Box', 0.34, 1.72, 0.94), tape, 0, 0.86, 0));
      const fragile = mk(G('Box', 0.7, 0.3, 0.02), ctx.m(0xd63a3a), -0.6, 0.9, 0.46, false);
      body.add(fragile);
      body.add(mk(G('Box', 0.5, 0.06, 0.03), ctx.m(0xffffff), -0.6, 0.9, 0.47, false));
      const flap = mk(G('Box', 0.9, 0.04, 0.45), dark, 0.5, 1.8, -0.15);
      flap.rotation.x = -0.6;
      body.add(flap);
    } else if (typeId === 'sling') {
      body.add(mk(G('Cylinder', 0.8, 0.95, 0.5, 10), stone, 0, 0.25, 0));
      body.add(mk(G('Cylinder', 0.18, 0.22, 1.6, 8), wood, 0, 1.2, 0));
      const head = add(body, new T.Group());
      head.position.set(0, 2.05, 0);
      const fork = mk(G('Box', 0.12, 0.7, 0.12), woodD, 0, 0.1, 0);
      head.add(fork);
      [-1, 1].forEach((s) => {
        const arm = mk(G('Box', 0.12, 0.7, 0.12), woodD, s * 0.28, 0.5, 0.15);
        arm.rotation.z = -s * 0.35; arm.rotation.x = 0.3;
        head.add(arm);
      });
      const band = mk(G('Box', 0.6, 0.05, 0.05), ctx.m(0xd23b3b), 0, 0.8, 0.28, false);
      head.add(band);
      const rock = mk(G('Sphere', 0.17, 8, 6), ctx.m(0x88889a), 0, 0.8, 0.12);
      head.add(rock);
      out.head = head;
    } else if (typeId === 'mortar') {
      body.add(mk(G('Box', 1.5, 0.45, 1.5), stone, 0, 0.22, 0));
      const head = add(body, new T.Group());
      head.position.set(0, 0.9, 0);
      const barrel = mk(G('Cylinder', 0.5, 0.7, 1.5, 12), ctx.m(0x2f2f3a), 0, 0.2, 0.1);
      barrel.rotation.x = 0.95;
      head.add(barrel);
      const ball = mk(G('Sphere', 0.42, 12, 10), ctx.m(0xa8452a), 0, 0.88, 0.62);
      head.add(ball);
      const herb = mk(G('Cone', 0.1, 0.22, 5), ctx.m(0x3fb04a), 0, 1.3, 0.62);
      head.add(herb);
      add(head, mk(G('Torus', 0.5, 0.07, 6, 12), ctx.m(0x555566), 0, 0.64, 0.4)).rotation.x = 0.95 + PI / 2 - 0.05;
      out.head = head;
    } else if (typeId === 'zap') {
      body.add(mk(G('Cylinder', 0.7, 0.85, 0.35, 10), stone, 0, 0.17, 0));
      const cu = ctx.m(0xc27a3a);
      body.add(mk(G('Cylinder', 0.35, 0.55, 0.9, 10), cu, 0, 0.8, 0));
      body.add(mk(G('Cylinder', 0.22, 0.35, 0.8, 10), cu, 0, 1.6, 0));
      add(body, mk(G('Torus', 0.5, 0.06, 6, 14), ctx.m(0xe9a95b), 0, 1.0, 0)).rotation.x = PI / 2;
      add(body, mk(G('Torus', 0.34, 0.05, 6, 14), ctx.m(0xe9a95b), 0, 1.7, 0)).rotation.x = PI / 2;
      const top = mk(G('Sphere', 0.3, 12, 10), ctx.glow(0x7ae8ff), 0, 2.2, 0, false);
      body.add(top);
      out.top = top;
      out.head = null;
    } else if (typeId === 'trap') {
      const peel = add(body, new T.Group());
      const yel = ctx.m(0xffe23a);
      const base = mk(G('Sphere', 0.55, 12, 8), yel, 0, 0.05, 0);
      base.scale.set(1, 0.22, 0.7);
      peel.add(base);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2 + 0.4;
        const p = mk(G('Cone', 0.2, 0.9, 5), yel, Math.sin(a) * 0.55, 0.12, Math.cos(a) * 0.55);
        p.rotation.set(Math.cos(a) * 1.35, 0, -Math.sin(a) * 1.35);
        peel.add(p);
        const tip = mk(G('Sphere', 0.07, 5, 4), ctx.m(0x5a3b12), Math.sin(a) * 0.95, 0.1, Math.cos(a) * 0.95, false);
        peel.add(tip);
      }
      body.rotation.y = Math.random() * PI * 2;
      out.peel = peel;
    } else if (typeId === 'hug') {
      body.add(mk(G('Cylinder', 0.7, 0.85, 0.4, 10), stone, 0, 0.2, 0));
      const pink = ctx.m(0xf59ac0);
      body.add(mk(G('Cylinder', 0.42, 0.5, 1.2, 10), pink, 0, 1.0, 0));
      body.add(mk(G('Cylinder', 0.36, 0.42, 0.9, 10), ctx.m(0xffc2dc), 0, 2.0, 0));
      // arms: a hug
      [-1, 1].forEach((s) => {
        const a = mk(G('Cylinder', 0.1, 0.1, 0.9, 6), pink, s * 0.45, 1.1, 0.25);
        a.rotation.z = s * 0.55; a.rotation.x = -0.6;
        body.add(a);
      });
      [-1, 1].forEach((s) => {
        body.add(mk(G('Sphere', 0.07, 6, 5), ctx.m(0x222222), s * 0.14, 2.05, 0.34, false));
      });
      const smile = mk(G('Torus', 0.12, 0.025, 5, 10, PI), ctx.m(0x222222), 0, 1.9, 0.36, false);
      smile.rotation.z = PI;
      body.add(smile);
      const heart = new T.Group();
      heart.position.y = 2.9;
      const hm = ctx.glow(0xff3b7f);
      [-1, 1].forEach((s) => {
        const lobe = mk(G('Sphere', 0.2, 8, 6), hm, s * 0.14, 0.08, 0, false);
        heart.add(lobe);
      });
      const tipH = mk(G('Cone', 0.31, 0.46, 4), hm, 0, -0.18, 0, false);
      tipH.rotation.x = PI;
      tipH.rotation.y = PI / 4;
      heart.add(tipH);
      body.add(heart);
      out.heart = heart;
    }

    // upgrade pips
    const pips = add(root, new T.Group());
    out.pips = pips;
    out.setLevel = function (lv, topY) {
      while (pips.children.length) pips.remove(pips.children[0]);
      for (let i = 0; i < lv; i++) {
        const s = mk(G('Sphere', 0.1, 6, 5), pipMat, (i - (lv - 1) / 2) * 0.28, 0, 0, false);
        pips.add(s);
      }
      pips.position.y = topY;
    };
    const height = { wall: 2.2, sling: 3.1, mortar: 2.4, zap: 2.9, trap: 0.6, hug: 3.6 }[typeId];
    out.height = height;
    const bar = makeBar(1.5, 0.14);
    bar.group.position.y = height + 0.9;
    bar.group.visible = false;
    root.add(bar.group);
    out.bar = bar;
    out.setLevel(1, height + 0.55);
    return out;
  }
  const pipMat = new T.MeshBasicMaterial({ color: 0xffd23f });

  /* ---------- WORLD ---------- */
  function stoneTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#4b4560';
    x.fillRect(0, 0, 256, 256);
    const n = 4, s = 256 / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = 100 + Math.floor(Math.random() * 28);
        x.fillStyle = 'rgb(' + (v - 10) + ',' + (v - 14) + ',' + (v + 22) + ')';
        x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
        x.fillStyle = 'rgba(255,255,255,0.05)';
        x.fillRect(i * s + 3, j * s + 3, s - 6, 5);
        for (let k = 0; k < 14; k++) {
          x.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.1) + ')';
          x.fillRect(i * s + 6 + Math.random() * (s - 18), j * s + 6 + Math.random() * (s - 18), 5 + Math.random() * 10, 3 + Math.random() * 6);
        }
      }
    }
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(22, 22);
    tex.anisotropy = 4;
    return tex;
  }

  function seeded(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function buildWorld(scene) {
    const D = DD.data;
    const R = D.ARENA_R;
    const ctx = newCtx();
    const world = { portals: [], torches: [], pointLights: [] };

    // floor
    const floorMat = new T.MeshLambertMaterial({ map: stoneTexture() });
    const floor = new T.Mesh(new T.CircleGeometry(R + 8, 72), floorMat);
    floor.rotation.x = -PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // outer darkness ring beyond the wall
    const abyss = new T.Mesh(new T.CircleGeometry(200, 32), new T.MeshBasicMaterial({ color: 0x120c1e }));
    abyss.rotation.x = -PI / 2;
    abyss.position.y = -0.4;
    scene.add(abyss);

    // curb
    const curb = new T.Mesh(new T.TorusGeometry(R + 0.6, 0.35, 6, 96), new T.MeshLambertMaterial({ color: 0x6a5f86 }));
    curb.rotation.x = PI / 2;
    curb.position.y = 0.2;
    curb.receiveShadow = true;
    scene.add(curb);

    // enemy lanes
    const portalAngles = [PI / 4, (5 * PI) / 4, (3 * PI) / 4, (7 * PI) / 4];
    const laneMat = new T.MeshBasicMaterial({ color: 0xb9a5ff, transparent: true, opacity: 0.16, depthWrite: false });
    portalAngles.forEach((a) => {
      const len = 34;
      const lane = new T.Mesh(new T.PlaneGeometry(4.6, len), laneMat);
      lane.rotation.order = 'YXZ';
      lane.rotation.x = -PI / 2;
      lane.rotation.y = a;
      lane.position.set(Math.sin(a) * (len / 2 + 2.5), 0.02, Math.cos(a) * (len / 2 + 2.5));
      scene.add(lane);
    });

    // battlement ring
    const wallMat = new T.MeshLambertMaterial({ color: 0x5b5078 });
    const N = 44;
    const segs = new T.InstancedMesh(new T.BoxGeometry(5.6, 4.2, 2.2), wallMat, N);
    const crenels = new T.InstancedMesh(new T.BoxGeometry(1.5, 1.1, 2.4), wallMat, N);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(1, 1, 1), pos = new T.Vector3();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * PI * 2;
      const r = R + 5.2;
      pos.set(Math.sin(a) * r, 2.1, Math.cos(a) * r);
      q.setFromAxisAngle(new T.Vector3(0, 1, 0), a);
      m4.compose(pos, q, sc);
      segs.setMatrixAt(i, m4);
      pos.set(Math.sin(a) * r, 4.6, Math.cos(a) * r);
      m4.compose(pos, q, sc);
      crenels.setMatrixAt(i, m4);
    }
    segs.castShadow = segs.receiveShadow = true;
    scene.add(segs); scene.add(crenels);

    // props (kept outside the playable circle)
    const rnd = seeded(1337);
    const propMats = {
      crate: new T.MeshLambertMaterial({ color: 0x9a6b3a }),
      barrel: new T.MeshLambertMaterial({ color: 0x7b4a22 }),
      band: new T.MeshLambertMaterial({ color: 0x3a3a46 }),
      duck: new T.MeshLambertMaterial({ color: 0xffe033 }),
      sign: new T.MeshLambertMaterial({ color: 0xffd23f }),
      beak: new T.MeshLambertMaterial({ color: 0xff8a1f }),
      stone: new T.MeshLambertMaterial({ color: 0x8a8498 }),
    };
    for (let i = 0; i < 22; i++) {
      const a = rnd() * PI * 2;
      if (portalAngles.some((p) => Math.abs(Math.atan2(Math.sin(a - p), Math.cos(a - p))) < 0.22)) continue;
      const r = R + 1.8 + rnd() * 2.2;
      const g = new T.Group();
      g.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      g.rotation.y = rnd() * PI * 2;
      const kind = rnd();
      if (kind < 0.4) {
        g.add(mk(G('Box', 1.1, 1.1, 1.1), propMats.crate, 0, 0.55, 0));
        if (rnd() > 0.5) g.add(mk(G('Box', 0.8, 0.8, 0.8), propMats.crate, 0.2, 1.5, 0.1));
      } else if (kind < 0.75) {
        g.add(mk(G('Cylinder', 0.5, 0.45, 1.1, 10), propMats.barrel, 0, 0.55, 0));
        add(g, mk(G('Torus', 0.48, 0.05, 5, 12), propMats.band, 0, 0.3, 0)).rotation.x = PI / 2;
        add(g, mk(G('Torus', 0.48, 0.05, 5, 12), propMats.band, 0, 0.8, 0)).rotation.x = PI / 2;
      } else if (kind < 0.9) {
        const sign = mk(G('Cone', 0.55, 1.0, 3), propMats.sign, 0, 0.5, 0);
        sign.rotation.y = PI / 6;
        g.add(sign);
      } else {
        g.add(mk(G('Cylinder', 0.8, 0.9, 0.7, 8), propMats.stone, 0, 0.35, 0));
        const body = mk(G('Sphere', 0.7, 12, 10), propMats.duck, 0, 1.2, 0);
        body.scale.set(1, 0.85, 1.2);
        g.add(body);
        g.add(mk(G('Sphere', 0.42, 10, 8), propMats.duck, 0, 1.95, 0.45));
        const beak = mk(G('Cone', 0.12, 0.34, 6), propMats.beak, 0, 1.9, 0.9);
        beak.rotation.x = PI / 2;
        g.add(beak);
      }
      scene.add(g);
    }

    // torches
    const flameMat = new T.MeshBasicMaterial({ color: 0xffa23a });
    for (let i = 0; i < 8; i++) {
      const a = PI / 8 + (i * PI) / 4 + (i % 2 ? 0 : 0);
      const r = R + 2.2;
      const g = new T.Group();
      g.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      g.add(mk(G('Cylinder', 0.14, 0.2, 2.6, 6), propMats.barrel, 0, 1.3, 0));
      g.add(mk(G('Cylinder', 0.36, 0.2, 0.32, 8), propMats.band, 0, 2.7, 0));
      const flame = new T.Mesh(G('Cone', 0.3, 0.8, 7), flameMat);
      flame.position.y = 3.3;
      g.add(flame);
      scene.add(g);
      world.torches.push(flame);
      if (i % 2 === 0) {
        const pl = new T.PointLight(0xff9a3a, 0.9, 34);
        pl.position.set(g.position.x * 0.92, 3.6, g.position.z * 0.92);
        scene.add(pl);
        world.pointLights.push(pl);
      }
    }

    // portals
    portalAngles.forEach((a, idx) => {
      const g = new T.Group();
      const r = R - 3;
      g.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      g.rotation.y = a + PI;
      const stoneM = new T.MeshLambertMaterial({ color: 0x4a3f66 });
      g.add(mk(G('Cylinder', 3.2, 3.6, 0.5, 14), stoneM, 0, 0.25, 0));
      const ringMat = new T.MeshLambertMaterial({ color: 0x8a4fe0, emissive: 0x3a1a70 });
      const ring = mk(G('Torus', 2.5, 0.42, 8, 24), ringMat, 0, 3.0, 0);
      g.add(ring);
      const discMat = new T.MeshBasicMaterial({ color: 0xb06bff, transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false });
      const disc = new T.Mesh(G('Circle', 2.4, 24), discMat);
      disc.position.set(0, 3.0, 0);
      g.add(disc);
      const disc2 = new T.Mesh(G('Ring', 0.5, 2.0, 5, 1), new T.MeshBasicMaterial({ color: 0xe0c4ff, transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false }));
      disc2.position.set(0, 3.0, 0.02);
      g.add(disc2);
      // dungeon-chic: a doormat
      g.add(mk(G('Box', 2.2, 0.06, 1.2), new T.MeshLambertMaterial({ color: 0x8a2a2a }), 0, 0.52, 1.9, false));
      scene.add(g);
      world.portals.push({ group: g, disc, disc2, ring, discMat, ringMat, pos: new T.Vector3(Math.sin(a) * (r - 1.5), 0, Math.cos(a) * (r - 1.5)), idx, angle: a });
    });

    // crystal
    const cg = new T.Group();
    cg.add(mk(G('Cylinder', 3.3, 3.8, 0.7, 20), new T.MeshLambertMaterial({ color: 0x6a5f86 }), 0, 0.35, 0));
    cg.add(mk(G('Cylinder', 2.7, 3.0, 0.4, 20), new T.MeshLambertMaterial({ color: 0x8a82a8 }), 0, 0.85, 0));
    const halo = new T.Mesh(G('Torus', 2.4, 0.08, 6, 40), new T.MeshBasicMaterial({ color: 0x66e6ff }));
    halo.rotation.x = PI / 2;
    halo.position.y = 1.1;
    cg.add(halo);
    const gemMat = new T.MeshPhongMaterial({ color: 0x62e6ff, emissive: 0x145f80, flatShading: true, shininess: 90, transparent: true, opacity: 0.93 });
    const gem = new T.Mesh(G('Icosahedron', 1.3, 0), gemMat);
    gem.scale.set(1, 1.4, 1);
    gem.position.y = 3.1;
    gem.castShadow = true;
    cg.add(gem);
    const eyes = new T.Group();
    eyes.position.y = 3.2;
    const pupils = [];
    [-1, 1].forEach((s) => {
      const e = new T.Mesh(G('Sphere', 0.32, 14, 12), new T.MeshBasicMaterial({ color: 0xffffff }));
      e.position.set(s * 0.46, 0.15, 1.15);
      eyes.add(e);
      const p = new T.Mesh(G('Sphere', 0.15, 10, 8), new T.MeshBasicMaterial({ color: 0x111111 }));
      p.position.set(s * 0.46, 0.15, 1.42);
      eyes.add(p);
      pupils.push({ mesh: p, bx: s * 0.46, by: 0.15 });
    });
    cg.add(eyes);
    const light = new T.PointLight(0x66e6ff, 1.5, 32);
    light.position.set(0, 4.2, 0);
    cg.add(light);
    scene.add(cg);
    world.crystal = { group: cg, gem, gemMat, eyes, pupils, light, halo };

    return world;
  }

  DD.models = { hero, enemy: buildEnemy, tower, buildWorld, makeBar, G };
})();
