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
games/play.html       Player page for the hosted open-source games
games/ports/          13 open-source games + covers (_thumbs)
supabase/setup.sql    Database schema, security rules and triggers
CREDITS.md            Authors and licenses of the hosted games
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

## Accounts (Supabase)

Accounts live in Supabase (project `nova-arcade`). The URL and publishable key
are in `config.cloud` in `assets/core.js`; both are safe to ship publicly —
security comes from the row-level-security rules in `supabase/setup.sql`.

- **What syncs:** high scores and stats, settings (background, music, accent…),
  per-game options, and save data from the open-source games.
- **Global leaderboard:** the `leaderboard` view, shown on the hub and in-game.
- **Plans are server-side:** `profiles.plan` can't be changed by players (blocked
  by column grants *and* a trigger). Only the database owner can grant Pro.
- **Owner account:** emails in `public.app_owner` (not in this repo) get Pro and the
  owner role automatically on sign-up, and only they can use the username "Ryan".
- **Email confirmation:** Supabase's built-in mailer only sends to your Supabase team
  members. Either turn off *Confirm email* (Authentication → Sign In / Providers →
  Email) or add a custom SMTP provider (Authentication → Emails → SMTP).
- If `config.cloud` is emptied, the site falls back to device-only accounts.

To grant Pro manually (e.g. after a payment) run in the SQL editor:
`update public.profiles set plan = 'pro' where username = 'someone';`

## Payments / Pro

1. Set `config.pro.available = true`, `priceLabel`, and `checkoutUrl` (e.g. a Stripe
   Payment Link). The upgrade buttons start working automatically.
2. Use a Stripe webhook (e.g. a Supabase Edge Function with the service key) to set
   `profiles.plan = 'pro'` when a payment succeeds.
3. **Vercel Hobby forbids commercial use** — move the project to Vercel Pro (or
   another host) before charging money.

Pro gating for the hosted open-source games is done in the page, so the raw game
folders (`games/ports/<id>/`) are still reachable by direct URL. For hard
enforcement, serve Pro files from Supabase Storage behind a signed URL.

## Hosted open-source games

13 games in `games/ports/`, each with its original license — see `CREDITS.md`.
They open through `games/play.html?g=<id>`. To add one: copy the built game
into `games/ports/<id>/`, add a `port({...})` entry in `core.js`, and drop a
640×400 cover in `games/ports/_thumbs/<id>.webp` (or use an animated `thumb`).

## Customizing

- **Site name / Pro copy**: `config` in `core.js`
- **Colors**: CSS variables at the top of `core.css` (accent themes below them)
- **Backgrounds**: add a preset to `PRESETS` in `core.js` (`setup` + `draw`)
- **Music**: add a track to `TRACKS` in `core.js` (bpm, chords, `step()` sequencer)
- **Sound effects**: add a function to `SFX` in `core.js`, call with `g.sfx('name')`
