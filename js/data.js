/* =====================================================================
   DUNGEON PRETENDERS - game data
   Heroes, towers, enemies, loot tables and a truly unreasonable amount
   of jokes. Everything numeric lives here so balancing is one-stop.
   ===================================================================== */
(function () {
  'use strict';
  const DD = (window.DD = window.DD || {});

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  DD.data = {
    ARENA_R: 40,
    CAMPAIGN_WAVES: 15,
    CRYSTAL: { name: 'Crystal of Moderate Importance', hp: 1200, r: 2.3 },
    START_MANA: 380,
    BUILD_TIME_FIRST: 50,
    BUILD_TIME: 28,
    MAX_ENEMIES_ALIVE: 55,
    MAX_TOWERS: 45,
    MAX_BAG: 14,
    MAX_LEVEL: 40,
    TOWER_MAX_LV: 5,

    /* ---------------- HEROES ---------------- */
    CLASSES: {
      squire: {
        id: 'squire', name: 'Sir Dent-a-Lot', title: 'The Squire-ish', emoji: '🛡️',
        desc: 'A knight whose armor has seen better days. And worse days. Mostly worse. Hits things with a very large, very wooden sword.',
        hp: 280, speed: 6.6, dmg: 24, atkCd: 0.44, attack: 'melee', range: 3.5, arc: 2.1,
        attackName: 'Mighty Whack',
        special: { name: 'Spin-to-Win', cd: 11, desc: 'Spin like a top for 1 second, whacking everything nearby.' },
        bonus: { tower: 'wall', stat: 'hp', mult: 2.0, text: 'Cardboard Walls have DOUBLE health' },
        stats: { Health: 5, Damage: 3, Speed: 3, Range: 1 },
        colors: { skin: 0xf2c9a0, torso: 0x7f93b8, legs: 0x4d5a7c, accent: 0xc9d2e8 },
      },
      wizard: {
        id: 'wizard', name: 'Wizzard Gary', title: 'The Apprentice-ish', emoji: '🧙',
        desc: 'Failed his wizard exam twice but the robe was non-refundable. Hurls fireballs that are technically warm.',
        hp: 170, speed: 6.4, dmg: 26, atkCd: 0.62, attack: 'bolt', range: 24,
        attackName: 'Mildly Warm Fireball',
        special: { name: 'Meteor of Mild Inconvenience', cd: 14, desc: 'Drop a big rock on the cursor. It was nearby.' },
        bonus: { tower: 'zap', stat: 'dmg', mult: 1.6, text: 'Zap-o-Matics hit 60% harder' },
        stats: { Health: 2, Damage: 5, Speed: 3, Range: 5 },
        colors: { skin: 0xf2c9a0, torso: 0x6d3fb0, legs: 0x4a2a80, accent: 0xffd23f },
      },
      huntress: {
        id: 'huntress', name: 'Robin Hoodie', title: 'The Huntress-ish', emoji: '🏹',
        desc: 'Steals from the rich and gives to herself. Fires arrows at roughly the speed of a nervous hummingbird.',
        hp: 200, speed: 7.4, dmg: 13, atkCd: 0.27, attack: 'arrow', range: 30,
        attackName: 'Arrow Spam',
        special: { name: 'Volley of Regret', cd: 10, desc: 'Fire a fan of 11 arrows. Regret optional.' },
        bonus: { tower: 'trap', stat: 'dmg', mult: 2.0, text: 'Banana Traps do DOUBLE damage and stun longer' },
        stats: { Health: 3, Damage: 3, Speed: 5, Range: 5 },
        colors: { skin: 0xe9b88f, torso: 0x3b8a52, legs: 0x5e4a33, accent: 0x9be38b },
      },
      monk: {
        id: 'monk', name: 'Brother Chill', title: 'The Monk-ish', emoji: '🧘',
        desc: 'Achieved inner peace, then outer peace, then lost the rubber duck. Slaps enemies with spiritual palm waves.',
        hp: 230, speed: 6.9, dmg: 17, atkCd: 0.5, attack: 'palm', range: 8,
        attackName: 'Spiritual Slap',
        special: { name: 'Chakra Group Hug', cd: 16, desc: 'Heal yourself and your towers, and gently shove everybody else away.' },
        bonus: { tower: 'hug', stat: 'heal', mult: 2.0, text: 'Group Hug Totems heal DOUBLE and reach farther' },
        stats: { Health: 4, Damage: 2, Speed: 4, Range: 2 },
        colors: { skin: 0xe9b88f, torso: 0xf08a24, legs: 0xb35c10, accent: 0xffe08a },
      },
    },

    /* ---------------- TOWERS ---------------- */
    TOWER_ORDER: ['wall', 'sling', 'mortar', 'zap', 'trap', 'hug'],
    TOWERS: {
      wall: {
        id: 'wall', name: 'Cardboard Wall', emoji: '📦', cost: 40, hp: 460, r: 1.0, blocks: true,
        desc: 'Absorbs hits. Gets a little soggy. Regrets nothing.',
      },
      sling: {
        id: 'sling', name: 'Slingshot Tower', emoji: '🎯', cost: 100, hp: 170, r: 0.85, blocks: true,
        range: 14, dmg: 15, rate: 1.5, desc: 'Fires rocks. The rocks are free. We found them.',
      },
      mortar: {
        id: 'mortar', name: 'Meatball Mortar', emoji: '🍖', cost: 170, hp: 200, r: 1.0, blocks: true,
        range: 19, minRange: 4, dmg: 38, splash: 2.7, rate: 0.5, ground: true,
        desc: 'Lobs spicy meatballs. Splash damage and a mild seasoning. Ground only.',
      },
      zap: {
        id: 'zap', name: 'Zap-o-Matic', emoji: '⚡', cost: 150, hp: 150, r: 0.75, blocks: true,
        range: 10, dmg: 17, rate: 1.1, chain: 3, desc: 'Chain lightning. Do not lick.',
      },
      trap: {
        id: 'trap', name: 'Banana Trap', emoji: '🍌', cost: 60, hp: 90, r: 0.8, blocks: false,
        trigger: 1.6, dmg: 32, stun: 1.8, cooldown: 5, desc: 'Classic. Enemies slip, fall, and reconsider their life choices.',
      },
      hug: {
        id: 'hug', name: 'Group Hug Totem', emoji: '🤗', cost: 130, hp: 230, r: 0.85, blocks: true,
        radius: 9, heal: 0.05, desc: 'Heals nearby towers and you. Free emotional support.',
      },
    },

    /* ---------------- ENEMIES ---------------- */
    ENEMIES: {
      gobbo: {
        id: 'gobbo', name: 'Gobbo', hp: 34, speed: 3.7, dmg: 7, atkCd: 0.9, reach: 1.5, r: 0.45,
        xp: 6, mana: 4, cost: 1, unlock: 1, aggro: 6.5,
      },
      slinger: {
        id: 'slinger', name: 'Gob-Slinger', hp: 26, speed: 3.1, dmg: 8, atkCd: 1.6, range: 9.5, ranged: true,
        r: 0.45, xp: 9, mana: 6, cost: 2, unlock: 2, aggro: 9,
      },
      kabloomer: {
        id: 'kabloomer', name: 'Kabloomer', hp: 24, speed: 6.3, dmg: 70, r: 0.45, xp: 10, mana: 7,
        cost: 2, unlock: 3, explode: true, splash: 3.3, aggro: 0,
      },
      orkward: {
        id: 'orkward', name: 'Orkward', hp: 190, speed: 2.35, dmg: 21, atkCd: 1.3, reach: 2.0, r: 0.85,
        xp: 25, mana: 14, cost: 4, unlock: 4, aggro: 5.5,
      },
      pidgeodon: {
        id: 'pidgeodon', name: 'Pidgeodon', hp: 46, speed: 4.9, dmg: 9, atkCd: 1.0, reach: 1.7, r: 0.5,
        flying: true, xp: 14, mana: 9, cost: 3, unlock: 6, aggro: 0,
      },
      ogre: {
        id: 'ogre', name: 'Ogre-Achiever', hp: 680, speed: 1.95, dmg: 50, atkCd: 2.0, reach: 2.9, r: 1.25,
        xp: 70, mana: 40, cost: 9, unlock: 9, aoe: 2.6, aggro: 5,
      },
    },

    BOSSES: [
      {
        id: 'boss_gobbo', name: 'Gobbo Prime, Slightly Larger Gobbo', base: 'gobbo', scale: 3.0, hp: 1500, speed: 2.9,
        dmg: 26, atkCd: 1.1, reach: 3.2, r: 1.4, xp: 300, mana: 150, summon: { every: 11, type: 'gobbo', n: 4 },
        intro: 'He is exactly like a Gobbo, but bigger. This is his entire personality.',
      },
      {
        id: 'boss_orc', name: 'Orc-a-Cola, the Fizzy Overlord', base: 'orkward', scale: 2.5, hp: 3600, speed: 2.5,
        dmg: 40, atkCd: 1.4, reach: 3.5, r: 1.8, xp: 600, mana: 300, stomp: { every: 7, radius: 7, dmg: 45 },
        intro: 'Shake well before fighting. Do not open near crystals.',
      },
      {
        id: 'boss_dragon', name: 'Drag-on and On', base: 'dragon', scale: 1.0, hp: 6800, speed: 2.4,
        dmg: 55, atkCd: 1.6, reach: 4, r: 2.2, xp: 1000, mana: 500, fire: { every: 4.5, n: 3, dmg: 38, splash: 2.4 },
        intro: 'An ancient dragon that will not stop telling you about his day.',
      },
    ],

    /* ---------------- LOOT ---------------- */
    SLOTS: ['weapon', 'hat', 'armor', 'boots', 'trinket'],
    SLOT_LABEL: { weapon: 'Weapon', hat: 'Hat', armor: 'Armor', boots: 'Boots', trinket: 'Trinket' },
    SLOT_ICON: { weapon: '🗡️', hat: '🎩', armor: '👕', boots: '🥾', trinket: '💍' },
    RARITY: [
      { name: 'Meh', color: '#b8b8c4', mult: 1.0 },
      { name: 'Decent', color: '#6fdc6f', mult: 1.35 },
      { name: 'Fancy', color: '#58a8ff', mult: 1.8 },
      { name: 'Epic-ish', color: '#c77dff', mult: 2.4 },
      { name: 'Absurd', color: '#ffae3d', mult: 3.2 },
    ],
    LOOT_PREFIX: [
      'Slightly Used', 'Suspiciously Sticky', 'Gluten-Free', 'Mildly Cursed', 'Artisanal', 'Haunted',
      'Discount', 'Extra Crispy', 'Lukewarm', 'Organic', 'Pre-Chewed', 'Totally Legit', 'Sentient', 'Gently Damp',
      'Overpriced', 'Handmade', 'Reheated', 'Unlicensed',
    ],
    LOOT_BASE: {
      weapon: ['Stick', 'Spork', 'Flail', 'Baguette', 'Fish', 'Noodle', 'Rolling Pin', 'Pool Noodle', 'Wand', 'Spatula', 'Trout'],
      hat: ['Bucket', 'Traffic Cone', 'Beanie', 'Colander', 'Fedora', 'Cooking Pot', 'Top Hat', 'Lampshade', 'Sombrero'],
      armor: ['Bathrobe', 'Bubble Wrap', 'Chainmail Vest', 'Tuxedo', 'Barrel', 'Cardigan', 'Pizza Box', 'Onesie', 'Tarp'],
      boots: ['Flip-Flops', 'Crocs', 'Roller Skates', 'Slippers', 'Moon Boots', 'Clogs', 'Galoshes', 'Fuzzy Socks'],
      trinket: ['Lucky Sock', 'Fidget Spinner', 'Rubber Duck', 'Participation Trophy', 'Mood Ring', 'Tamagotchi', 'Monkey Paw', 'Coupon'],
    },
    LOOT_SUFFIX: [
      '', '', '', 'of Mild Burning', 'of Questionable Origin', 'of Dubious Quality', 'of the Underpaid Intern',
      'of +1 Vibes', 'of Moderate Doom', '(Used)', 'of Regret', 'of Slight Damp', 'of Tuesday',
    ],

    /* ---------------- JOKES ---------------- */
    QUIPS: {
      start: [
        'Defend the Crystal of Moderate Importance! It has feelings. Probably.',
        'Welcome, hero! Please place your towers in the designated Tower Zone (everywhere).',
        'The crystal has been in the family for generations. The family is mostly moths.',
      ],
      build: [
        'Build phase! Time to arrange cardboard in a threatening manner.',
        'Remember: a wall is just a tower that gave up on its dreams.',
        'Breathe. Plan. Spend all your mana on bananas.',
        'Fun fact: 9 out of 10 goblins avoid walls. The tenth one has a bad attitude.',
        'You can start the wave early with ENTER. The goblins are always ready. They have nothing else going on.',
      ],
      wave: [
        'Here they come! Look busy!',
        'Goblins incoming. They brought snacks. For themselves.',
        'Remember your training! ...You skipped training? Well then.',
        'Enemies detected. Morale: questionable.',
      ],
      clear: [
        'Wave cleared! The crystal is mildly impressed.',
        'Victory! Please hold your applause. Hold it until the next wave, actually.',
        'The goblins have been sent to a farm upstate.',
        'Nailed it. Or at least dented it.',
      ],
      crystalLow: [
        'The crystal is sweating. Crystals shouldn\'t sweat.',
        'Crystal health critical! Please do the opposite of that.',
        'The crystal\'s eyes are doing that nervous thing again!',
      ],
      death: [
        'You died. It happens. To you, specifically.',
        'Hero down! Please respawn at the nearest awkward silence.',
        'Ouch. That looked like it hurt. It did.',
      ],
      over: [
        'The Crystal of Moderate Importance is now the Crystal of Mild Rubble.',
        'And that is why we do not leave the door open.',
        'You have been defeated. But hey, you were brave. And damp.',
        'Game over. Please reflect on your wall placement.',
      ],
      win: [
        'You saved the crystal! It is moderately grateful.',
        'Legends will sing of this day. Quietly. In a library.',
      ],
      loot: ['Ooh, shiny!', 'Is that... a sock?', 'Loot acquired. Smells interesting.'],
    },
  };

  /* Small helpers shared by other files */
  DD.util = {
    rand,
    pick,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    fmt: (n) => (n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(Math.floor(n))),
  };
})();
