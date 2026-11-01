/* ============================================================
   Simple Tools — shared behaviour
   Storage, theme, favourites, background, small helpers.
   Everything is stored locally in the browser (localStorage).
   ============================================================ */

(function () {
  "use strict";

  var NS = "st.";
  var LIMITS = {
    history: 20, // calculator history entries
    colors: 12, // saved colour chips
    zones: 8, // added time zones
    favs: 6 // favourite tools on the home page
  };

  /* ---------------- storage ---------------- */

  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(NS + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(NS + key, JSON.stringify(value));
        return true;
      } catch (err) {
        return false;
      }
    },
    remove: function (key) {
      try {
        localStorage.removeItem(NS + key);
      } catch (err) {
        /* ignore */
      }
    },
    clearAll: function () {
      Object.keys(localStorage)
        .filter(function (k) {
          return k.indexOf(NS) === 0;
        })
        .forEach(function (k) {
          localStorage.removeItem(k);
        });
    },
    /** Keep only the most recent `max` items of an array (newest first). */
    pushLimited: function (key, item, max) {
      var arr = store.get(key, []);
      if (!Array.isArray(arr)) arr = [];
      arr.unshift(item);
      if (arr.length > max) arr = arr.slice(0, max);
      store.set(key, arr);
      return arr;
    }
  };

  /* ---------------- theme ---------------- */

  var ACCENTS = [
    { name: "Sage", value: "#6b8f71" },
    { name: "Ocean", value: "#4b7bec" },
    { name: "Clay", value: "#c4735b" },
    { name: "Plum", value: "#8a6ec9" },
    { name: "Teal", value: "#2f8f83" },
    { name: "Honey", value: "#d9a03c" }
  ];

  function hexToRgb(hex) {
    var h = String(hex).replace("#", "").trim();
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 107, g: 143, b: 113 };
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function readAccent() {
    return store.get("accent", ACCENTS[0].value);
  }

  function applyAccent(color) {
    var c = color || readAccent();
    var rgb = hexToRgb(c);
    // relative luminance decides whether black or white text sits on the accent
    var lum =
      (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    document.documentElement.style.setProperty("--accent", c);
    document.documentElement.style.setProperty(
      "--accent-ink",
      lum > 0.68 ? "#241f18" : "#ffffff"
    );
  }

  function readTheme() {
    var saved = store.get("theme", null);
    if (saved === "dark" || saved === "light") return saved;
    try {
      // no choice made yet — follow the device setting
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (e) {
      return "light";
    }
  }

  function applyTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode === "dark" ? "dark" : "light");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", mode === "dark" ? "#14161a" : "#e9e3da");
  }

  /* ---------------- toast ---------------- */

  var toastEl = null;
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2000);
  }

  /* ---------------- clipboard ---------------- */

  function copyText(text, label) {
    var done = function () {
      toast((label || "Copied") + " · " + text);
    };
    var fallback = function () {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        done();
      } catch (err) {
        toast("Copy is not available in this browser");
      }
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  /* ---------------- tools registry (used by the home page) ---------------- */

  var ICONS = {
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10.5h18M8 15h2M14 15h2"/>',
    spark:
      '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    clock:
      '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    globe:
      '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.4 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.4-3.6-8.5S9.6 5.9 12 3.5z"/>',
    calc:
      '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7.5h8M8 12h.01M12 12h.01M16 12h.01M8 16.5h.01M12 16.5h.01M16 16.5h.01"/>',
    droplet:
      '<path d="M12 3.2s6 6.7 6 10.9a6 6 0 0 1-12 0C6 9.9 12 3.2 12 3.2z"/>',
    star:
      '<path d="M12 3.6l2.6 5.5 6 .9-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 10l6-.9z"/>',
    palette:
      '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.4 0 2-.9 2-1.9 0-1.3-1-1.6-1-2.7 0-.9.7-1.4 1.7-1.4h1.8A4 4 0 0 0 20.5 10c0-3.7-3.8-6.5-8.5-6.5z"/><circle cx="8" cy="10" r="0.9"/><circle cx="11" cy="7.4" r="0.9"/><circle cx="15" cy="8.2" r="0.9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'
  };

  var TOOLS = [
    {
      id: "date",
      name: "Today's date",
      desc: "The date and month in numbers, plus every month and its last day.",
      href: "date.html",
      icon: "calendar"
    },
    {
      id: "special",
      name: "Special about today",
      desc: "World days, holidays and small history notes for the day.",
      href: "special.html",
      icon: "spark"
    },
    {
      id: "time12",
      name: "24h → 12h",
      desc: "Turn 24-hour time into AM/PM, and 12-hour time back again.",
      href: "time-12h.html",
      icon: "clock"
    },
    {
      id: "zones",
      name: "Time zones",
      desc: "Convert your time to UTC and to cities around the world.",
      href: "time-zones.html",
      icon: "globe"
    },
    {
      id: "calc",
      name: "Calculator",
      desc: "Standard, scientific and percentage maths, with saved history.",
      href: "calculator.html",
      icon: "calc"
    },
    {
      id: "colors",
      name: "Colour codes",
      desc: "Copy a colour as HEX, RGB, HSL, HSV or CMYK in one tap.",
      href: "colors.html",
      icon: "droplet"
    }
  ];

  function icon(name, size) {
    var body = ICONS[name] || ICONS.spark;
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      (size ? ' width="' + size + '" height="' + size + '"' : "") +
      ">" + body + "</svg>"
    );
  }

  /* ---------------- favourites ---------------- */

  var DEFAULT_FAVS = ["date", "calc"];

  function getFavs() {
    var favs = store.get("favs", null);
    if (!Array.isArray(favs)) return DEFAULT_FAVS.slice();
    return favs.filter(function (id) {
      return TOOLS.some(function (t) {
        return t.id === id;
      });
    });
  }

  function toggleFav(id) {
    var favs = getFavs();
    var i = favs.indexOf(id);
    if (i >= 0) {
      favs.splice(i, 1);
    } else {
      if (favs.length >= LIMITS.favs) {
        toast("Only " + LIMITS.favs + " favourites — remove one first");
        return getFavs();
      }
      favs.push(id);
    }
    store.set("favs", favs);
    return favs;
  }

  /* ---------------- small helpers ---------------- */

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function ordinal(n) {
    var s = ["th", "st", "nd", "rd"];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function greeting(hour) {
    if (hour < 5) return "Still awake";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  }

  function dayOfYear(d) {
    var start = new Date(d.getFullYear(), 0, 1);
    var diff = Math.floor((d - start) / 86400000);
    return diff + 1;
  }

  function isoWeek(d) {
    var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  }

  /* ---------------- background rotator ---------------- */

  var BG_IMAGES = [
    "assets/img/bg-morning.jpg",
    "assets/img/bg-dunes.jpg",
    "assets/img/bg-fog.jpg"
  ];
  var BG_INTERVAL = 16000;

  function initBackground() {
    if (document.querySelector(".bg")) return;
    var bg = document.createElement("div");
    bg.className = "bg";
    bg.setAttribute("aria-hidden", "true");
    BG_IMAGES.forEach(function (src, i) {
      var layer = document.createElement("div");
      layer.className = "bg-layer" + (i === 0 ? " is-active" : "");
      layer.style.backgroundImage = 'url("' + src + '")';
      bg.appendChild(layer);
    });
    var veil = document.createElement("div");
    veil.className = "veil";
    veil.setAttribute("aria-hidden", "true");
    document.body.insertBefore(veil, document.body.firstChild);
    document.body.insertBefore(bg, veil);

    var layers = bg.querySelectorAll(".bg-layer");
    if (layers.length < 2) return;
    var current = 0;

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    setInterval(function () {
      if (document.hidden) return;
      layers[current].classList.remove("is-active");
      current = (current + 1) % layers.length;
      layers[current].classList.add("is-active");
    }, BG_INTERVAL);
  }

  /* ---------------- header bits ---------------- */

  function markActiveNav() {
    var page = document.body.getAttribute("data-page");
    if (!page) return;
    var link = document.querySelector('.nav a[data-nav="' + page + '"]');
    if (link) link.setAttribute("aria-current", "page");
  }

  function initThemeButtons() {
    var themeBtn = document.getElementById("themeBtn");
    if (themeBtn) {
      themeBtn.innerHTML = icon(readTheme() === "dark" ? "sun" : "moon");
      themeBtn.setAttribute("aria-label", "Switch between light and dark");
      themeBtn.addEventListener("click", function () {
        var next = readTheme() === "dark" ? "light" : "dark";
        store.set("theme", next);
        applyTheme(next);
        themeBtn.innerHTML = icon(next === "dark" ? "sun" : "moon");
        document.dispatchEvent(new CustomEvent("st:theme", { detail: { theme: next } }));
      });
    }

    var settingsBtn = document.getElementById("settingsBtn");
    var panel = document.getElementById("settingsPanel");
    if (!settingsBtn || !panel) return;

    settingsBtn.innerHTML = icon("palette");
    settingsBtn.setAttribute("aria-label", "Appearance settings");
    settingsBtn.setAttribute("aria-expanded", "false");

    panel.innerHTML =
      "<h3>Button colour</h3>" +
      '<div class="swatches" role="group" aria-label="Accent colour">' +
      ACCENTS.map(function (a) {
        return (
          '<button class="swatch" type="button" data-color="' + a.value + '"' +
          ' style="background:' + a.value + '" title="' + a.name + '"' +
          ' aria-label="' + a.name + '"' +
          (a.value === readAccent() ? ' aria-pressed="true"' : ' aria-pressed="false"') +
          "></button>"
        );
      }).join("") +
      "</div>" +
      '<div class="settings-row"><span>Dark mode</span>' +
      '<button class="btn btn-sm" type="button" id="panelTheme">' +
      (readTheme() === "dark" ? "On" : "Off") +
      "</button></div>" +
      '<div class="settings-row"><span class="hint">Saved in this browser only</span>' +
      '<button class="btn btn-sm btn-ghost" type="button" id="resetData">Reset</button></div>';

    function closePanel() {
      panel.hidden = true;
      settingsBtn.setAttribute("aria-expanded", "false");
    }

    settingsBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      settingsBtn.setAttribute("aria-expanded", String(!panel.hidden));
    });

    panel.addEventListener("click", function (e) {
      e.stopPropagation();
      var swatch = e.target.closest("[data-color]");
      if (swatch) {
        var color = swatch.getAttribute("data-color");
        store.set("accent", color);
        applyAccent(color);
        panel.querySelectorAll("[data-color]").forEach(function (el) {
          el.setAttribute("aria-pressed", String(el === swatch));
        });
        toast("Button colour saved");
        return;
      }
      if (e.target.id === "panelTheme") {
        var next = readTheme() === "dark" ? "light" : "dark";
        store.set("theme", next);
        applyTheme(next);
        e.target.textContent = next === "dark" ? "On" : "Off";
        var tb = document.getElementById("themeBtn");
        if (tb) tb.innerHTML = icon(next === "dark" ? "sun" : "moon");
      }
      if (e.target.id === "resetData") {
        store.clearAll();
        applyTheme("light");
        applyAccent(ACCENTS[0].value);
        toast("Saved data cleared");
        setTimeout(function () {
          location.reload();
        }, 650);
      }
    });

    document.addEventListener("click", closePanel);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePanel();
    });
  }

  /* ---------------- boot ---------------- */

  applyTheme(readTheme());
  applyAccent(readAccent());

  function boot() {
    initBackground();
    markActiveNav();
    initThemeButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.SimpleTools = {
    store: store,
    LIMITS: LIMITS,
    ACCENTS: ACCENTS,
    TOOLS: TOOLS,
    icon: icon,
    toast: toast,
    copyText: copyText,
    getFavs: getFavs,
    toggleFav: toggleFav,
    pad2: pad2,
    ordinal: ordinal,
    greeting: greeting,
    dayOfYear: dayOfYear,
    isoWeek: isoWeek,
    hexToRgb: hexToRgb,
    applyAccent: applyAccent,
    applyTheme: applyTheme,
    readTheme: readTheme
  };
})();
