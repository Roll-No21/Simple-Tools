/* Colour codes — HEX, RGB, HSL, HSV, CMYK, shades and contrast. */

(function () {
  "use strict";

  var ST = window.SimpleTools;
  var el = function (id) {
    return document.getElementById(id);
  };

  var current = { r: 107, g: 143, b: 113 };
  var saved = [];

  /* ---------------- conversions ---------------- */

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function hexFromRgb(c) {
    return (
      "#" +
      [c.r, c.g, c.b]
        .map(function (v) {
          return clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
        })
        .join("")
        .toUpperCase()
    );
  }

  function parseHex(value) {
    var h = String(value).trim().replace(/^#/, "").replace(/[^0-9a-fA-F]/g, "");
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length === 8) h = h.slice(0, 6);
    if (h.length !== 6) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function rgbToHsl(c) {
    var r = c.r / 255;
    var g = c.g / 255;
    var b = c.b / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;

    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }

    var l = (max + min) / 2;
    var s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

    return { h: h, s: s * 100, l: l * 100 };
  }

  function rgbToHsv(c) {
    var r = c.r / 255;
    var g = c.g / 255;
    var b = c.b / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;

    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }

    return {
      h: h,
      s: max === 0 ? 0 : (d / max) * 100,
      v: max * 100
    };
  }

  function rgbToCmyk(c) {
    var r = c.r / 255;
    var g = c.g / 255;
    var b = c.b / 255;
    var k = 1 - Math.max(r, g, b);
    if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
    return {
      c: ((1 - r - k) / (1 - k)) * 100,
      m: ((1 - g - k) / (1 - k)) * 100,
      y: ((1 - b - k) / (1 - k)) * 100,
      k: k * 100
    };
  }

  function round(n) {
    return Math.round(n);
  }

  function codesFor(c) {
    var hsl = rgbToHsl(c);
    var hsv = rgbToHsv(c);
    var cmyk = rgbToCmyk(c);
    return [
      { label: "HEX", value: hexFromRgb(c) },
      { label: "RGB", value: "rgb(" + round(c.r) + ", " + round(c.g) + ", " + round(c.b) + ")" },
      {
        label: "HSL",
        value: "hsl(" + round(hsl.h) + ", " + round(hsl.s) + "%, " + round(hsl.l) + "%)"
      },
      {
        label: "HSV",
        value: "hsv(" + round(hsv.h) + ", " + round(hsv.s) + "%, " + round(hsv.v) + "%)"
      },
      {
        label: "CMYK",
        value:
          "cmyk(" + round(cmyk.c) + "%, " + round(cmyk.m) + "%, " +
          round(cmyk.y) + "%, " + round(cmyk.k) + "%)"
      }
    ];
  }

  /* ---------------- contrast ---------------- */

  function relativeLuminance(c) {
    var channel = function (v) {
      var s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }

  function contrastRatio(a, b) {
    var la = relativeLuminance(a);
    var lb = relativeLuminance(b);
    var light = Math.max(la, lb);
    var dark = Math.min(la, lb);
    return (light + 0.05) / (dark + 0.05);
  }

  /* ---------------- shading ---------------- */

  function mix(c, target, amount) {
    return {
      r: c.r + (target.r - c.r) * amount,
      g: c.g + (target.g - c.g) * amount,
      b: c.b + (target.b - c.b) * amount
    };
  }

  function shadesOf(c) {
    var white = { r: 255, g: 255, b: 255 };
    var black = { r: 0, g: 0, b: 0 };
    return [
      mix(c, white, 0.82),
      mix(c, white, 0.58),
      mix(c, white, 0.32),
      c,
      mix(c, black, 0.22),
      mix(c, black, 0.45),
      mix(c, black, 0.68)
    ];
  }

  /* ---------------- rendering ---------------- */

  function renderCodes() {
    el("codeList").innerHTML = codesFor(current)
      .map(function (row) {
        return (
          '<div class="code-row">' +
          '<span class="c-label">' + row.label + "</span>" +
          '<span class="c-val">' + row.value + "</span>" +
          '<button class="btn btn-sm" type="button" data-copy="' + row.value +
          '" data-label="' + row.label + '">Copy</button>' +
          "</div>"
        );
      })
      .join("");
  }

  function renderShades() {
    el("shades").innerHTML = shadesOf(current)
      .map(function (c) {
        var hex = hexFromRgb(c);
        return (
          '<button class="shade" type="button" data-hex="' + hex +
          '" style="background:' + hex + '" title="' + hex + '" aria-label="Use ' + hex + '"></button>'
        );
      })
      .join("");
  }

  function renderContrast() {
    var white = { r: 255, g: 255, b: 255 };
    var black = { r: 0, g: 0, b: 0 };
    var onWhite = contrastRatio(current, white);
    var onBlack = contrastRatio(current, black);

    el("contrastNote").innerHTML =
      "This colour on white reads at <strong>" + onWhite.toFixed(2) +
      " : 1</strong>, and on black at <strong>" + onBlack.toFixed(2) + " : 1</strong>. " +
      (onWhite >= onBlack ? "White text suits it better." : "Dark text suits it better.") +
      (Math.max(onWhite, onBlack) >= 4.5
        ? " It passes the usual 4.5 : 1 comfort level."
        : " It is below the 4.5 : 1 comfort level, so use it on large text or shapes.");

    el("onWhite").innerHTML =
      '<span style="color:' + hexFromRgb(current) + ';font-weight:700">Aa</span> on white';
    el("onBlack").innerHTML =
      '<span style="background:#111;color:' + hexFromRgb(current) +
      ';font-weight:700;padding:0 6px;border-radius:5px">Aa</span> on black';
  }

  function renderPalette() {
    if (!saved.length) {
      el("palette").innerHTML = '<p class="empty" style="margin:0">Nothing saved yet — press “Save to palette”.</p>';
      el("paletteNote").textContent = "Up to " + ST.LIMITS.colors + " colours stay in this browser.";
      return;
    }

    el("palette").innerHTML = saved
      .map(function (hex, i) {
        return (
          '<div class="saved-chip" style="background:' + hex + '" data-hex="' + hex +
          '" title="' + hex + '">' +
          '<button type="button" data-remove="' + i + '" aria-label="Remove ' + hex + '">×</button>' +
          "</div>"
        );
      })
      .join("");

    el("paletteNote").textContent =
      saved.length + " of " + ST.LIMITS.colors + " saved · tap a swatch to load it";
  }

  function renderAll() {
    var hex = hexFromRgb(current);
    el("preview").textContent = hex;
    el("preview").style.background = hex;
    el("preview").style.color = contrastRatio(current, { r: 255, g: 255, b: 255 }) >
      contrastRatio(current, { r: 0, g: 0, b: 0 }) ? "#ffffff" : "#182018";
    el("picker").value = hex.toLowerCase();
    if (el("hexInput").value.toUpperCase() !== hex) el("hexInput").value = hex;

    renderCodes();
    renderShades();
    renderContrast();
  }

  /* ---------------- events ---------------- */

  function setColour(c) {
    current = {
      r: clamp(Math.round(c.r), 0, 255),
      g: clamp(Math.round(c.g), 0, 255),
      b: clamp(Math.round(c.b), 0, 255)
    };
    renderAll();
  }

  el("hexInput").addEventListener("input", function () {
    var parsed = parseHex(el("hexInput").value);
    if (!parsed) return;
    current = parsed;
    renderAll();
  });

  el("hexInput").addEventListener("blur", function () {
    var parsed = parseHex(el("hexInput").value);
    if (!parsed) {
      el("hexInput").value = hexFromRgb(current);
      ST.toast("That is not a HEX code — put back the old one");
    }
  });

  el("picker").addEventListener("input", function () {
    var parsed = parseHex(el("picker").value);
    if (parsed) setColour(parsed);
  });

  el("randomBtn").addEventListener("click", function () {
    var c = {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256)
    };
    setColour(c);
    el("hexInput").value = hexFromRgb(current);
  });

  el("saveBtn").addEventListener("click", function () {
    var hex = hexFromRgb(current);
    if (saved.indexOf(hex) >= 0) {
      ST.toast(hex + " is already saved");
      return;
    }
    if (saved.length >= ST.LIMITS.colors) {
      ST.toast("Up to " + ST.LIMITS.colors + " colours — tap × on one to remove it");
      return;
    }
    saved.unshift(hex);
    ST.store.set("colors", saved);
    renderPalette();
    ST.toast("Saved " + hex);
  });

  el("shades").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-hex]");
    if (!btn) return;
    var parsed = parseHex(btn.getAttribute("data-hex"));
    if (parsed) {
      setColour(parsed);
      el("hexInput").value = hexFromRgb(current);
    }
  });

  el("codeList").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    ST.copyText(btn.getAttribute("data-copy"), btn.getAttribute("data-label") + " copied");
  });

  el("palette").addEventListener("click", function (e) {
    var remove = e.target.closest("[data-remove]");
    if (remove) {
      var index = parseInt(remove.getAttribute("data-remove"), 10);
      var removed = saved[index];
      saved.splice(index, 1);
      ST.store.set("colors", saved);
      renderPalette();
      ST.toast("Removed " + removed);
      return;
    }
    var chip = e.target.closest("[data-hex]");
    if (chip) {
      var parsed = parseHex(chip.getAttribute("data-hex"));
      if (parsed) setColour(parsed);
    }
  });

  /* ---------------- start ---------------- */

  var stored = ST.store.get("colors", []);
  saved = Array.isArray(stored)
    ? stored.filter(function (h) {
        return /^#[0-9A-Fa-f]{6}$/.test(h);
      }).slice(0, ST.LIMITS.colors)
    : [];

  var start = parseHex(new URLSearchParams(location.search).get("c") || "#6B8F71");
  if (start) current = start;

  renderAll();
  renderPalette();
})();
