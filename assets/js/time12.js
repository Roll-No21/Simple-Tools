/* 24-hour ↔ 12-hour time converter. */

(function () {
  "use strict";

  var ST = window.SimpleTools;
  var el = function (id) {
    return document.getElementById(id);
  };

  var WORDS = [
    "twelve", "one", "two", "three", "four", "five", "six",
    "seven", "eight", "nine", "ten", "eleven", "twelve",
    "one", "two", "three", "four", "five", "six",
    "seven", "eight", "nine", "ten", "eleven"
  ];

  function to12(hour24, minute) {
    var suffix = hour24 < 12 ? "AM" : "PM";
    var h12 = hour24 % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ":" + ST.pad2(minute) + " " + suffix;
  }

  function to24(hour12, minute, suffix) {
    var h = hour12 % 12;
    if (suffix === "PM") h += 12;
    return ST.pad2(h) + ":" + ST.pad2(minute);
  }

  function dayPart(hour24) {
    if (hour24 < 5) return "at night";
    if (hour24 < 12) return "in the morning";
    if (hour24 < 17) return "in the afternoon";
    if (hour24 < 21) return "in the evening";
    return "at night";
  }

  function friendly(hour24, minute) {
    if (hour24 === 12 && minute === 0) return "noon";
    if (hour24 === 0 && minute === 0) return "midnight";

    var h12 = hour24 % 12;
    if (h12 === 0) h12 = 12;
    var nextWord = WORDS[(h12 % 12) + 1];
    var phrase;

    if (minute === 0) {
      phrase = WORDS[h12] + " o'clock";
    } else if (minute === 15) {
      phrase = "quarter past " + WORDS[h12];
    } else if (minute === 30) {
      phrase = "half past " + WORDS[h12];
    } else if (minute === 45) {
      phrase = "quarter to " + nextWord;
    } else if (minute < 30) {
      phrase = WORDS[h12] + " " + minute;
    } else {
      phrase = 60 - minute + " to " + nextWord;
    }

    return phrase + " " + dayPart(hour24);
  }

  /* ---------------- live clock ---------------- */

  function tickClock() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var s = now.getSeconds();
    el("live12").textContent = to12(h, m) + ":" + ST.pad2(s);
    el("live24").textContent =
      ST.pad2(h) + ":" + ST.pad2(m) + ":" + ST.pad2(s) + " in 24-hour time";
    el("liveDate").textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  /* ---------------- 24 → 12 ---------------- */

  function render24to12() {
    var value = el("in24").value || "00:00";
    var parts = value.split(":");
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;

    el("out12").textContent = to12(h, m);
    el("out12note").textContent = "written as " + ST.pad2(h) + ":" + ST.pad2(m) + " in 24-hour time";
    el("friendly12").textContent = "In words: " + friendly(h, m) + ".";
  }

  el("in24").addEventListener("input", render24to12);
  el("in24").addEventListener("change", render24to12);

  el("nowBtn").addEventListener("click", function () {
    var now = new Date();
    el("in24").value = ST.pad2(now.getHours()) + ":" + ST.pad2(now.getMinutes());
    render24to12();
  });

  el("copy12").addEventListener("click", function () {
    ST.copyText(el("out12").textContent, "Copied");
  });

  /* ---------------- 12 → 24 ---------------- */

  var ampmValue = "AM";

  function render12to24() {
    var hour = parseInt(el("inHour").value, 10) || 12;
    var minute = parseInt(el("inMin").value, 10);
    if (isNaN(minute) || minute < 0) minute = 0;
    if (minute > 59) minute = 59;
    el("inMin").value = minute;

    el("out24").textContent = to24(hour, minute, ampmValue);
    el("out24note").textContent =
      "that is " + hour + ":" + ST.pad2(minute) + " " + ampmValue + " · " +
      friendly(parseInt(to24(hour, minute, ampmValue).slice(0, 2), 10), minute);
  }

  var hourSelect = el("inHour");
  for (var i = 1; i <= 12; i++) {
    var opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(i);
    hourSelect.appendChild(opt);
  }
  hourSelect.value = "11";

  hourSelect.addEventListener("change", render12to24);
  el("inMin").addEventListener("input", render12to24);

  el("ampm").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-ampm]");
    if (!btn) return;
    ampmValue = btn.getAttribute("data-ampm");
    el("ampm").querySelectorAll("[data-ampm]").forEach(function (b) {
      b.setAttribute("aria-selected", String(b === btn));
    });
    render12to24();
  });

  /* ---------------- tabs ---------------- */

  function setMode(is24to12) {
    el("tab24to12").setAttribute("aria-selected", String(is24to12));
    el("tab12to24").setAttribute("aria-selected", String(!is24to12));
    el("panel24to12").hidden = !is24to12;
    el("panel12to24").hidden = is24to12;
  }

  el("tab24to12").addEventListener("click", function () { setMode(true); });
  el("tab12to24").addEventListener("click", function () { setMode(false); });

  /* ---------------- reference table ---------------- */

  var rows = "";
  for (var h = 0; h < 24; h++) {
    var label = to12(h, 0);
    var note = "";
    if (h === 0) note = "midnight — start of the day";
    else if (h === 12) note = "noon";
    else note = friendly(h, 0);
    rows +=
      "<tr><td>" + ST.pad2(h) + ":00</td><td>" + label + "</td><td>" + note + "</td></tr>";
  }
  el("tableBody").innerHTML = rows;

  /* ---------------- start ---------------- */

  tickClock();
  setInterval(tickClock, 1000);
  render24to12();
  render12to24();
})();
