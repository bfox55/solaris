/**
 * Cosmos debug log system
 * Levels: debug < info < warn < error
 * Usage: Log.info("physics", "msg", { extra })
 *        Log.once("key", "warn", "ui", "msg")  // dedupe
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LEVEL_LABEL = { 0: "DEBUG", 1: "INFO", 2: "WARN", 3: "ERROR" };
const LEVEL_CLASS = { 0: "log-debug", 1: "log-info", 2: "log-warn", 3: "log-error" };

const MAX_ENTRIES = 800;
const PERF_SAMPLE_MS = 1000;

const state = {
  entries: [],
  minLevel: 0, // show from this level up in UI (0 = all)
  consoleMirror: true,
  enabled: true,
  paused: false, // pause UI append (still records)
  autoScroll: true,
  listeners: new Set(),
  onceKeys: new Set(),
  seq: 0,
  // performance
  frames: 0,
  lastPerfAt: performance.now(),
  fps: 0,
  lastFrameMs: 0,
  frameMsSum: 0,
  frameMsCount: 0,
  avgFrameMs: 0,
};

function nowStamp() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

function formatData(data) {
  if (data === undefined || data === null) return "";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data, (_, v) => {
      if (typeof v === "number" && !Number.isInteger(v)) return Math.round(v * 1000) / 1000;
      if (v && typeof v === "object" && v.isVector3) {
        return { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) };
      }
      return v;
    });
  } catch {
    return String(data);
  }
}

function notify(entry) {
  state.listeners.forEach((fn) => {
    try {
      fn(entry, state);
    } catch {
      /* ignore UI listener errors */
    }
  });
}

function push(levelName, tag, message, data) {
  if (!state.enabled) return null;
  const level = LEVELS[levelName] ?? 1;
  const entry = {
    id: ++state.seq,
    t: performance.now(),
    wall: nowStamp(),
    level,
    levelName,
    tag: tag || "app",
    message: String(message),
    data: data !== undefined ? data : null,
    dataText: formatData(data),
  };

  state.entries.push(entry);
  if (state.entries.length > MAX_ENTRIES) {
    state.entries.splice(0, state.entries.length - MAX_ENTRIES);
  }

  if (state.consoleMirror) {
    const prefix = `[Cosmos][${LEVEL_LABEL[level]}][${entry.tag}]`;
    const args = data !== undefined ? [prefix, message, data] : [prefix, message];
    if (level >= 3) console.error(...args);
    else if (level === 2) console.warn(...args);
    else if (level === 0) console.debug(...args);
    else console.log(...args);
  }

  notify(entry);
  return entry;
}

