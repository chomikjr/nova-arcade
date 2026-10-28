# Nova Arcade

A modern browser game site: hub page, accounts, free/Pro plans, animated backgrounds, generated music and sound effects, and a shared game engine. Plain HTML/CSS/JS — no build step, no dependencies.

## Run it

Open `index.html` directly, or serve the folder (recommended):

```bash
cd nova-arcade
python3 -m http.server 8080      # then visit http://localhost:8080
```

Works on any static host (GitHub Pages, Netlify, Vercel, Nginx on a Raspberry Pi…).

## Files

```
index.html            Hub: hero, game library, features, plans, leaderboard
assets/core.css       Design tokens + shared components (buttons, modals, toasts…)
assets/core.js        Arcade core: config, game registry, auth, scores, settings,
                      audio engine, background presets, shared modals
assets/game.css       Game page layout (top bar, HUD, stage, overlays, side panel)
assets/game-shell.js  Game engine every game plugs into
games/_template.html  Commented template / example game ("Orb Rush")
games/snake.html      Neon Snake — full game built on the template
```

## Adding a game

1. Copy `games/_template.html` → `games/yourgame.html` and write your logic in
   `start / update / render / input` (the header comment documents the whole `g` API).
2. Add an entry to the `games` array at the top of `assets/core.js`:
   ```js
   { id: 'yourgame', title: 'Your Game', path: 'games/yourgame.html',
     tier: 'free', status: 'live', tagline: 'One-line pitch', tags: ['Arcade'], hue: 200 }
   ```
   Optional: add a thumbnail animation to `THUMBS` in `index.html` and set `thumb: 'yourgame'`.

The shell gives you the menu/options screen, countdown, pause, game-over with
records and confetti, keyboard/swipe/D-pad input, hi-DPI scaling, particles,
screen shake, SFX, saved scores, leaderboard and the side panel for free.

## Accounts & the Pro plan

**Accounts are currently client-side** (stored in `localStorage`, passwords
hashed with PBKDF2). That's fine for a free tier, but anyone can edit their own
browser storage, so **don't gate paid features on it**.

When you set up payments:

1. Replace `signUp`, `logIn`, `logOut`, `current` in `Arcade.auth` (core.js)
   with calls to a real backend (Supabase, Firebase Auth, your own API).
   Nothing else in the site needs to change.
2. Return `plan: 'pro'` from `current()` for paying users — `isPro()` reads it.
3. In `config.pro` set `available: true`, `priceLabel`, and `checkoutUrl`
   (e.g. a Stripe Payment Link). The upgrade buttons start working automatically.
4. Move `scores` to the backend too if you want global leaderboards.

What's already wired to the Pro flag: Pro-only games (`tier: 'pro'`), Pro
options in any game (`pro: true` on a choice — e.g. Snake's Maze mode and
Rainbow/Galaxy skins), and premium backgrounds (`pro: true` in `PRESETS`).

## Customizing

- **Site name / Pro copy**: `config` in `core.js`
- **Colors**: CSS variables at the top of `core.css` (accent themes below them)
- **Backgrounds**: add a preset to `PRESETS` in `core.js` (`setup` + `draw`)
- **Music**: add a track to `TRACKS` in `core.js` (bpm, chords, `step()` sequencer)
- **Sound effects**: add a function to `SFX` in `core.js`, call with `g.sfx('name')`
