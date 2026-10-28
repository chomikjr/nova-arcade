/* ==========================================================================
   NOVA ARCADE — core.js
   Shared by the hub and every game page. Exposes window.Arcade with:
     Arcade.config      site + plan config
     Arcade.games       game registry (add new games here)
     Arcade.auth        accounts (client-side demo — swap for a real backend)
     Arcade.scores      per-user high scores + stats
     Arcade.settings    persisted user settings
     Arcade.audio       synthesized SFX + generative music (no audio files needed)
     Arcade.bg          animated background presets
     Arcade.ui          modals, toasts, settings/auth/profile/upgrade panels
     Arcade.icon(name)  inline SVG icons
   ========================================================================== */
(function () {
  'use strict';

  const ROOT = (() => {
    const src = document.currentScript && document.currentScript.src;
    return src ? src.replace(/assets\/core\.js(\?.*)?$/, '') : './';
  })();

  /* ------------------------------------------------------------------------
     CONFIG — edit these when you set up the backend and payments
     ------------------------------------------------------------------------ */
  const config = {
    siteName: 'Nova Arcade',
    root: ROOT,
    /* Cloud accounts (Supabase). Paste your project's URL and *anon/publishable*
       key here (Project Settings → API). Both are safe to ship in the browser —
       security comes from the row-level-security rules in supabase/setup.sql.
       Leave empty to fall back to device-only accounts. */
    cloud: {
      supabaseUrl: 'https://oazqmjnkkyqwxpsglgcb.supabase.co',
      supabaseAnonKey: 'sb_publishable_h-I9xAYcRlVRze13k2v40Q_CZ6Rf8C3'
    },
    pro: {
      available: false,             // flip to true once checkout is wired up
      priceLabel: 'Coming soon',    // e.g. '$4.99 / month'
      checkoutUrl: null,            // e.g. your Stripe Checkout / Payment Link URL
      perks: [
        'Pro-only games like HexGL, Classic 8-Ball and Astray',
        'Premium animated backgrounds',
        'Exclusive skins and modes in every game',
        'Early access to new games',
        'No ads, ever'
      ]
    }
  };

  /* ------------------------------------------------------------------------
     GAME REGISTRY — the hub builds its grid from this list.
     status: 'live' | 'soon'   tier: 'free' | 'pro'
     Original games: path → their page.  Open-source ports: port → folder in
     games/ports/, opened through games/play.html. image → cover in
     games/ports/_thumbs/, thumb → an animated canvas cover in index.html.
     ------------------------------------------------------------------------ */
  const port = (o) => Object.assign({ status: 'live', path: 'games/play.html?g=' + o.id }, o);
  const games = [
    { id: 'snake', title: 'Neon Snake', path: 'games/snake.html', tier: 'free', status: 'live', original: true,
      tagline: 'Classic snake with power-ups, combos, skins and four modes.',
      tags: ['Arcade', 'Classic'], hue: 150, thumb: 'snake' },
    port({ id: '2048', title: '2048', tier: 'free', tags: ['Puzzle'], hue: 35, image: '2048',
      tagline: 'Slide, merge, and chase the 2048 tile.', author: 'Gabriele Cirulli', license: 'MIT', repo: 'gabrielecirulli/2048', controls: 'Arrow keys / swipe' }),
    port({ id: 'hextris', title: 'Hextris', tier: 'free', tags: ['Puzzle', 'Arcade'], hue: 205, image: 'hextris',
      tagline: 'Fast-paced hexagonal Tetris. Rotate to match falling blocks.', author: 'Hextris team', license: 'GPL-3.0', repo: 'Hextris/hextris', controls: 'Left / Right to rotate' }),
    port({ id: 'clumsy-bird', title: 'Clumsy Bird', tier: 'free', tags: ['Arcade'], hue: 95, image: 'clumsy-bird',
      tagline: 'Flap through the pipes. One more try, always.', author: 'Ellison Leão', license: 'GPL-3.0', repo: 'ellisonleao/clumsy-bird', controls: 'Space / click to flap' }),
    port({ id: 'trex', title: 'T-Rex Runner', tier: 'free', tags: ['Arcade', 'Classic'], hue: 0, thumb: 'trex',
      tagline: 'The famous offline dino, endlessly running.', author: 'wayou (from Chromium)', license: 'BSD-3-Clause', repo: 'wayou/t-rex-runner', controls: 'Space / Up to jump, Down to duck' }),
    port({ id: 'tetris', title: 'Tetris Classic', tier: 'free', tags: ['Puzzle', 'Classic'], hue: 230, image: 'tetris',
      tagline: 'Clean, no-frills falling-block puzzling.', author: 'Jake Gordon', license: 'MIT', repo: 'jakesgordon/javascript-tetris', controls: 'Arrows to move/rotate, Space to start' }),
    port({ id: 'asteroids', title: 'Asteroids', tier: 'free', tags: ['Shooter', 'Classic'], hue: 280, thumb: 'void',
      tagline: 'Vector-style rock blasting in deep space.', author: 'Doug McInnes', license: 'MIT', repo: 'dmcinnes/HTML5-Asteroids', controls: 'Arrows to fly, Space to shoot' }),
    port({ id: 'radius-raid', title: 'Radius Raid', tier: 'free', tags: ['Shooter'], hue: 340, image: 'radius-raid',
      tagline: 'Twin-stick space shooter packed with power-ups.', author: 'Jack Rugile', license: 'MIT', repo: 'jackrugile/radius-raid-js13k', controls: 'WASD to move, mouse to aim & fire' }),
    port({ id: 'adarkroom', title: 'A Dark Room', tier: 'free', tags: ['Adventure', 'Idle'], hue: 25, thumb: 'darkroom',
      tagline: 'A minimalist text adventure that grows into something huge.', author: 'Doublespeak Games', license: 'MPL-2.0', repo: 'doublespeakgames/adarkroom', controls: 'Mouse' }),
    port({ id: 'particle-clicker', title: 'Particle Clicker', tier: 'free', tags: ['Idle'], hue: 15, image: 'particle-clicker',
      tagline: 'Run a physics lab and discover the universe, one click at a time.', author: 'CERN Webfest team', license: 'MIT', repo: 'particle-clicker/particle-clicker', controls: 'Mouse' }),
    port({ id: 'hearts', title: 'Hearts', tier: 'free', tags: ['Cards'], hue: 140, image: 'hearts',
      tagline: 'The classic trick-taking card game against three AI players.', author: 'Yujian Yao', license: 'BSD-2-Clause', repo: 'yyjhao/html5-hearts', controls: 'Mouse' }),
    port({ id: 'hexgl', title: 'HexGL', tier: 'pro', tags: ['Racing', '3D'], hue: 190, image: 'hexgl',
      tagline: 'Futuristic anti-gravity racing in full 3D.', author: 'Thibaut Despoulain', license: 'MIT', repo: 'BKcore/HexGL', controls: 'Arrows to steer, A/D to air-brake' }),
    port({ id: 'pool', title: 'Classic 8-Ball', tier: 'pro', tags: ['Sports'], hue: 120, image: 'pool',
      tagline: 'Realistic 8-ball pool versus a friend or the computer.', author: 'Chen Shmilovich', license: 'MIT', repo: 'henshmi/Classic-Pool-Game', controls: 'Mouse to aim, hold to power' }),
    port({ id: 'astray', title: 'Astray', tier: 'pro', tags: ['Puzzle', '3D'], hue: 50, thumb: 'maze',
      tagline: 'Roll a glowing ball through dark 3D labyrinths.', author: 'Rye Terrell', license: 'Unlicense', repo: 'wwwtyro/Astray', controls: 'Arrow keys / WASD' }),
    { id: 'pong', title: 'Neon Pong', path: null, tier: 'pro', status: 'soon', original: true,
      tagline: 'Fast paddles, curve shots, local 2-player.', tags: ['Arcade', 'Multiplayer'], hue: 320, thumb: 'pong' },
    { id: 'bricks', title: 'Brick Storm', path: null, tier: 'pro', status: 'soon', original: true,
      tagline: 'Breakout with multiball chaos and boss levels.', tags: ['Arcade'], hue: 25, thumb: 'bricks' }
  ];

  /* ------------------------------------------------------------------------
     STORAGE — localStorage is the fast local cache. When signed in to a cloud
     account, synced keys are pushed to the backend automatically.
     ------------------------------------------------------------------------ */
  const SYNCED = /^(scores|settings|opts\.|portsaves)/;
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('nova.' + key); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('nova.' + key, JSON.stringify(value)); }
      catch (e) { return false; }
      if (SYNCED.test(key) && typeof cloud !== 'undefined') cloud.schedulePush();
      return true;
    },
    remove(key) { try { localStorage.removeItem('nova.' + key); } catch (e) {} }
  };

  const emit = (name, detail) => window.dispatchEvent(new CustomEvent('arcade:' + name, { detail }));
  const on = (name, fn) => window.addEventListener('arcade:' + name, (e) => fn(e.detail));

  /* ------------------------------------------------------------------------
     ICONS (Lucide-style, stroke-based)
     ------------------------------------------------------------------------ */
  const ICONS = {
    gamepad: '<line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/>',
    settings: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    volumeX: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    crown: '<path d="m2 6 4 11h12l4-11-6 5-4-7-4 7z"/><path d="M6 21h12"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    keyboard: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    skip: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>',
    phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------------------------------
     CLOUD (Supabase) — accounts, synced player data, global leaderboards.
     Everything is protected by row-level security in supabase/setup.sql:
     players can only read/write their own data and can never change their
     own plan. When config.cloud is empty the site falls back to device-only
     accounts (localAuth below).
     ------------------------------------------------------------------------ */
  const cloud = {
    enabled: !!(config.cloud.supabaseUrl && config.cloud.supabaseAnonKey),
    client: null, user: null, profile: null, _push: 0, _pulling: false,
    async init() {
      if (!this.enabled) return;
      try {
        let mod = null;
        for (const src of ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', 'https://esm.sh/@supabase/supabase-js@2', 'https://unpkg.com/@supabase/supabase-js@2/dist/module/index.js?module']) {
          try { mod = await import(src); if (mod && mod.createClient) break; } catch (e) { mod = null; }
        }
        if (!mod) throw new Error('could not load the Supabase library');
        this.client = mod.createClient(config.cloud.supabaseUrl, config.cloud.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'nova.sb-auth' }
        });
      } catch (e) { console.warn('[nova] cloud unavailable, using device accounts', e); this.enabled = false; return; }
      this.client.auth.onAuthStateChange((evt, session) => {
        if (evt === 'SIGNED_OUT') { this.user = null; this.profile = null; store.remove('cloudProfile'); emit('auth', null); }
        if (evt === 'PASSWORD_RECOVERY') setTimeout(() => openResetPassword(), 300);
      });
      const { data } = await this.client.auth.getSession();
      if (data.session) await this._loadUser(data.session.user);
      else if (store.get('cloudProfile', null)) { store.remove('cloudProfile'); emit('auth', null); }
    },
    async _loadUser(user) {
      this.user = user;
      const { data: prof, error } = await this.client.from('profiles').select('*').eq('id', user.id).single();
      if (error) { console.warn('[nova] profile', error); return; }
      this.profile = prof; store.set('cloudProfile', prof);
      await this.pull();
      emit('auth', auth.current());
    },
    /* merge server data into the local cache (server wins for settings/options,
       scores keep the best of both so nothing played offline is lost) */
    async pull() {
      if (!this.user) return;
      this._pulling = true;
      try {
        const { data } = await this.client.from('player_data').select('data').eq('user_id', this.user.id).maybeSingle();
        const remote = (data && data.data) || {};
        const id = this.user.id, all = store.get('scores', {});
        const local = all[id] || {}, rs = remote.scores || {};
        Object.keys(rs).forEach((g) => {
          const l = local[g], r = rs[g];
          if (!l) { local[g] = r; return; }
          local[g] = { best: Math.max(l.best, r.best), plays: Math.max(l.plays, r.plays), total: Math.max(l.total, r.total),
            time: Math.max(l.time, r.time), history: (l.history.length >= r.history.length ? l.history : r.history) };
        });
        all[id] = local; store.set('scores', all);
        if (remote.settings) { Object.assign(settings._s, remote.settings); store.set('settings', settings._s); applySettings(); bg.applyPage && document.body && bg.applyPage(); }
        Object.keys(remote.opts || {}).forEach((k) => store.set('opts.' + k, remote.opts[k]));
        if (remote.portsaves) store.set('portsaves', Object.assign({}, store.get('portsaves', {}), remote.portsaves));
      } finally { this._pulling = false; }
      this.schedulePush(10);
    },
    schedulePush(delay) {
      if (!this.user || this._pulling) return;
      clearTimeout(this._push);
      this._push = setTimeout(() => this.push(), delay == null ? 1500 : delay);
    },
    async push() {
      if (!this.user) return;
      const id = this.user.id, opts = {};
      Object.keys(localStorage).forEach((k) => { if (k.startsWith('nova.opts.')) opts[k.slice(10)] = store.get(k.slice(5), {}); });
      const scoresMine = (store.get('scores', {})[id]) || {};
      const payload = { scores: scoresMine, settings: settings._s, opts, portsaves: store.get('portsaves', {}) };
      const { error } = await this.client.from('player_data').upsert({ user_id: id, data: payload, updated_at: new Date().toISOString() });
      if (error) console.warn('[nova] sync', error);
      const rows = Object.entries(scoresMine).filter(([, r]) => r.best > 0).map(([g, r]) => ({ user_id: id, game_id: g, best: r.best, plays: r.plays, updated_at: new Date().toISOString() }));
      if (rows.length) { const { error: e2 } = await this.client.from('scores').upsert(rows); if (e2) console.warn('[nova] scores', e2); }
      emit('synced');
    }
  };
  window.addEventListener('pagehide', () => { if (cloud.user) cloud.push(); });

  /* ------------------------------------------------------------------------
     AUTH — one interface for both modes. Cloud: email + password via
     Supabase. Device: hashed passwords in localStorage (fallback only).
     ------------------------------------------------------------------------ */
  async function hashPassword(password, salt) {
    if (window.crypto && crypto.subtle) {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
      return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 2166136261; const s = salt + ':' + password;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return 'fnv' + (h >>> 0).toString(16);
  }
  const randomSalt = () => Array.from(crypto.getRandomValues(new Uint8Array(12))).map((b) => b.toString(16).padStart(2, '0')).join('');

  const friendlyAuthError = (e) => {
    const m = (e && (e.message || e.msg || String(e))) || '';
    if (/invalid login credentials/i.test(m)) return 'Email or password is incorrect.';
    if (/already registered|already exists/i.test(m)) return 'An account with that email already exists. Try logging in.';
    if (/database error saving new user|reserved|duplicate key/i.test(m)) return 'That username is taken. Try another one.';
    if (/email not confirmed/i.test(m)) return 'Confirm your email first — check your inbox for the link.';
    if (/rate limit|too many/i.test(m)) return 'Too many attempts. Wait a minute and try again.';
    if (/password should be/i.test(m)) return 'Use a stronger password (at least 6 characters).';
    return m || 'Something went wrong. Try again.';
  };

  const auth = {
    get mode() { return cloud.enabled ? 'cloud' : 'local'; },
    validateUsername(u) {
      if (!u) return 'Choose a username.';
      if (u.length < 3) return 'Usernames need at least 3 characters.';
      if (u.length > 18) return 'Keep it to 18 characters or fewer.';
      if (!/^[a-zA-Z0-9_]+$/.test(u)) return 'Letters, numbers and underscores only.';
      return '';
    },
    validatePassword(p) { if (!p) return 'Enter a password.'; if (p.length < 6) return 'Use at least 6 characters.'; return ''; },
    validateEmail(e) { if (!e) return 'Enter your email.'; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'That doesn’t look like an email address.'; return ''; },
    async usernameAvailable(u) {
      if (cloud.enabled) await ready;
      if (cloud.enabled && cloud.client) { const { data, error } = await cloud.client.rpc('username_available', { u }); return error ? true : !!data; }
      return !store.get('users', {})[u.toLowerCase()];
    },
    /* returns { user } or { needsConfirm: true } */
    async signUp(username, password, email) {
      if (cloud.enabled) await ready;
      if (cloud.enabled) {
        if (!(await auth.usernameAvailable(username))) throw new Error('That username is taken. Try another one.');
        const { data, error } = await cloud.client.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: location.origin + location.pathname } });
        if (error) throw new Error(friendlyAuthError(error));
        if (!data.session) return { needsConfirm: true };
        await cloud._loadUser(data.user);
        return { user: auth.current() };
      }
      const users = store.get('users', {}), key = username.toLowerCase();
      if (users[key]) throw new Error('That username is taken on this device.');
      const salt = randomSalt();
      users[key] = { username, salt, hash: await hashPassword(password, salt), created: Date.now(), plan: 'free', hue: Math.floor(Math.random() * 360) };
      store.set('users', users); store.set('session', { user: key }); emit('auth', auth.current());
      return { user: auth.current() };
    },
    async logIn(identifier, password) {
      if (cloud.enabled) await ready;
      if (cloud.enabled) {
        const { data, error } = await cloud.client.auth.signInWithPassword({ email: identifier, password });
        if (error) throw new Error(friendlyAuthError(error));
        await cloud._loadUser(data.user);
        return auth.current();
      }
      const u = store.get('users', {})[identifier.toLowerCase()];
      if (!u || (await hashPassword(password, u.salt)) !== u.hash) throw new Error('Username or password is incorrect.');
      store.set('session', { user: identifier.toLowerCase() }); emit('auth', auth.current());
      return auth.current();
    },
    async resetPassword(email) {
      await ready;
      const { error } = await cloud.client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) throw new Error(friendlyAuthError(error));
    },
    async updatePassword(pw) {
      const { error } = await cloud.client.auth.updateUser({ password: pw });
      if (error) throw new Error(friendlyAuthError(error));
    },
    async logOut() {
      if (cloud.enabled && cloud.user) { await cloud.push(); await cloud.client.auth.signOut(); }
      store.remove('session'); store.remove('cloudProfile'); emit('auth', null);
    },
    current() {
      if (cloud.enabled) {
        const p = cloud.profile || store.get('cloudProfile', null);
        return p ? { id: p.id, username: p.username, created: Date.parse(p.created_at), plan: p.plan, role: p.role, hue: p.hue, cloud: true } : null;
      }
      const s = store.get('session', null); if (!s) return null;
      const u = store.get('users', {})[s.user];
      return u ? { id: s.user, username: u.username, created: u.created, plan: u.plan, hue: u.hue } : null;
    },
    /* Pro is decided by the server (profiles.plan), never by the client */
    isPro() { const u = auth.current(); return !!(u && (u.plan === 'pro' || u.role === 'owner')); },
    isOwner() { const u = auth.current(); return !!(u && u.role === 'owner'); }
  };

  /* ------------------------------------------------------------------------
     SCORES & STATS
     ------------------------------------------------------------------------ */
  const blankRec = () => ({ best: 0, plays: 0, total: 0, time: 0, history: [] });
  const scores = {
    _key() { const u = auth.current(); return u ? u.id : '__guest'; },
    _all() { return store.get('scores', {}); },
    get(gameId) { return (this._all()[this._key()] || {})[gameId] || blankRec(); },
    best(gameId) { return this.get(gameId).best; },
    _write(gameId, fn) {
      const all = this._all(), k = this._key();
      all[k] = all[k] || {}; const r = all[k][gameId] || blankRec();
      const out = fn(r); all[k][gameId] = r; store.set('scores', all); return out;
    },
    submit(gameId, score, extra) {
      const res = this._write(gameId, (r) => {
        const isRecord = score > r.best, previousBest = r.best;
        r.plays++; r.total += score; r.time += (extra && extra.seconds) || 0;
        if (isRecord) r.best = score;
        r.history.unshift({ score, at: Date.now(), mode: extra && extra.mode });
        r.history = r.history.slice(0, 15);
        return { isRecord, best: r.best, previousBest };
      });
      emit('score', { gameId, score, isRecord: res.isRecord });
      return res;
    },
    /* for games without a score (ports): count the play and time spent */
    recordPlay(gameId, seconds) {
      this._write(gameId, (r) => { r.plays++; r.time += seconds || 0; r.history.unshift({ score: 0, at: Date.now(), mode: 'Session · ' + Math.round(seconds || 0) + 's' }); r.history = r.history.slice(0, 15); });
    },
    addTime(gameId, seconds) { this._write(gameId, (r) => { r.time += seconds; }); },
    /* device leaderboard (instant) */
    leaderboard(gameId, limit) {
      const all = this._all(), users = store.get('users', {}), me = this._key(), prof = store.get('cloudProfile', null);
      const rows = [];
      Object.keys(all).forEach((k) => {
        const r = all[k][gameId]; if (!r || !r.best) return;
        const name = k === '__guest' ? 'Guest' : users[k] ? users[k].username : (prof && prof.id === k ? prof.username : 'Player');
        rows.push({ name, best: r.best, plays: r.plays, hue: users[k] ? users[k].hue : (prof && prof.id === k ? prof.hue : 220), me: k === me });
      });
      return rows.sort((a, b) => b.best - a.best).slice(0, limit || 10);
    },
    /* global leaderboard when cloud is on, device board otherwise */
    async leaderboardAsync(gameId, limit) {
      if (!cloud.enabled || !cloud.client) return { scope: 'device', rows: this.leaderboard(gameId, limit) };
      const { data, error } = await cloud.client.from('leaderboard').select('username,hue,best,plays,user_id').eq('game_id', gameId).order('best', { ascending: false }).limit(limit || 10);
      if (error) return { scope: 'device', rows: this.leaderboard(gameId, limit) };
      const me = cloud.user && cloud.user.id;
      return { scope: 'global', rows: data.map((r) => ({ name: r.username, hue: r.hue, best: Number(r.best), plays: r.plays, me: r.user_id === me })) };
    },
    summary() {
      const mine = this._all()[this._key()] || {};
      let plays = 0, time = 0;
      Object.values(mine).forEach((r) => { plays += r.plays; time += r.time; });
      return { plays, time, games: mine };
    }
  };

  /* ------------------------------------------------------------------------
     SETTINGS
     ------------------------------------------------------------------------ */
  const DEFAULTS = {
    bg: 'aurora', music: true, track: 'neon', musicVol: 0.45, sfx: true, sfxVol: 0.7,
    accent: 'violet', crt: false, reducedMotion: false, shake: true
  };
  const settings = {
    _s: Object.assign({}, DEFAULTS, store.get('settings', {})),
    get(k) { return this._s[k]; },
    all() { return Object.assign({}, this._s); },
    set(k, v) {
      this._s[k] = v; store.set('settings', this._s);
      applySettings(k); emit('settings', { key: k, value: v });
    },
    reducedMotion() {
      return this._s.reducedMotion || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  };
  function applySettings(changed) {
    const r = document.documentElement;
    r.dataset.accent = settings.get('accent');
    r.dataset.crt = settings.get('crt') ? 'on' : 'off';
    r.dataset.reducedMotion = settings.get('reducedMotion') ? 'on' : 'off';
    if (!changed || changed === 'musicVol' || changed === 'sfxVol' || changed === 'sfx') audio.applyVolumes();
    if (changed === 'music') settings.get('music') ? audio.music.start() : audio.music.stop();
    if (changed === 'track') audio.music.switchTo(settings.get('track'));
    if (changed === 'bg' || changed === 'reducedMotion') bg.applyPage();
  }

  /* ------------------------------------------------------------------------
     AUDIO — all sounds are synthesized with WebAudio, so no assets needed.
     ------------------------------------------------------------------------ */
  const audio = (() => {
    let ctx = null, master, sfxBus, musicBus, noiseBuf;
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

    function ensure() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applyVolumes();
      return ctx;
    }
    function applyVolumes() {
      if (!ctx) return;
      sfxBus.gain.setTargetAtTime(settings.get('sfx') ? settings.get('sfxVol') : 0, ctx.currentTime, 0.02);
      if (music.playing) musicBus.gain.setTargetAtTime(settings.get('musicVol') * 0.6, ctx.currentTime, 0.1);
    }

    function tone(o) {
      const c = ensure(); if (!c) return;
      const t = (o.at != null ? o.at : c.currentTime) + (o.delay || 0);
      const osc = c.createOscillator(); const g = c.createGain();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(o.freq, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.slide || o.dur));
      if (o.detune) osc.detune.value = o.detune;
      const vol = o.vol == null ? 0.2 : o.vol;
      const atk = o.attack || 0.005;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur + (o.release || 0.05));
      let node = osc;
      if (o.cutoff) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.cutoff; f.Q.value = o.q || 0.7; osc.connect(f); node = f; }
      node.connect(g); g.connect(o.dest || sfxBus);
      osc.start(t); osc.stop(t + o.dur + (o.release || 0.05) + 0.05);
    }
    function noise(o) {
      const c = ensure(); if (!c) return;
      const t = (o.at != null ? o.at : c.currentTime) + (o.delay || 0);
      const src = c.createBufferSource(); src.buffer = noiseBuf;
      const f = c.createBiquadFilter(); f.type = o.filter || 'highpass'; f.frequency.setValueAtTime(o.freq || 1000, t);
      if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
      const g = c.createGain();
      g.gain.setValueAtTime(o.vol == null ? 0.2 : o.vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
      src.start(t, Math.random() * 0.5); src.stop(t + o.dur + 0.05);
    }

    const SFX = {
      click: () => tone({ type: 'square', freq: 640, to: 900, dur: 0.04, vol: 0.08, cutoff: 3000 }),
      hover: () => tone({ type: 'sine', freq: 1400, dur: 0.025, vol: 0.03 }),
      toggle: () => { tone({ type: 'triangle', freq: 520, dur: 0.05, vol: 0.12 }); tone({ type: 'triangle', freq: 780, dur: 0.06, vol: 0.1, delay: 0.05 }); },
      eat: () => { tone({ type: 'triangle', freq: 520, to: 1040, dur: 0.08, vol: 0.22 }); tone({ type: 'sine', freq: 1560, dur: 0.06, vol: 0.06, delay: 0.03 }); },
      coin: () => { tone({ type: 'square', freq: 988, dur: 0.06, vol: 0.1, cutoff: 4000 }); tone({ type: 'square', freq: 1319, dur: 0.18, vol: 0.1, cutoff: 4000, delay: 0.06 }); },
      power: () => { [0, 4, 7, 12, 16].forEach((s, i) => tone({ type: 'sawtooth', freq: mtof(64 + s), dur: 0.07, vol: 0.08, cutoff: 3500, delay: i * 0.045 })); },
      combo: (n) => tone({ type: 'square', freq: mtof(72 + Math.min(n || 1, 12)), dur: 0.07, vol: 0.08, cutoff: 3000 }),
      die: () => { tone({ type: 'sawtooth', freq: 420, to: 45, dur: 0.6, slide: 0.55, vol: 0.22, cutoff: 1800 }); noise({ freq: 2000, to: 200, filter: 'lowpass', dur: 0.5, vol: 0.25 }); },
      start: () => { [60, 64, 67, 72].forEach((m, i) => tone({ type: 'square', freq: mtof(m), dur: 0.08, vol: 0.1, cutoff: 3500, delay: i * 0.07 })); },
      pause: () => tone({ type: 'sine', freq: 520, to: 330, dur: 0.15, vol: 0.14 }),
      resume: () => tone({ type: 'sine', freq: 330, to: 520, dur: 0.15, vol: 0.14 }),
      levelup: () => { [72, 76, 79, 84, 88].forEach((m, i) => tone({ type: 'triangle', freq: mtof(m), dur: 0.1, vol: 0.14, delay: i * 0.06 })); },
      record: () => { [67, 72, 76, 79, 84].forEach((m, i) => { tone({ type: 'square', freq: mtof(m), dur: 0.12, vol: 0.08, cutoff: 3000, delay: i * 0.09 }); tone({ type: 'sine', freq: mtof(m + 12), dur: 0.12, vol: 0.05, delay: i * 0.09 }); }); },
      error: () => { tone({ type: 'square', freq: 200, dur: 0.08, vol: 0.1, cutoff: 1200 }); tone({ type: 'square', freq: 160, dur: 0.12, vol: 0.1, cutoff: 1200, delay: 0.1 }); },
      whoosh: () => noise({ filter: 'bandpass', freq: 400, to: 3000, dur: 0.25, vol: 0.12 }),
      tick: () => tone({ type: 'sine', freq: 2000, dur: 0.015, vol: 0.04 })
    };
    function sfx(name, arg) {
      if (!settings.get('sfx')) return;
      const c = ensure(); if (!c || c.state !== 'running') return;
      const f = SFX[name]; if (f) f(arg);
    }

    /* ---- Generative music ---- */
    function kick(t, v) { tone({ at: t, type: 'sine', freq: 150, to: 42, slide: 0.12, dur: 0.22, vol: v || 0.7, dest: musicBus }); }
    function snare(t, v) { noise({ at: t, freq: 1800, dur: 0.16, vol: v || 0.22, dest: musicBus }); tone({ at: t, type: 'triangle', freq: 190, to: 150, dur: 0.08, vol: (v || 0.22) * 0.8, dest: musicBus }); }
    function hat(t, v, open) { noise({ at: t, freq: 7500, dur: open ? 0.14 : 0.04, vol: v || 0.07, dest: musicBus }); }

    function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

    const TRACKS = {
      neon: {
        name: 'Neon Drive', vibe: 'Synthwave', bpm: 104, len: 64,
        chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], bass: [33, 29, 36, 31],
        step(i, t, sd) {
          const bar = Math.floor(i / 16), s = i % 16, ch = this.chords[bar], root = this.bass[bar];
          if (s % 4 === 0) kick(t, 0.6);
          if (s === 4 || s === 12) snare(t, 0.18);
          if (s % 2 === 1) hat(t, 0.05);
          if (s % 2 === 0) tone({ at: t, type: 'sawtooth', freq: mtof(root + (s % 4 === 2 ? 12 : 0)), dur: sd * 1.6, vol: 0.13, cutoff: 700, q: 4, dest: musicBus });
          const arp = [0, 1, 2, 1, 2, 0, 1, 2];
          tone({ at: t, type: 'square', freq: mtof(ch[arp[s % 8]] + 12), dur: sd * 0.8, vol: 0.035, cutoff: 2600, dest: musicBus });
          if (s === 0) ch.forEach((n, k) => tone({ at: t, type: 'sawtooth', freq: mtof(n), dur: sd * 15, attack: 0.4, release: 0.6, vol: 0.022, cutoff: 1300, detune: k * 7 - 7, dest: musicBus }));
        }
      },
      lofi: {
        name: 'Night Shift', vibe: 'Lo-fi chill', bpm: 76, len: 64, swing: 0.16,
        chords: [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 60, 64, 67]], bass: [38, 43, 36, 45],
        init() { const r = seeded(42); this.mel = Array.from({ length: 64 }, (_, i) => (i % 2 === 0 && r() < 0.32) ? [74, 76, 79, 81, 84, 86][Math.floor(r() * 6)] : 0); },
        step(i, t, sd) {
          const bar = Math.floor(i / 16), s = i % 16, ch = this.chords[bar];
          if (s === 0 || s === 7 || s === 10) kick(t, 0.45);
          if (s === 4 || s === 12) snare(t, 0.12);
          if (s % 2 === 0) hat(t, s % 4 === 2 ? 0.035 : 0.05);
          if (s === 0 || s === 6 || s === 10) tone({ at: t, type: 'sine', freq: mtof(this.bass[bar]), dur: sd * 3, vol: 0.22, dest: musicBus });
          if (s === 0 || s === 11) ch.forEach((n) => tone({ at: t + Math.random() * 0.02, type: 'triangle', freq: mtof(n), dur: sd * 5, attack: 0.02, release: 0.5, vol: 0.035, cutoff: 1600, dest: musicBus }));
          if (this.mel[i]) tone({ at: t, type: 'sine', freq: mtof(this.mel[i]), dur: sd * 2, release: 0.4, vol: 0.05, dest: musicBus });
        }
      },
      chip: {
        name: 'Pixel Quest', vibe: 'Chiptune', bpm: 144, len: 64,
        chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], bass: [36, 31, 33, 29],
        init() {
          const r = seeded(7); const scale = [0, 2, 4, 7, 9, 12, 14, 16];
          this.mel = Array.from({ length: 64 }, (_, i) => {
            const ch = this.chords[Math.floor(i / 16)];
            if (i % 16 === 0) return ch[0] + 12;
            return r() < 0.55 ? 60 + scale[Math.floor(r() * scale.length)] + (r() < 0.2 ? 12 : 0) : 0;
          });
        },
        step(i, t, sd) {
          const bar = Math.floor(i / 16), s = i % 16;
          if (s === 0 || s === 8 || s === 10) kick(t, 0.5);
          if (s === 4 || s === 12) noise({ at: t, freq: 3000, dur: 0.1, vol: 0.15, dest: musicBus });
          if (s % 2 === 0) hat(t, 0.04);
          if (s % 2 === 0) tone({ at: t, type: 'triangle', freq: mtof(this.bass[bar] + (s % 4 ? 12 : 0)), dur: sd * 1.4, vol: 0.2, dest: musicBus });
          if (this.mel[i]) tone({ at: t, type: 'square', freq: mtof(this.mel[i]), dur: sd * 0.9, vol: 0.045, cutoff: 3200, dest: musicBus });
        }
      }
    };

    const music = {
      playing: false, timer: null, step: 0, next: 0, track: null,
      tracks: TRACKS,
      start() {
        const c = ensure(); if (!c || c.state !== 'running' || this.playing) return;
        this.track = TRACKS[settings.get('track')] || TRACKS.neon;
        if (this.track.init && !this.track.mel) this.track.init();
        this.playing = true; this.step = 0; this.next = c.currentTime + 0.12;
        musicBus.gain.cancelScheduledValues(c.currentTime);
        musicBus.gain.setValueAtTime(musicBus.gain.value, c.currentTime);
        musicBus.gain.linearRampToValueAtTime(settings.get('musicVol') * 0.6, c.currentTime + 1.5);
        this.timer = setInterval(() => this._tick(), 25);
        emit('music', { playing: true, track: this.track.name });
      },
      _tick() {
        const tr = this.track, sd = 60 / tr.bpm / 4;
        while (this.next < ctx.currentTime + 0.12) {
          const swing = tr.swing && this.step % 2 ? tr.swing * sd : 0;
          try { tr.step(this.step % tr.len, this.next + swing, sd); } catch (e) {}
          this.next += sd; this.step++;
        }
      },
      stop(fast) {
        if (!this.playing) return;
        this.playing = false; clearInterval(this.timer);
        if (ctx) { musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setTargetAtTime(0, ctx.currentTime, fast ? 0.02 : 0.25); }
        emit('music', { playing: false });
      },
      switchTo() { if (this.playing) { this.stop(true); setTimeout(() => this.start(), 120); } },
      duck(on) { if (ctx && this.playing) musicBus.gain.setTargetAtTime(on ? settings.get('musicVol') * 0.2 : settings.get('musicVol') * 0.6, ctx.currentTime, 0.2); }
    };

    /* Browsers block audio until a user gesture — unlock on first interaction */
    function unlock() {
      const c = ensure(); if (!c) return;
      const go = () => { if (settings.get('music') && !document.documentElement.hasAttribute('data-no-music')) music.start(); };
      if (c.state === 'suspended') c.resume().then(go); else go();
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, function once() {
      unlock(); ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.removeEventListener(e, once, true));
    }, true));
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });

    return { sfx, tone, noise, music, applyVolumes, ensure, mtof };
  })();

  /* ------------------------------------------------------------------------
     BACKGROUNDS — procedural, resolution-independent, animated.
     Each preset: { name, pro, scale, trail, setup(ctx,w,h,S), draw(ctx,w,h,t,dt,S) }
     ------------------------------------------------------------------------ */
  const pointer = { x: 0.5, y: 0.5, active: false };
  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth; pointer.y = e.clientY / innerHeight; pointer.active = true; }, { passive: true });

  const rand = (r) => r();
  const PRESETS = {
    aurora: {
      name: 'Aurora', scale: 0.3,
      draw(c, w, h, t) {
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#07071a'; c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = 'lighter';
        const cols = ['124,58,237', '244,63,94', '6,182,212', '67,56,202', '16,185,129'];
        const R = Math.max(w, h);
        for (let i = 0; i < 5; i++) {
          const x = w * (0.5 + 0.42 * Math.sin(t * (0.05 + i * 0.013) + i * 1.7));
          const y = h * (0.45 + 0.38 * Math.cos(t * (0.04 + i * 0.011) + i * 2.3));
          const r = R * (0.38 + 0.08 * Math.sin(t * 0.1 + i));
          const g = c.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, 'rgba(' + cols[i] + ',0.42)'); g.addColorStop(1, 'rgba(' + cols[i] + ',0)');
          c.fillStyle = g; c.fillRect(0, 0, w, h);
        }
        c.globalCompositeOperation = 'source-over';
      }
    },
    synthwave: {
      name: 'Synthwave', scale: 1,
      setup(c, w, h, S) {
        const r = seededRand(11);
        S.stars = Array.from({ length: 140 }, () => ({ x: rand(r) * w, y: rand(r) * h * 0.6, s: rand(r) * 1.4 + 0.3, p: rand(r) * 6 }));
        const mk = (n, amp, base) => { const pts = []; for (let i = 0; i <= n; i++) pts.push(base - Math.abs(Math.sin(i * 1.3 + rand(r) * 2)) * amp * (0.4 + rand(r) * 0.6)); return pts; };
        S.m1 = mk(14, h * 0.16, 0); S.m2 = mk(22, h * 0.09, 0);
      },
      draw(c, w, h, t, dt, S) {
        const hz = h * 0.62, u = Math.min(w, h) / 800;
        const sky = c.createLinearGradient(0, 0, 0, hz);
        sky.addColorStop(0, '#07021a'); sky.addColorStop(0.55, '#2b0b4f'); sky.addColorStop(1, '#7a1a63');
        c.fillStyle = sky; c.fillRect(0, 0, w, hz);
        S.stars.forEach((s) => { c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + s.p)); c.fillStyle = '#fff'; c.fillRect(s.x, s.y, s.s * u * 1.5, s.s * u * 1.5); });
        c.globalAlpha = 1;
        // sun
        const sr = Math.min(w, h) * 0.24, sx = w / 2, sy = hz - sr * 0.28;
        c.save();
        c.shadowColor = 'rgba(255,60,150,.8)'; c.shadowBlur = 60 * u;
        const sg = c.createLinearGradient(0, sy - sr, 0, sy + sr);
        sg.addColorStop(0, '#ffe36e'); sg.addColorStop(0.5, '#ff8a3d'); sg.addColorStop(1, '#ff2a9d');
        c.beginPath();
        c.rect(0, 0, w, sy);
        const off = (t * 12 * u) % (sr * 0.18);
        for (let k = 0; k < 9; k++) {
          const y0 = sy + k * sr * 0.12 + off, gap = (k + 1) * sr * 0.012;
          c.rect(0, y0, w, sr * 0.12 - gap);
        }
        c.clip();
        c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill();
        c.restore();
        // mountains
        const drawM = (pts, col, edge, yb) => {
          c.beginPath(); c.moveTo(0, hz);
          pts.forEach((p, i) => c.lineTo((i / (pts.length - 1)) * w, hz + p * yb));
          c.lineTo(w, hz); c.closePath(); c.fillStyle = col; c.fill();
          c.strokeStyle = edge; c.lineWidth = 1.5 * u; c.stroke();
        };
        drawM(S.m1, '#1b0938', 'rgba(255,42,157,.45)', 1);
        drawM(S.m2, '#120626', 'rgba(130,80,255,.5)', 1);
        // ground
        const gg = c.createLinearGradient(0, hz, 0, h);
        gg.addColorStop(0, '#16052e'); gg.addColorStop(1, '#05010f');
        c.fillStyle = gg; c.fillRect(0, hz, w, h - hz);
        c.lineCap = 'round';
        const phase = (t * 0.35) % 1, N = 16;
        for (let i = 0; i < N; i++) {
          const p = (i + phase) / N, y = hz + (h - hz) * Math.pow(p, 2.3);
          c.strokeStyle = 'rgba(255,42,157,' + (0.15 + p * 0.75) + ')'; c.lineWidth = (0.6 + p * 2.2) * u;
          c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
        }
        for (let i = -22; i <= 22; i++) {
          c.strokeStyle = 'rgba(255,42,157,0.55)'; c.lineWidth = 1.2 * u;
          c.beginPath(); c.moveTo(w / 2 + i * w * 0.006, hz); c.lineTo(w / 2 + i * w * 0.11, h); c.stroke();
        }
        const hg = c.createLinearGradient(0, hz - 30 * u, 0, hz + 40 * u);
        hg.addColorStop(0, 'rgba(255,42,157,0)'); hg.addColorStop(0.45, 'rgba(255,90,180,.45)'); hg.addColorStop(1, 'rgba(255,42,157,0)');
        c.fillStyle = hg; c.fillRect(0, hz - 30 * u, w, 70 * u);
      }
    },
    starfield: {
      name: 'Warp Speed', scale: 1,
      setup(c, w, h, S) {
        const r = seededRand(3);
        S.stars = Array.from({ length: 520 }, () => ({ x: rand(r) * 2 - 1, y: rand(r) * 2 - 1, z: rand(r), hue: [210, 260, 190, 320][Math.floor(rand(r) * 4)] }));
        const o = document.createElement('canvas'); o.width = w; o.height = h; const oc = o.getContext('2d');
        oc.fillStyle = '#02020a'; oc.fillRect(0, 0, w, h);
        [['80,40,200', 0.3, 0.35], ['200,40,120', 0.75, 0.65], ['20,120,200', 0.55, 0.2]].forEach(([col, x, y]) => {
          const g = oc.createRadialGradient(w * x, h * y, 0, w * x, h * y, Math.max(w, h) * 0.5);
          g.addColorStop(0, 'rgba(' + col + ',.22)'); g.addColorStop(1, 'rgba(' + col + ',0)'); oc.fillStyle = g; oc.fillRect(0, 0, w, h);
        });
        S.base = o;
      },
      draw(c, w, h, t, dt, S) {
        c.drawImage(S.base, 0, 0);
        const cx = w / 2 + (pointer.x - 0.5) * w * 0.08, cy = h / 2 + (pointer.y - 0.5) * h * 0.08, f = Math.max(w, h) * 0.5;
        const sp = 0.12 * Math.min(dt, 0.05) * 4;
        S.stars.forEach((s) => {
          const pz = s.z; s.z -= sp;
          if (s.z <= 0.02) { s.z = 1; s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; return; }
          const x = cx + (s.x / s.z) * f, y = cy + (s.y / s.z) * f, px = cx + (s.x / pz) * f, py = cy + (s.y / pz) * f;
          if (x < 0 || x > w || y < 0 || y > h) { s.z = 1; return; }
          const a = Math.min(1, (1 - s.z) * 1.4);
          c.strokeStyle = 'hsla(' + s.hue + ',90%,85%,' + a + ')'; c.lineWidth = (1 - s.z) * 2.6 + 0.3;
          c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
        });
      }
    },
    constellation: {
      name: 'Constellation', scale: 1,
      setup(c, w, h, S) {
        const r = seededRand(21);
        const o = document.createElement('canvas'); o.width = w; o.height = h; const oc = o.getContext('2d');
        oc.fillStyle = '#060614'; oc.fillRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) {
          const x = rand(r) * w, y = rand(r) * h, rr = Math.max(w, h) * (0.08 + rand(r) * 0.25);
          const col = ['139,92,246', '236,72,153', '34,211,238', '99,102,241'][i % 4];
          const g = oc.createRadialGradient(x, y, 0, x, y, rr);
          g.addColorStop(0, 'rgba(' + col + ',' + (0.05 + rand(r) * 0.1) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
          oc.fillStyle = g; oc.fillRect(0, 0, w, h);
        }
        for (let i = 0; i < 400; i++) { oc.fillStyle = 'rgba(255,255,255,' + rand(r) * 0.5 + ')'; oc.fillRect(rand(r) * w, rand(r) * h, 1, 1); }
        S.base = o;
        const n = Math.round(Math.min(110, (w * h) / 14000));
        S.p = Array.from({ length: n }, () => ({ x: rand(r) * w, y: rand(r) * h, vx: (rand(r) - 0.5) * 14, vy: (rand(r) - 0.5) * 14, r: rand(r) * 1.6 + 0.6, ph: rand(r) * 6 }));
        S.link = Math.min(w, h) * 0.17;
      },
      draw(c, w, h, t, dt, S) {
        c.drawImage(S.base, 0, 0);
        const mx = pointer.x * w, my = pointer.y * h, L = S.link;
        S.p.forEach((p) => {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < 0) p.x += w; if (p.x > w) p.x -= w; if (p.y < 0) p.y += h; if (p.y > h) p.y -= h;
        });
        c.lineWidth = 1;
        for (let i = 0; i < S.p.length; i++) {
          const a = S.p[i];
          for (let j = i + 1; j < S.p.length; j++) {
            const b = S.p[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
            if (d < L * L) { c.strokeStyle = 'rgba(167,139,250,' + (1 - Math.sqrt(d) / L) * 0.35 + ')'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
          }
          if (pointer.active) {
            const dx = a.x - mx, dy = a.y - my, d = Math.sqrt(dx * dx + dy * dy);
            if (d < L * 1.4) { c.strokeStyle = 'rgba(244,114,182,' + (1 - d / (L * 1.4)) * 0.6 + ')'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(mx, my); c.stroke(); }
          }
          c.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.45 * Math.sin(t * 2 + a.ph)) + ')';
          c.beginPath(); c.arc(a.x, a.y, a.r, 0, Math.PI * 2); c.fill();
        }
      }
    },
    tide: {
      name: 'Midnight Tide', scale: 0.75,
      setup(c, w, h, S) { const r = seededRand(5); S.stars = Array.from({ length: 120 }, () => [rand(r) * w, rand(r) * h * 0.5, rand(r) * 6]); },
      draw(c, w, h, t, dt, S) {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#020617'); g.addColorStop(0.5, '#0c1a3a'); g.addColorStop(1, '#063047');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        S.stars.forEach(([x, y, p]) => { c.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * Math.abs(Math.sin(t + p))) + ')'; c.fillRect(x, y, 1.4, 1.4); });
        const mx = w * 0.72, my = h * 0.24, mr = Math.min(w, h) * 0.07;
        const mg = c.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 5);
        mg.addColorStop(0, 'rgba(186,230,253,.35)'); mg.addColorStop(1, 'rgba(186,230,253,0)');
        c.fillStyle = mg; c.fillRect(0, 0, w, h);
        c.fillStyle = '#e0f2fe'; c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
        const layers = [['#0e7490', 0.55, 0.5], ['#0b5c78', 0.62, 0.7], ['#083d5c', 0.7, 0.9], ['#06283f', 0.8, 1.1], ['#041a2c', 0.9, 1.3]];
        layers.forEach(([col, base, sp], i) => {
          c.beginPath(); c.moveTo(0, h);
          for (let x = 0; x <= w; x += 8) {
            const y = h * base + Math.sin(x * 0.006 + t * sp + i) * h * 0.02 + Math.sin(x * 0.013 - t * sp * 0.7 + i * 2) * h * 0.012;
            c.lineTo(x, y);
          }
          c.lineTo(w, h); c.closePath(); c.globalAlpha = 0.92; c.fillStyle = col; c.fill(); c.globalAlpha = 1;
        });
        for (let i = 0; i < 40; i++) {
          const x = mx + Math.sin(i * 12.9 + t * 0.6) * mr * 1.6, y = h * 0.58 + i * h * 0.009;
          c.fillStyle = 'rgba(224,242,254,' + (0.35 * Math.abs(Math.sin(t * 2 + i))) + ')';
          c.fillRect(x, y, mr * (0.6 + Math.sin(i + t) * 0.4), 1.5);
        }
      }
    },
    rain: {
      name: 'Code Rain', scale: 1, trail: true,
      setup(c, w, h, S) {
        S.fs = Math.max(12, Math.round(Math.min(w, h) / 48));
        S.cols = Array.from({ length: Math.ceil(w / S.fs) }, () => Math.random() * -h / S.fs);
        S.chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>/{}*+'.split('');
        c.fillStyle = '#04030c'; c.fillRect(0, 0, w, h); S.acc = 0;
      },
      draw(c, w, h, t, dt, S) {
        S.acc += dt; if (S.acc < 1 / 24) return; S.acc = 0;
        c.fillStyle = 'rgba(4,3,12,0.14)'; c.fillRect(0, 0, w, h);
        c.font = '600 ' + S.fs + 'px "Chakra Petch", monospace';
        S.cols.forEach((y, i) => {
          const ch = S.chars[(Math.random() * S.chars.length) | 0], x = i * S.fs;
          c.fillStyle = i % 7 === 0 ? 'rgba(244,114,182,.85)' : 'rgba(167,139,250,.75)';
          c.fillText(ch, x, y * S.fs);
          c.fillStyle = '#f5f3ff'; c.fillText(S.chars[(Math.random() * S.chars.length) | 0], x, (y + 1) * S.fs);
          S.cols[i] = y * S.fs > h && Math.random() > 0.975 ? 0 : y + 1;
        });
      }
    },
    midnight: {
      name: 'Midnight (static)', scale: 0.5, still: true,
      draw(c, w, h) {
        const g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#0b0b1d'); g.addColorStop(0.5, '#151235'); g.addColorStop(1, '#1a0c26');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        const rg = c.createRadialGradient(w * 0.8, 0, 0, w * 0.8, 0, Math.max(w, h) * 0.7);
        rg.addColorStop(0, 'rgba(139,92,246,.25)'); rg.addColorStop(1, 'rgba(139,92,246,0)');
        c.fillStyle = rg; c.fillRect(0, 0, w, h);
      }
    },
    plasma: {
      name: 'Plasma Flux', pro: true, scale: 0.12,
      draw(c, w, h, t) {
        const img = c.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const v = Math.sin(x * 0.09 + t) + Math.sin(y * 0.07 - t * 0.8) + Math.sin((x + y) * 0.05 + t * 0.6) + Math.sin(Math.sqrt(x * x + y * y) * 0.08 - t);
          const k = (y * w + x) * 4;
          d[k] = 120 + 110 * Math.sin(v * 1.2); d[k + 1] = 30 + 40 * Math.sin(v * 1.2 + 2); d[k + 2] = 150 + 100 * Math.sin(v * 1.2 + 4); d[k + 3] = 255;
        }
        c.putImageData(img, 0, 0);
      }
    },
    prism: {
      name: 'Prism Bloom', pro: true, scale: 0.6,
      draw(c, w, h, t) {
        c.fillStyle = '#05050f'; c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 9; i++) {
          const a = t * 0.15 + (i * Math.PI * 2) / 9, R = Math.max(w, h) * 0.7;
          c.fillStyle = 'hsla(' + (i * 40 + t * 20) + ',90%,55%,0.10)';
          c.beginPath(); c.moveTo(w / 2, h / 2);
          c.lineTo(w / 2 + Math.cos(a) * R, h / 2 + Math.sin(a) * R);
          c.lineTo(w / 2 + Math.cos(a + 0.5) * R, h / 2 + Math.sin(a + 0.5) * R); c.fill();
        }
        c.globalCompositeOperation = 'source-over';
      }
    }
  };
  function seededRand(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function mountBg(canvas, id, opts) {
    opts = opts || {};
    const def = PRESETS[id] || PRESETS.aurora;
    const c = canvas.getContext('2d');
    const S = {};
    let w = 0, h = 0, raf = 0, last = 0, t = opts.t0 || 4 + Math.random() * 20, alive = true;
    const still = opts.static || def.still;
    function resize() {
      const cw = opts.width || window.innerWidth, ch = opts.height || window.innerHeight;
      const dpr = opts.width ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      const sc = def.scale || 1;
      canvas.width = Math.max(8, Math.round(cw * dpr * sc)); canvas.height = Math.max(8, Math.round(ch * dpr * sc));
      w = canvas.width; h = canvas.height;
      for (const k in S) delete S[k];
      if (def.setup) def.setup(c, w, h, S);
      if (still) renderStill();
    }
    function renderStill() {
      const n = def.trail ? 80 : 1;
      for (let i = 0; i < n; i++) { if (def.trail) S.acc = 1; def.draw(c, w, h, t + i / 30, 1 / 30, S); }
    }
    function loop(now) {
      if (!alive) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60; last = now;
      if (!document.hidden) { t += dt; def.draw(c, w, h, t, dt, S); }
      raf = requestAnimationFrame(loop);
    }
    resize();
    if (!still) raf = requestAnimationFrame(loop);
    const onResize = () => { clearTimeout(S._rt); S._rt = setTimeout(resize, 120); };
    if (!opts.width) window.addEventListener('resize', onResize);
    return { destroy() { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); } };
  }

  const bg = {
    presets: PRESETS,
    mount: mountBg,
    _page: null,
    applyPage() {
      let canvas = document.getElementById('bg-canvas');
      let img = document.querySelector('.bg-image');
      if (!canvas) {
        canvas = document.createElement('canvas'); canvas.id = 'bg-canvas'; canvas.setAttribute('aria-hidden', 'true');
        document.body.prepend(canvas);
        const v = document.createElement('div'); v.className = 'bg-vignette'; document.body.prepend(v);
      }
      if (!img) { img = document.createElement('div'); img.className = 'bg-image'; document.body.prepend(img); }
      if (this._page) { this._page.destroy(); this._page = null; }
      let id = settings.get('bg');
      if (PRESETS[id] && PRESETS[id].pro && !auth.isPro()) id = 'aurora';
      if (id === 'custom') {
        const data = store.get('customBg', null);
        if (data) { canvas.style.display = 'none'; img.style.display = 'block'; img.style.backgroundImage = 'url(' + data + ')'; return; }
        id = 'aurora';
      }
      img.style.display = 'none'; canvas.style.display = 'block';
      this._page = mountBg(canvas, id, { static: settings.reducedMotion() });
    }
  };

  /* ------------------------------------------------------------------------
     UI — toasts, modals and shared panels
     ------------------------------------------------------------------------ */
  function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  function toast(msg, iconName) {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = el('<div class="toast-wrap" role="status" aria-live="polite"></div>'); document.body.appendChild(wrap); }
    const t = el('<div class="toast">' + icon(iconName || 'info') + '<span>' + esc(msg) + '</span></div>');
    wrap.appendChild(t);
    setTimeout(() => { t.classList.add('is-leaving'); setTimeout(() => t.remove(), 260); }, 2800);
  }

  function modal(inner, opts) {
    opts = opts || {};
    const prevFocus = document.activeElement;
    const back = el('<div class="modal-backdrop"><div class="modal ' + (opts.wide ? 'modal-wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.label || 'Dialog') + '">' +
      '<button class="icon-btn modal-close" aria-label="Close">' + icon('x') + '</button></div></div>');
    const box = back.querySelector('.modal');
    if (typeof inner === 'string') box.insertAdjacentHTML('beforeend', inner); else box.appendChild(inner);
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add('is-open'));
    audio.sfx('whoosh'); audio.music.duck(false);
    const focusables = () => box.querySelectorAll('button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"]), a[href]');
    setTimeout(() => { const f = box.querySelector('[autofocus]') || focusables()[1] || focusables()[0]; f && f.focus(); }, 50);
    function close() {
      back.classList.remove('is-open'); document.removeEventListener('keydown', key, true);
      setTimeout(() => { back.remove(); opts.onClose && opts.onClose(); prevFocus && prevFocus.focus && prevFocus.focus(); }, 220);
    }
    function key(e) {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const f = Array.from(focusables()); if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener('keydown', key, true);
    back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
    box.querySelector('.modal-close').addEventListener('click', close);
    return { el: box, close };
  }

  /* ---- Auth modal ---- */
  function openAuth(mode) {
    mode = mode || 'login';
    const isCloud = auth.mode === 'cloud';
    const lockIco = icon('lock').replace('<svg', '<svg style="display:inline;width:13px;height:13px;vertical-align:-2px"');
    const m = modal(
      '<h2 id="auth-title">Welcome, player</h2><p class="modal-sub">' + (isCloud ? 'Your scores, settings and saves follow you to every device.' : 'Save high scores, stats and settings to your profile.') + '</p>' +
      '<div class="tabs" role="tablist"><button class="tab" role="tab" data-mode="login">Log in</button><button class="tab" role="tab" data-mode="signup">Create account</button></div>' +
      '<form novalidate class="auth-form" style="display:grid;gap:14px">' +
      '<div class="field au-uname"><label for="au-user">Username</label><input class="input" id="au-user" autocomplete="username" maxlength="18" spellcheck="false"><div class="field-hint au-uhint">Shown on leaderboards. Letters, numbers, underscores.</div><div class="field-error" id="au-user-err"></div></div>' +
      (isCloud ? '<div class="field au-email"><label for="au-email">Email</label><input class="input" id="au-email" type="email" autocomplete="email" spellcheck="false"><div class="field-error" id="au-email-err"></div></div>' : '') +
      '<div class="field"><div style="display:flex;justify-content:space-between;align-items:baseline"><label for="au-pass">Password</label>' + (isCloud ? '<a href="#" class="au-forgot" style="font-size:13px">Forgot password?</a>' : '') + '</div><input class="input" id="au-pass" type="password" autocomplete="current-password"><div class="field-error" id="au-pass-err"></div></div>' +
      '<div class="field au-confirm" hidden><label for="au-pass2">Confirm password</label><input class="input" id="au-pass2" type="password" autocomplete="new-password"><div class="field-error" id="au-pass2-err"></div></div>' +
      '<div class="field-error au-form-err" role="alert"></div>' +
      '<button class="btn btn-primary btn-lg btn-block au-submit" type="submit">Log in</button>' +
      '<button class="btn btn-ghost btn-block au-guest" type="button">Keep playing as guest</button>' +
      '<p class="field-hint" style="text-align:center">' + lockIco + (isCloud ? ' Secured cloud account. We never see your password.' : ' Accounts are stored on this device. Passwords are hashed.') + '</p>' +
      '</form>', { label: 'Log in or create account' });
    const box = m.el, form = box.querySelector('form');
    const q = (sel) => box.querySelector(sel);
    const setMode = (md) => {
      mode = md;
      box.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.mode === md)));
      q('.au-confirm').hidden = md !== 'signup';
      if (isCloud) q('.au-uname').hidden = md !== 'signup';
      q('.au-uhint').hidden = md !== 'signup';
      q('.au-submit').textContent = md === 'signup' ? 'Create free account' : 'Log in';
      q('#au-pass').autocomplete = md === 'signup' ? 'new-password' : 'current-password';
      q('#auth-title').textContent = md === 'signup' ? 'Join the arcade' : 'Welcome back';
      if (q('.au-forgot')) q('.au-forgot').hidden = md === 'signup';
      box.querySelectorAll('.field-error').forEach((e) => (e.textContent = ''));
      setTimeout(() => { const f = isCloud && md === 'login' ? q('#au-email') : q('#au-user'); f && f.focus(); }, 30);
    };
    box.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { audio.sfx('click'); setMode(t.dataset.mode); }));
    setMode(mode);
    const setErr = (id, msg) => { const i = q('#' + id), e = q('#' + id + '-err'); if (!i) return; e.textContent = msg; i.setAttribute('aria-invalid', msg ? 'true' : 'false'); };
    q('#au-user').addEventListener('blur', async (e) => {
      const v = e.target.value.trim(); if (mode !== 'signup' || !v) return;
      const err = auth.validateUsername(v); setErr('au-user', err);
      if (!err && !(await auth.usernameAvailable(v))) setErr('au-user', 'That username is taken.');
    });
    if (q('.au-forgot')) q('.au-forgot').addEventListener('click', async (e) => {
      e.preventDefault();
      const email = q('#au-email').value.trim(), ee = auth.validateEmail(email);
      if (ee) { setErr('au-email', 'Enter your email above, then tap “Forgot password?”'); return; }
      try { await auth.resetPassword(email); toast('Check your email for a reset link.', 'bell'); m.close(); }
      catch (err) { q('.au-form-err').textContent = err.message; }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = q('#au-user').value.trim(), p = q('#au-pass').value, p2 = q('#au-pass2').value, em = isCloud ? q('#au-email').value.trim() : '';
      const signup = mode === 'signup';
      const ue = signup ? auth.validateUsername(u) : (!isCloud && !u ? 'Enter your username.' : '');
      const ee = isCloud ? auth.validateEmail(em) : '';
      const pe = signup ? auth.validatePassword(p) : (p ? '' : 'Enter your password.');
      const ce = signup && p !== p2 ? 'Passwords don’t match.' : '';
      setErr('au-user', ue); if (isCloud) setErr('au-email', ee); setErr('au-pass', pe); if (signup) setErr('au-pass2', ce);
      q('.au-form-err').textContent = '';
      if (ue || ee || pe || ce) { audio.sfx('error'); return; }
      const btn = q('.au-submit'); btn.disabled = true; btn.textContent = 'One sec…';
      try {
        if (signup) {
          const res = await auth.signUp(u, p, em);
          if (res.needsConfirm) {
            audio.sfx('coin'); m.close();
            modal('<h2>Check your email</h2><p class="modal-sub">We sent a confirmation link to <b>' + esc(em) + '</b>. Click it and you’ll be signed in as <b>' + esc(u) + '</b>.</p><p class="field-hint">No email after a minute? Check spam, or try logging in — your account may already be active.</p>', { label: 'Confirm your email' });
            return;
          }
          audio.sfx('levelup'); m.close(); toast('Account created — welcome, ' + res.user.username + '!', 'star');
        } else {
          const user = await auth.logIn(isCloud ? em : u, p);
          audio.sfx('levelup'); m.close(); toast('Welcome back, ' + user.username + '!' + (auth.isOwner() ? ' Owner mode on.' : ''), 'star');
        }
      } catch (err) {
        audio.sfx('error'); q('.au-form-err').textContent = err.message;
        btn.disabled = false; btn.textContent = signup ? 'Create free account' : 'Log in';
      }
    });
    q('.au-guest').addEventListener('click', () => { audio.sfx('click'); m.close(); });
  }

  /* After clicking a password-reset email link */
  function openResetPassword() {
    const m = modal('<h2>Choose a new password</h2><p class="modal-sub">You’re almost back in.</p><form novalidate style="display:grid;gap:14px"><div class="field"><label for="rp-1">New password</label><input class="input" id="rp-1" type="password" autocomplete="new-password" autofocus></div><div class="field-error rp-err" role="alert"></div><button class="btn btn-primary btn-lg btn-block" type="submit">Save password</button></form>', { label: 'Reset password' });
    m.el.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault(); const v = m.el.querySelector('#rp-1').value, err = auth.validatePassword(v);
      if (err) { m.el.querySelector('.rp-err').textContent = err; return; }
      try { await auth.updatePassword(v); m.close(); toast('Password updated.', 'check'); } catch (x) { m.el.querySelector('.rp-err').textContent = x.message; }
    });
  }

  /* ---- Upgrade modal ---- */
  function openUpgrade(reason) {
    const p = config.pro;
    const m = modal(
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span class="badge badge-pro">' + icon('crown') + 'Pro</span>' + (!p.available ? '<span class="badge">Coming soon</span>' : '') + '</div>' +
      '<h2>Nova Arcade Pro</h2><p class="modal-sub">' + esc(reason || 'Unlock the full arcade.') + '</p>' +
      '<ul style="list-style:none;padding:0;margin:0 0 22px;display:grid;gap:10px">' +
      p.perks.map((x) => '<li style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--success);flex:none;margin-top:3px">' + icon('check').replace('<svg', '<svg width="18" height="18"') + '</span>' + esc(x) + '</li>').join('') + '</ul>' +
      '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:16px"><span style="font-family:var(--font-display);font-size:28px">' + esc(p.priceLabel) + '</span></div>' +
      (p.available
        ? '<button class="btn btn-accent btn-lg btn-block up-go">' + icon('crown') + 'Upgrade to Pro</button>'
        : '<button class="btn btn-accent btn-lg btn-block up-notify">' + icon('bell') + 'Notify me when Pro launches</button>') +
      '<p class="field-hint" style="text-align:center;margin-top:12px">Everything on the Free plan stays free.</p>', { label: 'Upgrade to Pro' });
    const go = m.el.querySelector('.up-go');
    if (go) go.addEventListener('click', () => { if (p.checkoutUrl) location.href = p.checkoutUrl; });
    const n = m.el.querySelector('.up-notify');
    if (n) n.addEventListener('click', () => {
      store.set('proWaitlist', true); audio.sfx('coin');
      n.innerHTML = icon('check') + 'You’re on the list'; n.disabled = true;
      toast('We’ll let you know when Pro is ready.', 'bell');
    });
  }

  /* ---- Profile modal ---- */
  function fmtTime(sec) { sec = Math.round(sec); if (sec < 60) return sec + 's'; const m = Math.floor(sec / 60); return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; }
  function openProfile() {
    const u = auth.current();
    if (!u) return openAuth('login');
    const sum = scores.summary();
    const rows = games.filter((g) => g.status === 'live').map((g) => {
      const r = sum.games[g.id] || { best: 0, plays: 0 };
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:12px;background:rgba(0,0,0,.25)"><span style="font-weight:600">' + esc(g.title) + '</span><span style="color:var(--fg-dim);font-size:14px">Best <b style="color:var(--fg)">' + r.best.toLocaleString() + '</b> · ' + r.plays + ' plays</span></div>';
    }).join('');
    modal(
      '<div style="display:flex;align-items:center;gap:16px;margin-bottom:22px">' +
      '<div class="avatar" style="width:64px;height:64px;font-size:26px;border-radius:18px;background:linear-gradient(135deg,hsl(' + u.hue + ',80%,60%),hsl(' + (u.hue + 60) + ',80%,55%))">' + esc(u.username[0].toUpperCase()) + '</div>' +
      '<div><h2 style="margin:0">' + esc(u.username) + '</h2><div style="display:flex;gap:8px;margin-top:6px;align-items:center;flex-wrap:wrap"><span class="badge ' + (auth.isPro() ? 'badge-pro' : 'badge-free') + '">' + (auth.isOwner() ? 'Owner · Pro' : auth.isPro() ? 'Pro' : 'Free plan') + '</span><span class="badge">' + icon(u.cloud ? 'cloud' : 'phone') + (u.cloud ? 'Synced' : 'This device') + '</span><span class="field-hint">Joined ' + new Date(u.created).toLocaleDateString() + '</span></div></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">' +
      '<div class="glass" style="padding:16px"><div class="field-hint">Games played</div><div style="font-family:var(--font-display);font-size:28px">' + sum.plays + '</div></div>' +
      '<div class="glass" style="padding:16px"><div class="field-hint">Time played</div><div style="font-family:var(--font-display);font-size:28px">' + fmtTime(sum.time) + '</div></div></div>' +
      '<h3 style="font-family:var(--font-ui);font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--fg-faint);margin-bottom:10px">Personal bests</h3>' +
      '<div style="display:grid;gap:8px">' + (rows || '<p class="field-hint">No games yet.</p>') + '</div>' +
      (!auth.isPro() ? '<button class="btn btn-accent btn-block pf-up" style="margin-top:20px">' + icon('crown') + 'See Pro perks</button>' : ''),
      { label: 'Your profile' });
    const up = document.querySelector('.pf-up'); if (up) up.addEventListener('click', () => openUpgrade());
  }

  /* ---- Settings modal ---- */
  const ACCENTS = [['violet', '#8b5cf6'], ['cyan', '#06b6d4'], ['lime', '#84cc16'], ['sunset', '#f97316'], ['rose', '#f43f5e']];
  function openSettings() {
    const s = settings.all();
    const trackOpts = Object.entries(audio.music.tracks).map(([k, v]) => '<option value="' + k + '"' + (s.track === k ? ' selected' : '') + '>' + v.name + ' — ' + v.vibe + '</option>').join('');
    const sw = (id, on, label, desc) => '<div class="setting-row"><div><div class="label" id="lbl-' + id + '">' + label + '</div>' + (desc ? '<div class="desc">' + desc + '</div>' : '') + '</div><label class="switch"><input type="checkbox" data-set="' + id + '" aria-labelledby="lbl-' + id + '"' + (on ? ' checked' : '') + '><span></span></label></div>';
    const m = modal(
      '<h2>Settings</h2><p class="modal-sub">Make the arcade yours. Changes save automatically.</p>' +
      '<section class="settings-group"><h3>Background</h3><div class="bg-grid"></div>' +
      '<label class="btn btn-sm" style="margin-top:12px;cursor:pointer">' + icon('upload') + 'Use my own image<input type="file" accept="image/*" class="sr-only bg-upload"></label></section>' +
      '<section class="settings-group"><h3>Audio</h3>' +
      sw('music', s.music, 'Music', 'Generated live in your browser') +
      '<div class="setting-row"><label class="label" for="set-track">Track</label><select class="select" id="set-track" style="max-width:240px;min-height:42px">' + trackOpts + '</select></div>' +
      '<div class="setting-row"><label class="label" for="set-mv">Music volume</label><input class="range" type="range" id="set-mv" min="0" max="1" step="0.05" value="' + s.musicVol + '"></div>' +
      sw('sfx', s.sfx, 'Sound effects') +
      '<div class="setting-row"><label class="label" for="set-sv">Effects volume</label><input class="range" type="range" id="set-sv" min="0" max="1" step="0.05" value="' + s.sfxVol + '"></div></section>' +
      '<section class="settings-group"><h3>Look &amp; feel</h3>' +
      '<div class="setting-row"><div class="label">Accent color</div><div class="swatches">' + ACCENTS.map(([k, c]) => '<button class="swatch" style="background:' + c + '" data-accent="' + k + '" aria-label="' + k + ' accent" aria-pressed="' + (s.accent === k) + '"></button>').join('') + '</div></div>' +
      sw('crt', s.crt, 'CRT scanlines', 'Retro monitor overlay') +
      sw('shake', s.shake, 'Screen shake', 'Impact feedback in games') +
      sw('reducedMotion', s.reducedMotion, 'Reduce motion', 'Freeze backgrounds and calm animations') + '</section>' +
      '<section class="settings-group"><h3>Data</h3><div class="setting-row"><div><div class="label">Reset this device</div><div class="desc">Clears scores, settings and local accounts</div></div><button class="btn btn-sm st-reset">' + icon('trash') + 'Reset</button></div></section>',
      { wide: true, label: 'Settings', onClose: () => thumbs.forEach((t) => t.destroy()) });
    const box = m.el;
    // background tiles with live thumbnails
    const grid = box.querySelector('.bg-grid'); const thumbs = [];
    const ids = Object.keys(PRESETS).concat(store.get('customBg', null) ? ['custom'] : []);
    ids.forEach((id) => {
      const def = PRESETS[id]; const locked = def && def.pro && !auth.isPro();
      const tile = el('<button class="bg-tile' + (locked ? ' is-locked' : '') + '" aria-pressed="' + (s.bg === id) + '" aria-label="' + (def ? def.name : 'My image') + (locked ? ' (Pro)' : '') + '"><span class="bg-tile-name">' + (def ? def.name : 'My image') + '</span>' + (locked ? '<span class="badge badge-pro lock">' + icon('lock') + 'Pro</span>' : '') + '</button>');
      if (def) {
        const cv = document.createElement('canvas'); tile.prepend(cv);
        thumbs.push(mountBg(cv, id, { width: 236, height: 148, static: true }));
      } else {
        tile.prepend(el('<div class="bg-tile-img" style="background-image:url(' + store.get('customBg', '') + ')"></div>'));
      }
      tile.addEventListener('click', () => {
        if (locked) { audio.sfx('error'); toast('Premium backgrounds come with Pro.', 'crown'); return; }
        audio.sfx('toggle'); grid.querySelectorAll('.bg-tile').forEach((x) => x.setAttribute('aria-pressed', 'false'));
        tile.setAttribute('aria-pressed', 'true'); settings.set('bg', id);
      });
      grid.appendChild(tile);
    });
    box.querySelector('.bg-upload').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const im = new Image();
        im.onload = () => {
          const max = 1920, k = Math.min(1, max / Math.max(im.width, im.height));
          const cv = document.createElement('canvas'); cv.width = im.width * k; cv.height = im.height * k;
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          let data = cv.toDataURL('image/jpeg', 0.85);
          if (!store.set('customBg', data)) { data = cv.toDataURL('image/jpeg', 0.6); if (!store.set('customBg', data)) { toast('That image is too large to save.', 'info'); return; } }
          settings.set('bg', 'custom'); audio.sfx('coin'); toast('Background updated.', 'image');
          m.close(); setTimeout(openSettings, 260);
        };
        im.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    box.querySelectorAll('input[data-set]').forEach((i) => i.addEventListener('change', () => { audio.sfx('toggle'); settings.set(i.dataset.set, i.checked); }));
    box.querySelector('#set-track').addEventListener('change', (e) => settings.set('track', e.target.value));
    box.querySelector('#set-mv').addEventListener('input', (e) => settings.set('musicVol', +e.target.value));
    box.querySelector('#set-sv').addEventListener('input', (e) => settings.set('sfxVol', +e.target.value));
    box.querySelector('#set-sv').addEventListener('change', () => audio.sfx('coin'));
    box.querySelectorAll('.swatch').forEach((b) => b.addEventListener('click', () => {
      audio.sfx('toggle'); box.querySelectorAll('.swatch').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true'); settings.set('accent', b.dataset.accent);
    }));
    box.querySelector('.st-reset').addEventListener('click', (e) => {
      const b = e.currentTarget;
      if (!b.dataset.confirm) { b.dataset.confirm = '1'; b.innerHTML = icon('trash') + 'Tap again to confirm'; audio.sfx('error'); return; }
      Object.keys(localStorage).filter((k) => k.startsWith('nova.')).forEach((k) => localStorage.removeItem(k));
      location.reload();
    });
  }

  /* ---- Music / mute quick toggle helpers ---- */
  function bindMusicButton(btn) {
    const paint = () => { const on = settings.get('music'); btn.classList.toggle('is-off', !on); btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? 'Turn music off' : 'Turn music on'); btn.innerHTML = icon(on ? 'music' : 'volumeX'); };
    btn.addEventListener('click', () => { settings.set('music', !settings.get('music')); audio.sfx('toggle'); paint(); toast(settings.get('music') ? 'Now playing: ' + (audio.music.tracks[settings.get('track')] || {}).name : 'Music off', 'music'); });
    on('settings', (d) => d.key === 'music' && paint());
    paint();
  }

  /* subtle hover/click sounds on any .btn / .icon-btn / .chip */
  document.addEventListener('pointerenter', (e) => {
    const t = e.target; if (t && t.matches && t.matches('.btn:not([disabled]), .game-card, .chip') && e.pointerType === 'mouse') audio.sfx('hover');
  }, true);
  document.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('.btn, .icon-btn, .chip'); if (t && !t.dataset.nosfx) audio.sfx('click'); }, true);

  /* ------------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------------ */
  applySettings();
  const ready = cloud.init();
  const boot = () => bg.applyPage();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  on('auth', () => bg.applyPage());

  window.Arcade = {
    config, games, store, auth, scores, settings, audio, bg, icon, esc, on, emit, cloud, ready,
    ui: { toast, modal, openAuth, openResetPassword, openUpgrade, openProfile, openSettings, bindMusicButton, el, fmtTime },
    url: (p) => ROOT + p
  };
})();