export const Log = {
  LEVELS,
  LEVEL_LABEL,
  LEVEL_CLASS,
  MAX_ENTRIES,

  debug(tag, msg, data) {
    return push("debug", tag, msg, data);
  },
  info(tag, msg, data) {
    return push("info", tag, msg, data);
  },
  warn(tag, msg, data) {
    return push("warn", tag, msg, data);
  },
  error(tag, msg, data) {
    return push("error", tag, msg, data);
  },

  /** Log only once per session key (useful for hot-loop warnings). */
  once(key, levelName, tag, msg, data) {
    if (state.onceKeys.has(key)) return null;
    state.onceKeys.add(key);
    return push(levelName, tag, msg, data);
  },

  /** Timed section: const end = Log.time("physics"); ... end(); */
  time(label, tag = "perf") {
    const t0 = performance.now();
    return (extra) => {
      const ms = performance.now() - t0;
      push("debug", tag, `${label} ${ms.toFixed(2)}ms`, extra);
      return ms;
    };
  },

  /** Call once per animation frame for FPS / frame-time stats. */
  frameTick(frameMs) {
    state.frames++;
    state.lastFrameMs = frameMs;
    state.frameMsSum += frameMs;
    state.frameMsCount++;
    const now = performance.now();
    if (now - state.lastPerfAt >= PERF_SAMPLE_MS) {
      const dt = (now - state.lastPerfAt) / 1000;
      state.fps = state.frames / dt;
      state.avgFrameMs = state.frameMsCount ? state.frameMsSum / state.frameMsCount : 0;
      state.frames = 0;
      state.frameMsSum = 0;
      state.frameMsCount = 0;
      state.lastPerfAt = now;
      if (state.avgFrameMs > 33) {
        push("warn", "perf", `Slow frame avg ${state.avgFrameMs.toFixed(1)}ms`, {
          fps: +state.fps.toFixed(1),
          avgMs: +state.avgFrameMs.toFixed(2),
        });
      }
    }
  },

  getFps() {
    return state.fps;
  },
  getAvgFrameMs() {
    return state.avgFrameMs;
  },

  getEntries(filter = {}) {
    let list = state.entries;
    if (filter.minLevel != null) {
      list = list.filter((e) => e.level >= filter.minLevel);
    }
    if (filter.tag) {
      const t = filter.tag.toLowerCase();
      list = list.filter((e) => e.tag.toLowerCase() === t);
    }
    if (filter.query) {
      const q = filter.query.toLowerCase();
      list = list.filter(
        (e) =>
          e.message.toLowerCase().includes(q) ||
          e.tag.toLowerCase().includes(q) ||
          (e.dataText && e.dataText.toLowerCase().includes(q))
      );
    }
    return list;
  },

  clear() {
    state.entries = [];
    state.onceKeys.clear();
    notify({ type: "clear" });
    push("info", "log", "Log cleared");
  },

  exportText(filter = {}) {
    const list = this.getEntries(filter);
    return list
      .map((e) => {
        const data = e.dataText ? ` | ${e.dataText}` : "";
        return `${e.wall} [${LEVEL_LABEL[e.level].padEnd(5)}] [${e.tag}] ${e.message}${data}`;
      })
      .join("\n");
  },

  exportJSON() {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        fps: state.fps,
        avgFrameMs: state.avgFrameMs,
        entries: state.entries,
      },
      null,
      2
    );
  },

  subscribe(fn) {
    state.listeners.add(fn);
    return () => state.listeners.delete(fn);
  },

  setMinLevel(levelNameOrNum) {
    state.minLevel =
      typeof levelNameOrNum === "string" ? (LEVELS[levelNameOrNum] ?? 0) : levelNameOrNum;
    notify({ type: "filter" });
  },

  getMinLevel() {
    return state.minLevel;
  },

  setConsoleMirror(on) {
    state.consoleMirror = !!on;
  },

  setPaused(on) {
    state.paused = !!on;
  },

  isPaused() {
    return state.paused;
  },

  setAutoScroll(on) {
    state.autoScroll = !!on;
  },

  isAutoScroll() {
    return state.autoScroll;
  },

  snapshot() {
    return {
      count: state.entries.length,
      fps: state.fps,
      avgFrameMs: state.avgFrameMs,
      minLevel: state.minLevel,
      errors: state.entries.filter((e) => e.level >= 3).length,
      warns: state.entries.filter((e) => e.level === 2).length,
    };
  },

  /** Capture global errors once installed. */
  installGlobalHandlers() {
    window.addEventListener("error", (ev) => {
      push("error", "window", ev.message || "Uncaught error", {
        file: ev.filename,
        line: ev.lineno,
        col: ev.colno,
        stack: ev.error?.stack?.split("\n").slice(0, 6).join(" | "),
      });
    });
    window.addEventListener("unhandledrejection", (ev) => {
      const reason = ev.reason;
      push("error", "promise", "Unhandled rejection", {
        reason: reason?.message || String(reason),
        stack: reason?.stack?.split("\n").slice(0, 6).join(" | "),
      });
    });
    // Three.js / WebGL context loss
    document.addEventListener(
      "webglcontextlost",
      (e) => {
        e.preventDefault();
        push("error", "webgl", "WebGL context lost");
      },
      false
    );
    document.addEventListener(
      "webglcontextrestored",
      () => push("warn", "webgl", "WebGL context restored"),
      false
    );
  },
};

