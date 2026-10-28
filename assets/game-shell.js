/* ==========================================================================
   NOVA ARCADE — game-shell.js
   The engine every game plugs into. A game only provides logic + drawing;
   the shell handles: page chrome, HUD, start/pause/countdown/game-over
   screens, options, input (keyboard, swipe, D-pad), fixed-timestep loop,
   hi-DPI canvas scaling, particles, floating text, screen shake/flash,
   score saving, leaderboard, and SFX.

   Usage — see games/_template.html for a fully commented example:

     Arcade.createGame({
       id: 'mygame', title: 'My Game', width: 800, height: 600,
       options: [...], controls: [...], hud: [...],
       start(g) {},            // reset state for a new run
       update(g, dt) {},       // called at a fixed 120 Hz while playing
       render(g, ctx) {},      // draw (logical coords: 0..width, 0..height)
       input(g, action) {},    // 'up' | 'down' | 'left' | 'right' | 'action'
       summary(g) { return [{ label, value }] }   // extra game-over stats
     });
   ========================================================================== */
(function () {
  'use strict';
  const A = window.Arcade;
  const { icon, esc } = A;

  A.createGame = function (def) {
    const W = def.width || 720, H = def.height || 720;
    const STEP = 1 / 120;
    document.body.classList.add('game-page');
    if (matchMedia('(pointer: coarse)').matches) document.documentElement.classList.add('is-touch');
    document.title = def.title + ' — ' + A.config.siteName;

    /* ---------- DOM ---------- */
    const tierBadge = def.tier === 'pro' ? '<span class="badge badge-pro">' + icon('crown') + 'Pro</span>' : '<span class="badge badge-free">Free</span>';
    const hudDefs = [{ key: 'score', label: 'Score' }].concat(def.hud || []).concat([{ key: 'best', label: 'Best' }]);
    const app = A.ui.el(
      '<div class="g-app" style="display:contents">' +
      '<header class="g-top">' +
      '<a class="btn btn-ghost btn-sm" href="' + A.url('index.html') + '" aria-label="Back to arcade">' + icon('arrowLeft') + '<span class="back-label">Arcade</span></a>' +
      '<div class="g-title"><h1>' + esc(def.title) + '</h1>' + tierBadge + '</div>' +
      '<div class="g-hud">' + hudDefs.map((h) => '<div class="hud-chip" data-chip="' + h.key + '"><span>' + esc(h.label) + '</span><b data-hud="' + h.key + '">0</b></div>').join('') + '</div>' +
      '<div class="g-actions">' +
      '<button class="icon-btn g-pause" aria-label="Pause (P)">' + icon('pause') + '</button>' +
      '<button class="icon-btn g-music" aria-label="Music"></button>' +
      '<button class="icon-btn g-settings" aria-label="Settings">' + icon('settings') + '</button>' +
      '<button class="icon-btn g-full hide-sm" aria-label="Fullscreen (F)">' + icon('maximize') + '</button>' +
      '<span class="g-account"></span>' +
      '</div></header>' +
      '<main class="g-main">' +
      '<div class="g-stage-wrap" style="display:flex;flex-direction:column;min-height:0">' +
      '<div class="g-stage"><div class="g-frame"><canvas aria-label="' + esc(def.title) + ' game area" role="img"></canvas><div class="g-overlay" aria-live="polite"></div></div></div>' +
      '<div class="g-dpad" aria-hidden="true">' + ['up', 'left', 'down', 'right'].map((d) => '<button class="' + d + '" data-dir="' + d + '" tabindex="-1">' + icon('play').replace('<svg', '<svg style="transform:rotate(' + ({ up: -90, left: 180, down: 90, right: 0 })[d] + 'deg)"') + '</button>').join('') + '</div>' +
      '</div>' +
      '<aside class="g-side glass" aria-label="Scores and controls"></aside>' +
      '</main></div>');
    document.body.appendChild(app);

    const $ = (s) => app.querySelector(s);
    const canvas = $('canvas'), ctx = canvas.getContext('2d'), frame = $('.g-frame'), overlay = $('.g-overlay'), stage = $('.g-stage'), side = $('.g-side');
    A.ui.bindMusicButton($('.g-music'));
    $('.g-settings').addEventListener('click', () => { if (g.state === 'playing') pause(); A.ui.openSettings(); });
    $('.g-pause').addEventListener('click', () => (g.state === 'paused' ? resume() : pause()));
    $('.g-full').addEventListener('click', toggleFull);

    function paintAccount() {
      const u = A.auth.current(), slot = $('.g-account');
      slot.innerHTML = u
        ? '<button class="avatar" style="border:0;cursor:pointer;background:linear-gradient(135deg,hsl(' + u.hue + ',80%,60%),hsl(' + (u.hue + 60) + ',80%,55%))" aria-label="Your profile">' + esc(u.username[0].toUpperCase()) + '</button>'
        : '<button class="btn btn-primary btn-sm">' + icon('user') + '<span class="hide-sm">Log in</span></button>';
      slot.firstElementChild.addEventListener('click', () => { if (g.state === 'playing') pause(); u ? A.ui.openProfile() : A.ui.openAuth(); });
    }

    /* ---------- Canvas fit (keeps aspect, hi-DPI) ---------- */
    let scale = 1;
    function fit() {
      const r = stage.getBoundingClientRect();
      const k = Math.max(0.1, Math.min(r.width / W, r.height / H));
      const cw = Math.floor(W * k), ch = Math.floor(H * k);
      frame.style.width = cw + 'px'; frame.style.height = ch + 'px';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      scale = canvas.width / W;
    }
    new ResizeObserver(fit).observe(stage);

    /* ---------- Effects: particles, floating text, shake, flash ---------- */
    const fx = { parts: [], texts: [], shakeT: 0, shakeMag: 0, flashT: 0, flashCol: '#fff' };
    const particles = {
      burst(x, y, o) {
        o = o || {};
        const n = A.settings.reducedMotion() ? Math.ceil((o.count || 16) / 3) : (o.count || 16);
        for (let i = 0; i < n; i++) {
          const a = (o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || Math.PI * 2) : Math.random() * Math.PI * 2);
          const sp = (o.speed || 160) * (0.35 + Math.random() * 0.65);
          const life = (o.life || 0.7) * (0.6 + Math.random() * 0.6);
          const cols = [].concat(o.color || '#a78bfa');
          fx.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life, size: (o.size || 3) * (0.6 + Math.random() * 0.8), color: cols[(Math.random() * cols.length) | 0], g: o.gravity || 0, drag: o.drag == null ? 2 : o.drag, shape: o.shape });
        }
      },
      confetti() {
        for (let i = 0; i < 140; i++) fx.parts.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 120, vy: 80 + Math.random() * 160, life: 3, max: 3, size: 4 + Math.random() * 4, color: ['#a78bfa', '#f43f5e', '#fbbf24', '#34d399', '#22d3ee'][i % 5], g: 60, drag: 0.4, shape: 'rect', rot: Math.random() * 6 });
      }
    };
    function floatText(text, x, y, o) { o = o || {}; fx.texts.push({ text, x, y, life: o.life || 0.9, max: o.life || 0.9, color: o.color || '#fff', size: o.size || 22 }); }
    function updateFx(dt) {
      for (let i = fx.parts.length - 1; i >= 0; i--) {
        const p = fx.parts[i]; p.life -= dt;
        if (p.life <= 0) { fx.parts.splice(i, 1); continue; }
        p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt; p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; if (p.rot != null) p.rot += dt * 6;
      }
      for (let i = fx.texts.length - 1; i >= 0; i--) { const t = fx.texts[i]; t.life -= dt; t.y -= 40 * dt; if (t.life <= 0) fx.texts.splice(i, 1); }
      if (fx.shakeT > 0) fx.shakeT -= dt;
      if (fx.flashT > 0) fx.flashT -= dt;
    }
    function renderFx() {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      fx.parts.forEach((p) => {
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a; ctx.fillStyle = p.color;
        if (p.shape === 'rect') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalCompositeOperation = 'source-over'; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2); ctx.fill(); }
      });
      ctx.restore();
      fx.texts.forEach((t) => {
        const a = Math.min(1, t.life / t.max * 1.6), k = 1 + (1 - t.life / t.max) * 0.15;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(t.x, t.y); ctx.scale(k, k);
        ctx.font = '400 ' + t.size + 'px "Russo One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(t.text, 0, 0);
        ctx.fillStyle = t.color; ctx.shadowColor = t.color; ctx.shadowBlur = 12; ctx.fillText(t.text, 0, 0);
        ctx.restore();
      });
      if (fx.flashT > 0) { ctx.save(); ctx.globalAlpha = Math.min(0.35, fx.flashT * 2); ctx.fillStyle = fx.flashCol; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }

    /* ---------- Game context object handed to the game ---------- */
    const hudEls = {}; app.querySelectorAll('[data-hud]').forEach((b) => (hudEls[b.dataset.hud] = b));
    const g = {
      W, H, canvas, ctx, state: 'menu', score: 0, time: 0, options: {}, data: {}, keys: new Set(),
      sfx: (n, a) => A.audio.sfx(n, a),
      particles, floatText,
      shake(mag, dur) { if (!A.settings.get('shake') || A.settings.reducedMotion()) return; fx.shakeMag = Math.max(fx.shakeMag * (fx.shakeT > 0 ? 1 : 0), mag || 6); fx.shakeT = dur || 0.25; frame.classList.remove('shake'); void frame.offsetWidth; frame.classList.add('shake'); },
      flash(col, dur) { fx.flashCol = col || '#fff'; fx.flashT = dur || 0.15; },
      addScore(n, x, y, color) {
        g.score += n; setHud('score', g.score, true);
        if (x != null) floatText('+' + n, x, y, { color: color || '#fff' });
        if (g.score > bestAtStart && !g.data._beatBest && bestAtStart > 0) { g.data._beatBest = true; floatText('NEW BEST!', W / 2, H * 0.2, { color: '#fcd34d', size: 34, life: 1.4 }); A.audio.sfx('levelup'); }
      },
      hud: { set: (k, v, bump, hot) => setHud(k, v, bump, hot) },
      over: (o) => gameOver(o || {}),
      isPro: () => A.auth.isPro()
    };
    function setHud(k, v, bump, hot) {
      const b = hudEls[k]; if (!b) return;
      const txt = typeof v === 'number' ? v.toLocaleString() : String(v);
      if (b.textContent !== txt) {
        b.textContent = txt;
        if (bump) { const c = b.parentElement; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
      }
      if (hot != null) b.parentElement.classList.toggle('hot', !!hot);
    }

    /* ---------- Options (persisted per game) ---------- */
    const optKey = 'opts.' + def.id;
    const savedOpts = A.store.get(optKey, {});
    (def.options || []).forEach((o) => {
      const v = savedOpts[o.key], ch = o.choices.find((c) => c.value === v);
      g.options[o.key] = ch && !(ch.pro && !A.auth.isPro()) ? v : o.default;
    });

    /* ---------- Screens ---------- */
    let bestAtStart = 0, overTimer = 0, runId = 0;
    function show(html, clear) { overlay.innerHTML = html; overlay.classList.toggle('is-on', !!html); overlay.classList.toggle('is-clear', !!clear); }
    const kbd = (k) => '<kbd>' + esc(k) + '</kbd>';

    function optionsHtml() {
      return (def.options || []).map((o) => '<div class="ov-option"><span>' + esc(o.label) + '</span><div class="ov-row" role="group" aria-label="' + esc(o.label) + '">' +
        o.choices.map((c) => '<button class="chip" data-opt="' + o.key + '" data-val="' + esc(c.value) + '" aria-pressed="' + (g.options[o.key] === c.value) + '"' + (c.desc ? ' title="' + esc(c.desc) + '"' : '') + '>' + (c.pro && !A.auth.isPro() ? icon('lock') : '') + esc(c.label) + '</button>').join('') +
        '</div></div>').join('');
    }
    function bindOptions() {
      overlay.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => {
        const o = def.options.find((x) => x.key === b.dataset.opt), c = o.choices.find((x) => String(x.value) === b.dataset.val);
        if (c.pro && !A.auth.isPro()) { A.audio.sfx('error'); A.ui.openUpgrade(c.label + ' is part of Pro.'); return; }
        g.options[o.key] = c.value; A.store.set(optKey, g.options); A.audio.sfx('toggle');
        overlay.querySelectorAll('[data-opt="' + o.key + '"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        if (def.onOptions) def.onOptions(g); renderOnce();
      }));
    }
    function showMenu() {
      g.state = 'menu';
      const best = A.scores.best(def.id);
      show('<div class="ov-card">' +
        (def.tagline ? '<p class="eyebrow">' + esc(def.tagline) + '</p>' : '') +
        '<h2>' + esc(def.title) + '</h2>' +
        (best ? '<p class="ov-sub">' + icon('trophy').replace('<svg', '<svg style="display:inline;width:16px;height:16px;vertical-align:-2px;color:#fcd34d"') + ' Personal best <b style="color:var(--fg)">' + best.toLocaleString() + '</b></p>' : (def.instructions ? '<p class="ov-sub">' + esc(def.instructions) + '</p>' : '')) +
        optionsHtml() +
        '<div class="ov-actions"><button class="btn btn-primary btn-lg ov-play">' + icon('play') + 'Play</button></div>' +
        '<p class="ov-hint">Press ' + kbd('Space') + ' or ' + kbd('Enter') + ' to start</p></div>');
      bindOptions();
      overlay.querySelector('.ov-play').addEventListener('click', startRun);
      setTimeout(() => { const b = overlay.querySelector('.ov-play'); b && b.focus({ preventScroll: true }); }, 60);
      updatePauseBtn(); renderOnce();
    }
    function startRun() {
      fx.parts.length = 0; fx.texts.length = 0;
      g.score = 0; g.time = 0; g.data = {}; g.keys.clear();
      bestAtStart = A.scores.best(def.id);
      setHud('score', 0); setHud('best', bestAtStart);
      def.start(g);
      clearTimeout(overTimer);
      if (def.countdown === false) { begin(); return; }
      g.state = 'countdown'; let n = 3; const run = ++runId;
      const tick = () => {
        if (g.state !== 'countdown' || run !== runId) return;
        if (n === 0) { show('<div class="ov-count">GO</div>', true); A.audio.sfx('start'); setTimeout(() => { if (g.state === 'countdown' && run === runId) begin(); }, 380); return; }
        show('<div class="ov-count">' + n + '</div>', true); A.audio.sfx('tick'); A.audio.tone({ type: 'square', freq: 440, dur: 0.06, vol: 0.06, cutoff: 2000 });
        n--; setTimeout(tick, 520);
      };
      tick();
    }
    function begin() { g.state = 'playing'; show(''); updatePauseBtn(); last = performance.now(); acc = 0; canvas.focus && canvas.focus(); }
    function pause() {
      if (g.state !== 'playing') return;
      g.state = 'paused'; A.audio.sfx('pause'); updatePauseBtn();
      show('<div class="ov-card"><h2>Paused</h2><p class="ov-sub">Score ' + g.score.toLocaleString() + '</p><div class="ov-actions">' +
        '<button class="btn btn-primary btn-lg ov-resume">' + icon('play') + 'Resume</button>' +
        '<div class="ov-row"><button class="btn ov-restart">' + icon('refresh') + 'Restart</button><button class="btn ov-menu">' + icon('home') + 'Main menu</button></div></div>' +
        '<p class="ov-hint">' + kbd('P') + ' resume · ' + kbd('R') + ' restart · ' + kbd('M') + ' music</p></div>');
      overlay.querySelector('.ov-resume').addEventListener('click', resume);
      overlay.querySelector('.ov-restart').addEventListener('click', startRun);
      overlay.querySelector('.ov-menu').addEventListener('click', () => { def.start(g); showMenu(); });
      setTimeout(() => overlay.querySelector('.ov-resume') && overlay.querySelector('.ov-resume').focus({ preventScroll: true }), 60);
    }
    function resume() { if (g.state !== 'paused') return; A.audio.sfx('resume'); begin(); }
    function updatePauseBtn() {
      const b = $('.g-pause'); const paused = g.state === 'paused';
      b.innerHTML = icon(paused ? 'play' : 'pause'); b.setAttribute('aria-label', paused ? 'Resume (P)' : 'Pause (P)');
      b.disabled = !(g.state === 'playing' || g.state === 'paused'); b.style.opacity = b.disabled ? 0.4 : 1;
    }

    function gameOver(o) {
      if (g.state !== 'playing') return;
      g.state = 'dying'; updatePauseBtn();
      A.audio.sfx(o.sound || 'die');
      const res = A.scores.submit(def.id, g.score, { seconds: g.time, mode: (def.options || []).map((o) => { const c = o.choices.find((x) => x.value === g.options[o.key]); return c ? c.label : ''; }).join(' · ') });
      setHud('best', res.best);
      clearTimeout(overTimer);
      overTimer = setTimeout(() => {
        g.state = 'over';
        if (res.isRecord && g.score > 0) { particles.confetti(); A.audio.sfx('record'); }
        const extra = (def.summary ? def.summary(g) : []).concat([{ label: 'Time', value: A.ui.fmtTime(g.time) }]);
        const guest = !A.auth.current();
        show('<div class="ov-card">' +
          '<p class="eyebrow">' + esc(o.title || 'Game over') + '</p>' +
          (res.isRecord && g.score > 0 ? '<span class="ov-record">' + icon('trophy') + 'New personal best</span>' : '') +
          '<div class="ov-score" aria-label="Final score">0</div>' +
          '<p class="ov-sub">' + (res.isRecord ? 'Previous best ' + bestAtStart.toLocaleString() : 'Best ' + res.best.toLocaleString()) + '</p>' +
          '<div class="ov-stats">' + extra.map((s) => '<div class="ov-stat"><span>' + esc(s.label) + '</span><b>' + esc(s.value) + '</b></div>').join('') + '</div>' +
          '<div class="ov-actions"><button class="btn btn-primary btn-lg ov-again">' + icon('refresh') + 'Play again</button>' +
          '<div class="ov-row"><button class="btn ov-menu">' + icon('settings') + 'Change options</button><a class="btn" href="' + A.url('index.html') + '">' + icon('home') + 'Arcade</a></div></div>' +
          (guest ? '<p class="ov-hint"><a href="#" class="ov-login">Create a free account</a> to keep scores on your profile.</p>' : '<p class="ov-hint">' + kbd('Space') + ' play again</p>') +
          '</div>');
        // count-up score
        const el = overlay.querySelector('.ov-score'), target = g.score, t0 = performance.now(), dur = Math.min(1200, 300 + target * 4);
        (function up(now) { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(target * e).toLocaleString(); if (k < 1) requestAnimationFrame(up); })(t0);
        overlay.querySelector('.ov-again').addEventListener('click', startRun);
        overlay.querySelector('.ov-menu').addEventListener('click', () => { def.start(g); showMenu(); });
        const lg = overlay.querySelector('.ov-login'); if (lg) lg.addEventListener('click', (e) => { e.preventDefault(); A.ui.openAuth('signup'); });
        setTimeout(() => overlay.querySelector('.ov-again') && overlay.querySelector('.ov-again').focus({ preventScroll: true }), 60);
        paintSide();
      }, o.delay == null ? 900 : o.delay);
    }

    /* ---------- Side panel: best, leaderboard, recent runs, controls ---------- */
    function paintSide() {
      const me = A.scores.get(def.id), lb = A.scores.leaderboard(def.id, 6), u = A.auth.current();
      const ctrls = (def.controls || []).concat([['P / Esc', 'Pause'], ['R', 'Restart'], ['M', 'Music'], ['F', 'Fullscreen']]);
      side.innerHTML =
        '<section><h3>' + icon('trophy') + 'Your best</h3><div class="side-best">' + me.best.toLocaleString() + '</div><div class="field-hint" style="margin-top:6px">' + me.plays + ' runs · ' + A.ui.fmtTime(me.time) + ' played</div></section>' +
        (!u ? '<div class="side-guest"><span>Playing as guest. Make a free account to keep your scores on a profile.</span><button class="btn btn-primary btn-sm sd-join">' + icon('user') + 'Create free account</button></div>' : '') +
        '<section class="sd-lb"></section>' +
        '<section><h3>' + icon('clock') + 'Recent runs</h3>' +
        (me.history.length ? '<ol class="lb">' + me.history.slice(0, 5).map((h) => '<li><span class="nm" style="font-weight:500;color:var(--fg-dim)">' + esc(h.mode || '—') + '</span><span class="sc">' + h.score.toLocaleString() + '</span></li>').join('') + '</ol>' : '<p class="side-empty">Your runs will show up here.</p>') + '</section>' +
        '<section><h3>' + icon('keyboard') + 'Controls</h3>' + ctrls.map(([k, l]) => '<div class="ctrl-row"><span>' + k.split(' / ').map(kbd).join(' ') + '</span><span>' + esc(l) + '</span></div>').join('') + '</section>';
      const j = side.querySelector('.sd-join'); if (j) j.addEventListener('click', () => A.ui.openAuth('signup'));
      const paintLb = (rows, scope) => {
        const el = side.querySelector('.sd-lb'); if (!el) return;
        el.innerHTML = '<h3>' + icon('chart') + 'Leaderboard <span class="badge" style="margin-left:auto">' + (scope === 'global' ? 'Global' : 'This device') + '</span></h3>' +
          (rows.length ? '<ol class="lb">' + rows.map((r, i) => '<li class="' + (r.me ? 'me' : '') + '"><span class="rk">' + (i + 1) + '</span><span class="dot" style="background:hsl(' + r.hue + ',80%,60%)"></span><span class="nm">' + esc(r.name) + '</span><span class="sc">' + r.best.toLocaleString() + '</span></li>').join('') + '</ol>' : '<p class="side-empty">No scores yet — be the first.</p>');
      };
      paintLb(lb, 'device');
      A.scores.leaderboardAsync(def.id, 6).then((r) => paintLb(r.rows, r.scope));
    }

    /* ---------- Input ---------- */
    const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'action', Enter: 'action' };
    window.addEventListener('keydown', (e) => {
      if (document.querySelector('.modal-backdrop')) return;
      if (e.target.matches && e.target.matches('input, select, textarea')) return;
      const act = KEYMAP[e.code];
      if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); g.state === 'paused' ? resume() : pause(); return; }
      if (e.code === 'KeyM') { $('.g-music').click(); return; }
      if (e.code === 'KeyF') { toggleFull(); return; }
      if (e.code === 'KeyR' && (g.state === 'paused' || g.state === 'over' || g.state === 'playing')) { startRun(); return; }
      if (act) e.preventDefault();
      if (g.state === 'menu' || g.state === 'over') {
        if (act === 'action' && !(document.activeElement && document.activeElement.matches('button, a'))) startRun();
        return;
      }
      if (g.state !== 'playing') return;
      if (act) { g.keys.add(act); if (!e.repeat && def.input) def.input(g, act); }
      if (def.onKey) def.onKey(g, e);
    });
    window.addEventListener('keyup', (e) => { const act = KEYMAP[e.code]; if (act) g.keys.delete(act); });
    window.addEventListener('blur', () => { g.keys.clear(); pause(); });
    document.addEventListener('visibilitychange', () => document.hidden && pause());
    A.on('settings', () => paintAccount());
    A.on('auth', () => { paintAccount(); paintSide(); if (g.state === 'menu') showMenu(); });
    A.on('synced', () => { if (g.state !== 'playing') paintSide(); });

    // swipe + tap on the canvas
    let sx = 0, sy = 0, st = 0, swiped = false;
    frame.addEventListener('pointerdown', (e) => { if (e.target.closest('.g-overlay.is-on:not(.is-clear)')) return; sx = e.clientX; sy = e.clientY; st = performance.now(); swiped = false; });
    frame.addEventListener('pointermove', (e) => {
      if (!st || swiped || g.state !== 'playing') return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.hypot(dx, dy) > 24) { swiped = true; const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); def.input && def.input(g, dir); }
    });
    frame.addEventListener('pointerup', (e) => {
      if (!st) return; const quick = performance.now() - st < 250; st = 0;
      if (!swiped && quick && g.state === 'playing' && def.input) {
        const r = canvas.getBoundingClientRect();
        def.input(g, 'action', { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H });
      }
    });
    app.querySelectorAll('.g-dpad button').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (g.state === 'playing') { g.keys.add(b.dataset.dir); def.input && def.input(g, b.dataset.dir); } });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => g.keys.delete(b.dataset.dir)));
    });

    function toggleFull() {
      const elx = document.documentElement;
      if (!document.fullscreenElement) (elx.requestFullscreen || elx.webkitRequestFullscreen || (() => {})).call(elx);
      else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }

    /* ---------- Loop ---------- */
    let last = performance.now(), acc = 0;
    function renderOnce() {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (fx.shakeT > 0) { const m = fx.shakeMag * (fx.shakeT / 0.25); ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m); }
      def.render(g, ctx);
      renderFx();
      ctx.restore();
    }
    function frameLoop(now) {
      let dt = Math.min((now - last) / 1000, 0.1); last = now;
      if (g.state === 'playing') {
        acc += dt; g.time += dt;
        while (acc >= STEP) { def.update(g, STEP); acc -= STEP; if (g.state !== 'playing') break; }
      } else if (g.state === 'dying' && def.updateDying) def.updateDying(g, dt);
      if (def.animate) def.animate(g, dt);   // cosmetic animation, runs in every state
      updateFx(dt);
      renderOnce();
      requestAnimationFrame(frameLoop);
    }

    /* ---------- Boot ---------- */
    paintAccount(); paintSide(); fit();
    if (def.init) def.init(g);
    def.start(g);
    setHud('best', A.scores.best(def.id));
    showMenu();
    requestAnimationFrame(frameLoop);
    return g;
  };
})();
