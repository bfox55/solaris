// HUD wiring: time transport, toggles, body list, info card.
import { PRESETS, formatRate, formatDate, formatTime } from './time.js';

const $ = (s) => document.querySelector(s);

function fmtNum(n, digits = 0) { return n.toLocaleString('en-US', { maximumFractionDigits: digits }); }
function fmtMass(kg) {
  const e = Math.floor(Math.log10(kg));
  return `${(kg / 10 ** e).toFixed(2)} × 10<sup>${e}</sup> kg`;
}
function fmtPeriod(days) {
  if (days == null) return '—';
  if (days < 2) return `${(days * 24).toFixed(1)} hours`;
  if (days < 1000) return `${days.toFixed(1)} days`;
  return `${(days / 365.25).toFixed(1)} years`;
}
function fmtDay(hours) {
  const h = Math.abs(hours);
  const s = h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days`;
  return hours < 0 ? `${s} (retrograde)` : s;
}

export function createHUD({ clock, bodies, onSelect, onToggle }) {
  const els = {
    date: $('#simDate'), time: $('#simTime'), rate: $('#rateLabel'), fps: $('#fps'),
    play: $('#btnPlay'), reverse: $('#btnReverse'), now: $('#btnNow'), slider: $('#rateSlider'),
    presets: $('#presets'), list: $('#bodyList'), info: $('#info'), hud: $('#hud'),
    sidebar: $('#sidebar'), sidebarToggle: $('#sidebarToggle')
  };
  const iconPlay = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const iconPause = '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

  // ----- presets -----
  const presetBtns = [];
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.className = 'preset';
    b.textContent = p.label;
    b.dataset.rate = p.rate;
    b.addEventListener('click', () => setRate(p.rate));
    els.presets.appendChild(b);
    presetBtns.push(b);
  }

  function syncRateUI() {
    els.slider.value = Math.log10(clock.rate);
    els.rate.textContent = (clock.direction < 0 ? '−' : '') + formatRate(clock.rate);
    for (const b of presetBtns) b.classList.toggle('active', Math.abs(Number(b.dataset.rate) - clock.rate) / clock.rate < 0.02);
    els.reverse.classList.toggle('active', clock.direction < 0);
    els.play.innerHTML = clock.paused ? iconPlay : iconPause;
    els.play.title = clock.paused ? 'Play (Space)' : 'Pause (Space)';
    els.hud.classList.toggle('paused', clock.paused);
  }
  function setRate(r) { clock.rate = Math.min(1e8, Math.max(1, r)); syncRateUI(); }

  els.slider.addEventListener('input', () => setRate(10 ** Number(els.slider.value)));
  els.play.addEventListener('click', () => { clock.paused = !clock.paused; syncRateUI(); });
  els.reverse.addEventListener('click', () => { clock.direction *= -1; syncRateUI(); });
  els.now.addEventListener('click', () => { clock.setNow(); });

  // ----- toggles -----
  const toggles = {};
  for (const chip of document.querySelectorAll('[data-toggle]')) {
    const key = chip.dataset.toggle;
    toggles[key] = chip;
    chip.addEventListener('click', () => setToggle(key, !chip.classList.contains('active')));
  }
  function setToggle(key, val) {
    toggles[key]?.classList.toggle('active', val);
    onToggle(key, val);
  }
  function getToggle(key) { return toggles[key]?.classList.contains('active'); }

  // ----- body list -----
  const listBtns = new Map();
  for (const b of bodies) {
    if (b.kind === 'moon') continue;
    const btn = document.createElement('button');
    btn.className = 'body-btn';
    btn.innerHTML = `<span class="dot" style="background:#${b.data.color.toString(16).padStart(6, '0')}"></span><span>${b.name}</span><kbd>${b.kind === 'sun' ? 0 : listBtns.size}</kbd>`;
    btn.addEventListener('click', () => onSelect(b));
    els.list.appendChild(btn);
    listBtns.set(b.id, btn);
  }
  els.sidebarToggle.addEventListener('click', () => els.sidebar.classList.toggle('collapsed'));
  const mobile = window.matchMedia('(max-width: 900px)');
  if (mobile.matches) els.sidebar.classList.add('collapsed');
  mobile.addEventListener('change', (e) => { if (!e.matches) els.sidebar.classList.remove('collapsed'); });

  // ----- info card -----
  let selected = null;
  function setSelected(b) {
    selected = b;
    for (const [id, btn] of listBtns) btn.classList.toggle('active', !!b && (id === b.id || (!!b.parent && id === b.parent.id)));
    if (!b) { els.info.hidden = true; return; }
    const d = b.data;
    const rows = [
      ['Distance from Sun', '<span id="liveDist">—</span>'],
      ['Orbital period', b.kind === 'moon' ? `${fmtPeriod(Math.abs(d.periodDays))}${d.periodDays < 0 ? ' (retrograde)' : ''} around ${b.parent.name}` : fmtPeriod(d.periodDays)],
      ['Day length', fmtDay(d.rotationHours)],
      ['Radius', `${fmtNum(d.radiusKm)} km`],
      ['Mass', fmtMass(d.massKg)],
      ['Gravity', `${d.gravity} m/s²`],
      ['Mean temperature', `${d.tempC > 0 ? '+' : ''}${fmtNum(d.tempC)} °C`],
      ['Axial tilt', `${d.tiltDeg}°`]
    ];
    if (d.moons != null) rows.splice(2, 0, [b.kind === 'sun' ? 'Planets' : 'Known moons', String(d.moons)]);
    els.info.innerHTML = `
      <div class="info-head">
        <div>
          <div class="info-type">${d.type}</div>
          <h2>${b.name}</h2>
        </div>
        <button class="icon-btn" id="infoClose" title="Back to overview (Esc)"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <p class="blurb">${d.blurb}</p>
      <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      ${b.children.length ? `<div class="moons"><span class="muted">Moons shown</span>${b.children.map((m) => `<button class="moon-chip" data-id="${m.id}">${m.name}</button>`).join('')}</div>` : ''}
      ${b.kind === 'moon' ? `<div class="moons"><span class="muted">Orbits</span><button class="moon-chip" data-id="${b.parent.id}">${b.parent.name}</button></div>` : ''}
    `;
    els.info.hidden = false;
    els.info.querySelector('#infoClose').addEventListener('click', () => onSelect(null));
    for (const chip of els.info.querySelectorAll('.moon-chip')) {
      chip.addEventListener('click', () => onSelect(bodies.find((x) => x.id === chip.dataset.id)));
    }
    if (!mobile.matches) els.sidebar.classList.remove('collapsed');
  }

  // ----- per-frame -----
  let acc = 0;
  function update(dt, fps) {
    acc += dt;
    if (acc < 0.1) return;
    acc = 0;
    const date = clock.date;
    els.date.textContent = formatDate(date);
    els.time.textContent = formatTime(date);
    els.fps.textContent = `${Math.round(fps)} fps`;
    if (selected && selected.kind !== 'sun') {
      const live = els.info.querySelector('#liveDist');
      if (live) {
        const au = selected.distanceAU;
        live.innerHTML = `${au.toFixed(3)} AU <span class="muted">· ${fmtNum(au * 149.5978707, 1)} M km</span>`;
      }
    } else if (selected) {
      const live = els.info.querySelector('#liveDist');
      if (live) live.textContent = '0 (centre)';
    }
  }

  syncRateUI();
  return { update, setSelected, setRate, setToggle, getToggle, syncRateUI };
}