// ---------------------------------------------------------------------------
// On-screen log panel UI
// ---------------------------------------------------------------------------
export function mountLogPanel() {
  const root = document.getElementById("log-panel");
  if (!root) {
    Log.warn("log", "log-panel element missing");
    return;
  }

  const listEl = document.getElementById("log-list");
  const countEl = document.getElementById("log-count");
  const fpsEl = document.getElementById("log-fps");
  const filterEl = document.getElementById("log-level-filter");
  const searchEl = document.getElementById("log-search");
  const autoScrollEl = document.getElementById("log-autoscroll");
  const mirrorEl = document.getElementById("log-console-mirror");

  function matchesFilter(entry) {
    if (entry.type === "clear" || entry.type === "filter") return false;
    if (entry.level < Log.getMinLevel()) return false;
    const q = (searchEl?.value || "").trim().toLowerCase();
    if (!q) return true;
    return (
      entry.message.toLowerCase().includes(q) ||
      entry.tag.toLowerCase().includes(q) ||
      (entry.dataText && entry.dataText.toLowerCase().includes(q))
    );
  }

  function renderEntry(entry) {
    if (!listEl || entry.type) return;
    if (Log.isPaused() && entry.level < 3) return; // still show errors when paused
    if (!matchesFilter(entry)) return;

    const row = document.createElement("div");
    row.className = `log-row ${LEVEL_CLASS[entry.level] || ""}`;
    row.dataset.id = String(entry.id);

    const meta = document.createElement("span");
    meta.className = "log-meta";
    meta.textContent = `${entry.wall} ${LEVEL_LABEL[entry.level]}`;

    const tag = document.createElement("span");
    tag.className = "log-tag";
    tag.textContent = entry.tag;

    const msg = document.createElement("span");
    msg.className = "log-msg";
    msg.textContent = entry.message;

    row.appendChild(meta);
    row.appendChild(tag);
    row.appendChild(msg);

    if (entry.dataText) {
      const data = document.createElement("span");
      data.className = "log-data";
      data.textContent = entry.dataText;
      row.appendChild(data);
    }

    listEl.appendChild(row);

    // cap DOM nodes
    while (listEl.children.length > 400) {
      listEl.removeChild(listEl.firstChild);
    }

    if (Log.isAutoScroll()) {
      listEl.scrollTop = listEl.scrollHeight;
    }

    if (countEl) {
      const snap = Log.snapshot();
      countEl.textContent = `${snap.count} · ${snap.warns}W · ${snap.errors}E`;
    }
  }

  function rebuild() {
    if (!listEl) return;
    listEl.innerHTML = "";
    const q = (searchEl?.value || "").trim();
    Log.getEntries({
      minLevel: Log.getMinLevel(),
      query: q || undefined,
    }).forEach((e) => {
      // bypass pause for full rebuild
      const row = document.createElement("div");
      row.className = `log-row ${LEVEL_CLASS[e.level] || ""}`;
      row.innerHTML = "";
      const meta = document.createElement("span");
      meta.className = "log-meta";
      meta.textContent = `${e.wall} ${LEVEL_LABEL[e.level]}`;
      const tag = document.createElement("span");
      tag.className = "log-tag";
      tag.textContent = e.tag;
      const msg = document.createElement("span");
      msg.className = "log-msg";
      msg.textContent = e.message;
      row.appendChild(meta);
      row.appendChild(tag);
      row.appendChild(msg);
      if (e.dataText) {
        const data = document.createElement("span");
        data.className = "log-data";
        data.textContent = e.dataText;
        row.appendChild(data);
      }
      listEl.appendChild(row);
    });
    if (Log.isAutoScroll()) listEl.scrollTop = listEl.scrollHeight;
    if (countEl) {
      const snap = Log.snapshot();
      countEl.textContent = `${snap.count} · ${snap.warns}W · ${snap.errors}E`;
    }
  }

  Log.subscribe((entry) => {
    if (entry?.type === "clear" || entry?.type === "filter") {
      rebuild();
      return;
    }
    renderEntry(entry);
  });

  // FPS badge refresh
  setInterval(() => {
    if (fpsEl) {
      const fps = Log.getFps();
      const ms = Log.getAvgFrameMs();
      fpsEl.textContent = fps ? `${fps.toFixed(0)} fps · ${ms.toFixed(1)} ms` : "— fps";
    }
  }, 500);

  // Sync initial filter (HTML default is Info+)
  if (filterEl?.value) Log.setMinLevel(filterEl.value);

  filterEl?.addEventListener("change", () => {
    Log.setMinLevel(filterEl.value);
    rebuild();
  });

  let searchTimer;
  searchEl?.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(rebuild, 150);
  });

  autoScrollEl?.addEventListener("change", () => {
    Log.setAutoScroll(autoScrollEl.checked);
  });

  mirrorEl?.addEventListener("change", () => {
    Log.setConsoleMirror(mirrorEl.checked);
  });

  document.getElementById("log-clear")?.addEventListener("click", () => Log.clear());

  document.getElementById("log-copy")?.addEventListener("click", async () => {
    const text = Log.exportText({ minLevel: Log.getMinLevel() });
    try {
      await navigator.clipboard.writeText(text);
      Log.info("log", "Copied log to clipboard", { chars: text.length });
    } catch (err) {
      Log.error("log", "Clipboard copy failed", { err: String(err) });
    }
  });

  document.getElementById("log-download")?.addEventListener("click", () => {
    const blob = new Blob([Log.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cosmos-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Log.info("log", "Downloaded log JSON");
  });

  document.getElementById("log-pause")?.addEventListener("click", (e) => {
    const next = !Log.isPaused();
    Log.setPaused(next);
    e.currentTarget.textContent = next ? "Resume" : "Pause";
    e.currentTarget.classList.toggle("active", next);
    Log.info("log", next ? "UI log paused" : "UI log resumed");
  });

  const toggleBtn = document.getElementById("log-toggle");
  const openPanel = (open) => {
    root.classList.toggle("open", open);
    root.setAttribute("aria-hidden", open ? "false" : "true");
    if (toggleBtn) toggleBtn.classList.toggle("active", open);
    if (open) Log.debug("log", "Log panel opened");
  };

  toggleBtn?.addEventListener("click", () => {
    openPanel(!root.classList.contains("open"));
  });

  document.getElementById("log-close")?.addEventListener("click", () => openPanel(false));

  // Keyboard: ` toggles panel, Ctrl+Shift+L clears
  window.addEventListener("keydown", (e) => {
    if (e.key === "`" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      openPanel(!root.classList.contains("open"));
    }
    if (e.ctrlKey && e.shiftKey && (e.key === "L" || e.key === "l")) {
      e.preventDefault();
      Log.clear();
    }
  });

  // open from ?debug=1
  if (new URLSearchParams(location.search).has("debug")) {
    openPanel(true);
    Log.setMinLevel("debug");
    if (filterEl) filterEl.value = "debug";
  }

  Log.info("log", "Log panel mounted", { max: MAX_ENTRIES });
}

// Expose for DevTools
if (typeof window !== "undefined") {
  window.CosmosLog = Log;
}
