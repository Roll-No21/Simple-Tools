/* Time zone converter — all maths done with Intl, so daylight saving is handled. */

(function () {
  "use strict";

  var ST = window.SimpleTools;
  var el = function (id) {
    return document.getElementById(id);
  };

  var LOCAL = (function () {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch (e) {
      return "UTC";
    }
  })();

  var FALLBACK_ZONES = [
    "UTC", "Africa/Cairo", "Africa/Lagos", "America/Chicago", "America/Denver",
    "America/Los_Angeles", "America/Mexico_City", "America/New_York", "America/Sao_Paulo",
    "Asia/Dubai", "Asia/Hong_Kong", "Asia/Jakarta", "Asia/Karachi", "Asia/Kathmandu",
    "Asia/Kolkata", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore", "Asia/Tokyo",
    "Australia/Perth", "Australia/Sydney", "Europe/Berlin", "Europe/Istanbul",
    "Europe/London", "Europe/Moscow", "Europe/Paris", "Pacific/Auckland"
  ];

  var ALL_ZONES = (function () {
    var list = [];
    try {
      if (typeof Intl.supportedValuesOf === "function") {
        list = Intl.supportedValuesOf("timeZone");
      }
    } catch (e) {
      list = [];
    }
    if (!list.length) list = FALLBACK_ZONES.slice();
    ["UTC", "Asia/Kolkata", LOCAL].forEach(function (z) {
      if (z && list.indexOf(z) === -1) list.push(z);
    });
    return list;
  })();

  var DEFAULT_ZONES = ["UTC", "Asia/Kolkata", "Europe/London", "America/New_York", "Asia/Tokyo"];

  /* ---------------- offset maths ---------------- */

  function offsetMinutes(timeZone, date) {
    try {
      var dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      var parts = {};
      dtf.formatToParts(date).forEach(function (p) {
        parts[p.type] = p.value;
      });
      var hour = parts.hour === "24" ? "00" : parts.hour;
      var asUTC = Date.UTC(
        +parts.year, +parts.month - 1, +parts.day,
        +hour, +parts.minute, +parts.second
      );
      return Math.round((asUTC - date.getTime()) / 60000);
    } catch (e) {
      return 0;
    }
  }

  function offsetLabel(minutes) {
    var sign = minutes < 0 ? "−" : "+";
    var abs = Math.abs(minutes);
    return "UTC " + sign + ST.pad2(Math.floor(abs / 60)) + ":" + ST.pad2(abs % 60);
  }

  /** Turn a wall-clock time in a zone into the real instant. */
  function wallToInstant(y, mo, d, h, mi, timeZone) {
    var guess = Date.UTC(y, mo - 1, d, h, mi, 0);
    var first = offsetMinutes(timeZone, new Date(guess));
    var ts = guess - first * 60000;
    var second = offsetMinutes(timeZone, new Date(ts));
    if (second !== first) ts = guess - second * 60000;
    return new Date(ts);
  }

  function timeIn(instant, timeZone, withSeconds) {
    var opts = {
      timeZone: timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: state.use12
    };
    if (withSeconds) opts.second = "2-digit";
    return new Intl.DateTimeFormat(state.use12 ? "en-US" : "en-GB", opts).format(instant);
  }

  function dateKey(instant, timeZone) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(instant);
    } catch (e) {
      return "";
    }
  }

  function dateIn(instant, timeZone) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: timeZone,
        weekday: "short",
        day: "numeric",
        month: "short"
      }).format(instant);
    } catch (e) {
      return "";
    }
  }

  function cityOf(zone) {
    if (zone === "UTC") return "UTC";
    var tail = zone.split("/").pop();
    return tail.replace(/_/g, " ");
  }

  /* ---------------- state ---------------- */

  var state = {
    zones: [],
    srcZone: ST.store.get("srcZone", LOCAL),
    use12: ST.store.get("use12", false) === true,
    live: true
  };

  (function initZones() {
    var saved = ST.store.get("zones", null);
    var list = Array.isArray(saved) ? saved : DEFAULT_ZONES.slice();
    state.zones = list.filter(function (z) {
      return typeof z === "string" && z.length > 0;
    }).slice(0, ST.LIMITS.zones);
    if (!state.zones.length) state.zones = DEFAULT_ZONES.slice();
  })();

  if (ALL_ZONES.indexOf(state.srcZone) === -1) state.srcZone = LOCAL;

  /* ---------------- selects ---------------- */

  function fillZoneSelect(select, includeLocal) {
    var html = "";
    if (includeLocal) {
      html +=
        '<option value="' + LOCAL + '">Your local time — ' + LOCAL + "</option>";
    }
    ALL_ZONES.forEach(function (z) {
      if (includeLocal && z === LOCAL) return;
      html += '<option value="' + z + '">' + z.replace(/_/g, " ") + "</option>";
    });
    select.innerHTML = html;
  }

  fillZoneSelect(el("srcZone"), true);
  el("srcZone").value = state.srcZone;
  fillZoneSelect(el("addZone"), false);

  /* ---------------- render ---------------- */

  function baseInstant() {
    if (state.live) return new Date();
    var dv = el("srcDate").value;
    var tv = el("srcTime").value;
    if (!dv || !tv) return new Date();
    var dp = dv.split("-").map(Number);
    var tp = tv.split(":").map(Number);
    return wallToInstant(dp[0], dp[1], dp[2], tp[0], tp[1], state.srcZone);
  }

  function renderLocalClock() {
    var now = new Date();
    el("localClock").textContent = timeIn(now, LOCAL, true);
    el("localZone").textContent = LOCAL.replace(/_/g, " ") + " · " + offsetLabel(offsetMinutes(LOCAL, now));
    el("localOffset").innerHTML = "Your offset <strong>" + offsetLabel(offsetMinutes(LOCAL, now)) + "</strong>";
    el("localDate").textContent = dateIn(now, LOCAL);
  }

  function syncSourceInputs(instant) {
    if (!state.live) return;
    var key = dateKey(instant, state.srcZone);
    // a <input type="time"> always speaks 24-hour time
    var time = new Intl.DateTimeFormat("en-GB", {
      timeZone: state.srcZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(instant);
    if (el("srcDate").value !== key) el("srcDate").value = key;
    if (el("srcTime").value !== time) el("srcTime").value = time;
  }

  function buildZoneRows() {
    el("zoneList").innerHTML = state.zones
      .map(function (z) {
        return (
          '<div class="zone-row" data-zone="' + z + '">' +
          '<div><div class="z-name">' + cityOf(z) + '</div>' +
          '<div class="z-sub" data-sub>' + z.replace(/_/g, " ") + "</div></div>" +
          '<div><div class="z-time" data-time>—</div><div class="z-day" data-day></div></div>' +
          '<button class="icon-btn" type="button" data-remove="' + z + '" aria-label="Remove ' + cityOf(z) + '">×</button>' +
          "</div>"
        );
      })
      .join("");
    updateZoneTimes();
  }

  function updateZoneTimes() {
    var instant = baseInstant();
    var sourceKey = dateKey(instant, state.srcZone);

    el("zoneList").querySelectorAll(".zone-row").forEach(function (row) {
      var zone = row.getAttribute("data-zone");
      var timeNode = row.querySelector("[data-time]");
      var dayNode = row.querySelector("[data-day]");
      var subNode = row.querySelector("[data-sub]");

      timeNode.textContent = timeIn(instant, zone, false);
      subNode.textContent =
        zone.replace(/_/g, " ") + " · " + offsetLabel(offsetMinutes(zone, instant));

      var key = dateKey(instant, zone);
      if (key && sourceKey && key !== sourceKey) {
        var diff = Math.round((Date.parse(key) - Date.parse(sourceKey)) / 86400000);
        dayNode.textContent = (diff > 0 ? "+" + diff : String(diff)) + " day · " + dateIn(instant, zone);
      } else {
        dayNode.textContent = "same day";
      }
    });
  }

  function renderSourceStatus() {
    var instant = baseInstant();
    el("srcStatus").textContent = state.live
      ? "Live — following the clock in " + state.srcZone.replace(/_/g, " ") + "."
      : "Fixed time — showing " + timeIn(instant, state.srcZone, false) + " in " +
        state.srcZone.replace(/_/g, " ") + ". Press Now to follow the clock again.";
  }

  function renderAll() {
    var instant = baseInstant();
    syncSourceInputs(instant);
    updateZoneTimes();
    renderSourceStatus();
  }

  /* ---------------- events ---------------- */

  el("srcZone").addEventListener("change", function () {
    state.srcZone = el("srcZone").value;
    ST.store.set("srcZone", state.srcZone);
    state.live = true;
    renderAll();
  });

  ["srcDate", "srcTime"].forEach(function (id) {
    el(id).addEventListener("input", function () {
      state.live = false;
      renderAll();
    });
  });

  el("nowBtn").addEventListener("click", function () {
    state.live = true;
    renderAll();
  });

  el("fmt24").addEventListener("click", function () {
    state.use12 = false;
    ST.store.set("use12", false);
    el("fmt24").setAttribute("aria-selected", "true");
    el("fmt12").setAttribute("aria-selected", "false");
    renderAll();
    renderLocalClock();
  });

  el("fmt12").addEventListener("click", function () {
    state.use12 = true;
    ST.store.set("use12", true);
    el("fmt24").setAttribute("aria-selected", "false");
    el("fmt12").setAttribute("aria-selected", "true");
    renderAll();
    renderLocalClock();
  });

  el("addBtn").addEventListener("click", function () {
    var zone = el("addZone").value;
    if (!zone) return;
    if (state.zones.indexOf(zone) >= 0) {
      ST.toast(cityOf(zone) + " is already in the list");
      return;
    }
    if (state.zones.length >= ST.LIMITS.zones) {
      ST.toast("Keep up to " + ST.LIMITS.zones + " places — remove one first");
      return;
    }
    state.zones.push(zone);
    ST.store.set("zones", state.zones);
    buildZoneRows();
    renderSourceStatus();
    ST.toast("Added " + cityOf(zone));
  });

  el("resetBtn").addEventListener("click", function () {
    state.zones = DEFAULT_ZONES.slice();
    ST.store.set("zones", state.zones);
    buildZoneRows();
    ST.toast("List reset");
  });

  el("zoneList").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-remove]");
    if (!btn) return;
    var zone = btn.getAttribute("data-remove");
    if (state.zones.length <= 1) {
      ST.toast("Keep at least one place");
      return;
    }
    state.zones = state.zones.filter(function (z) {
      return z !== zone;
    });
    ST.store.set("zones", state.zones);
    buildZoneRows();
    renderSourceStatus();
  });

  /* ---------------- start ---------------- */

  if (state.use12) {
    el("fmt24").setAttribute("aria-selected", "false");
    el("fmt12").setAttribute("aria-selected", "true");
  }

  buildZoneRows();
  renderLocalClock();
  renderAll();

  setInterval(function () {
    renderLocalClock();
    if (state.live) renderAll();
  }, 1000);
})();
