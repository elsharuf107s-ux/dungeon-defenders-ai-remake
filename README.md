# 🛡️ Dungeon Pretenders

A goofy 3D tower-defense / action parody that runs in your browser. Pick a hero, build
cardboard walls and meatball cannons between waves, then jump into the fight and whack goblins
to defend the **Crystal of Moderate Importance** (it has googly eyes and it is very worried).

> A fan parody. Not affiliated with or endorsed by the makers of any other dungeon-based
> defense game. No goblins were harmed. Several were embarrassed.

## Play

No build step, no server, no install. Everything (including three.js) is vendored in the repo.

```bash
# just open it
xdg-open index.html        # or double-click index.html

# or serve it, if you prefer
python3 -m http.server 8000   # then visit http://localhost:8000
```

Needs a desktop browser with WebGL (current Chrome, Firefox, Edge or Safari) and a keyboard + mouse.
Touch screens are not supported.

## How it plays

1. **Build phase** – spend mana on towers and walls. Press `Enter` to start the wave early (you get a bonus).
2. **Combat phase** – enemies pour out of the purple portals and march on the crystal. Fight alongside your towers.
3. Kill things for **mana**, **XP** and **loot**. Level up, spend skill points, equip questionable gear.
4. Survive **15 waves** (with bosses on 5, 10 and 15) to win, then keep going in **endless mode** if you dare.

### Controls

| Input | Action |
| --- | --- |
| `W A S D` | Move (relative to the camera) |
| Mouse | Aim – your hero faces the cursor |
| Left click | Attack (hold to keep attacking) / place a tower in build mode |
| `1`–`6` | Select a tower and enter build mode (press again, `B` or `0` to leave) |
| `Q` | Hero special ability |
| `Space` | Dash (brief invulnerability) |
| `E` / `R` / `X` | Upgrade / repair / sell the tower under the cursor |
| `T` | Repair all towers you can afford |
| `Enter` | Start the next wave early |
| `I` | Inventory & skill points (freezes time) |
| Right-drag, `Z` / `C`, wheel | Rotate / zoom the camera |
| `P` / `Esc` | Pause |
| `M` | Mute |

### Heroes

| Hero | Style | Special | Tower bonus |
| --- | --- | --- | --- |
| 🛡️ **Sir Dent-a-Lot** (Squire-ish) | Tanky melee arc | Spin-to-Win | Cardboard Walls have double health |
| 🧙 **Wizzard Gary** (Apprentice-ish) | Splash fireballs | Meteor of Mild Inconvenience | Zap-o-Matics hit 60% harder |
| 🏹 **Robin Hoodie** (Huntress-ish) | Fast piercing arrows | Volley of Regret | Banana Traps do double damage |
| 🧘 **Brother Chill** (Monk-ish) | Knockback palm waves | Chakra Group Hug (heal + shove) | Group Hug Totems heal double |

### Towers

📦 **Cardboard Wall** · 🎯 **Slingshot Tower** · 🍖 **Meatball Mortar** (splash, ground only) ·
⚡ **Zap-o-Matic** (chain lightning) · 🍌 **Banana Trap** (stun) · 🤗 **Group Hug Totem** (heals)

Every tower upgrades to level 5. Towers heal a little between waves; repair the rest with `R` / `T`.

### Enemies

Gobbo, Gob-Slinger (ranged), Kabloomer (explodes on your stuff), Orkward, Pidgeodon (flies over walls)
and the Ogre-Achiever (tie and briefcase). Bosses: **Gobbo Prime, Slightly Larger Gobbo** (calls backup),
**Orc-a-Cola, the Fizzy Overlord** (ground-pound), **Drag-on and On** (fire breath, party hat).

## Project layout

```
index.html        page shell + HUD / screens markup
css/style.css     all styling
js/data.js        heroes, towers, enemies, loot tables, jokes  (balance lives here)
js/audio.js       synthesized sound effects + music (WebAudio, no asset files)
js/models.js      procedural 3D models and the arena (primitives only, no asset files)
js/ui.js          DOM layer: HUD, hero select, inventory, minimap
js/game.js        renderer, input, player, towers, enemy AI, waves, loot, main loop
vendor/           three.js r149 (MIT) – classic script build so it works from file://
```

## Hacking

`window.DD.game` exposes the live game state (`S`, `P`, `towers`, `enemies`, …) plus helpers such as
`step(dt)`, `placeTower`, `spawnEnemy`, `newGame` – handy for experiments and automated testing.
Tuning numbers (HP, damage, costs, wave budget) are in `js/data.js` and the `waveScale` / `buildWaveQueue`
functions in `js/game.js`.

## Credits

Built with [three.js](https://threejs.org/) (MIT License, see `vendor/three.LICENSE`).
