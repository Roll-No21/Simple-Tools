/* Date page — today's numbers, a month calendar, and all months in a year. */

(function () {
  "use strict";

  var ST = window.SimpleTools;
  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  var DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var el = function (id) {
    return document.getElementById(id);
  };

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function isLeap(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /* ---------------- today ---------------- */

  function renderToday() {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    var d = now.getDate();
    var total = ST.dayOfYear(now);
    var yearDays = isLeap(y) ? 366 : 365;

    el("bigDay").textContent = d;
    el("bigMonth").textContent = "Month " + (m + 1);
    el("todayTitle").textContent =
      DOW[now.getDay()] + ", " + d + " " + MONTHS[m] + " " + y;

    el("numericDate").innerHTML =
      "Day <strong>" + ST.pad2(d) + "</strong> · Month <strong>" + ST.pad2(m + 1) +
      "</strong> · Year <strong>" + y + "</strong> &nbsp;|&nbsp; " +
      ST.pad2(d) + "/" + ST.pad2(m + 1) + "/" + y + " &nbsp;|&nbsp; " +
      y + "-" + ST.pad2(m + 1) + "-" + ST.pad2(d);

    el("dateChips").innerHTML = [
      '<span class="chip">Day <strong>' + d + '</strong></span>',
      '<span class="chip">Month <strong>' + (m + 1) + '</strong></span>',
      '<span class="chip">Week <strong>' + ST.isoWeek(now) + '</strong></span>',
      '<span class="chip">Day <strong>' + total + "</strong> of " + yearDays + "</span>"
    ].join("");

    var facts = [
      ["Weekday", DOW[now.getDay()]],
      ["Day of year", total + " / " + yearDays],
      ["Days left", yearDays - total],
      ["Week number", "Week " + ST.isoWeek(now)],
      ["Days in month", daysInMonth(y, m) + " days"],
      ["Leap year", isLeap(y) ? "Yes — 366 days" : "No — 365 days"]
    ];

    el("facts").innerHTML = facts
      .map(function (f) {
        return '<div class="fact"><dt>' + f[0] + "</dt><dd>" + f[1] + "</dd></div>";
      })
      .join("");
  }

  /* ---------------- calendar ---------------- */

  var today = new Date();
  var view = { year: today.getFullYear(), month: today.getMonth() };

  function renderCalendar() {
    var first = new Date(view.year, view.month, 1);
    var startPad = first.getDay();
    var total = daysInMonth(view.year, view.month);
    var prevTotal = daysInMonth(view.year, view.month - 1);

    el("calTitle").textContent = MONTHS[view.month] + " " + view.year;

    var html = DOW_SHORT.map(function (d) {
      return '<div class="dow">' + d.slice(0, 1) + "</div>";
    }).join("");

    for (var i = startPad - 1; i >= 0; i--) {
      html += '<div class="cell pad">' + (prevTotal - i) + "</div>";
    }

    for (var day = 1; day <= total; day++) {
      var isToday =
        view.year === today.getFullYear() &&
        view.month === today.getMonth() &&
        day === today.getDate();
      html += '<div class="cell' + (isToday ? " today" : "") + '">' + day + "</div>";
    }

    var cells = startPad + total;
    var trail = (7 - (cells % 7)) % 7;
    for (var t = 1; t <= trail; t++) {
      html += '<div class="cell pad">' + t + "</div>";
    }

    el("calendar").innerHTML = html;
    renderMonths();
  }

  /* ---------------- months table ---------------- */

  function renderMonths() {
    var y = view.year;
    el("monthsYear").textContent = y;
    el("yearInput").value = y;

    var rows = MONTHS.map(function (name, i) {
      var last = daysInMonth(y, i);
      var lastDay = new Date(y, i, last).getDay();
      var isCurrent =
        y === today.getFullYear() && i === today.getMonth();
      var extra = "";
      if (i === 1) {
        extra = isLeap(y) ? " (leap year)" : " (not a leap year)";
      }
      return (
        '<tr class="' + (isCurrent ? "is-today" : "") + '">' +
        "<td>" + (i + 1) + "</td>" +
        "<td>" + name + extra + "</td>" +
        "<td>" + last + "</td>" +
        "<td>" + DOW[lastDay] + "</td>" +
        "</tr>"
      );
    });

    el("monthsBody").innerHTML = rows.join("");
    el("leapNote").textContent = isLeap(y)
      ? y + " is a leap year, so February has 29 days and the year has 366 days."
      : y + " is not a leap year, so February has 28 days and the year has 365 days.";
  }

  /* ---------------- wiring ---------------- */

  el("prevMonth").addEventListener("click", function () {
    view.month -= 1;
    if (view.month < 0) {
      view.month = 11;
      view.year -= 1;
    }
    renderCalendar();
  });

  el("nextMonth").addEventListener("click", function () {
    view.month += 1;
    if (view.month > 11) {
      view.month = 0;
      view.year += 1;
    }
    renderCalendar();
  });

  el("calToday").addEventListener("click", function () {
    today = new Date();
    view.year = today.getFullYear();
    view.month = today.getMonth();
    renderCalendar();
  });

  function applyYear() {
    var value = parseInt(el("yearInput").value, 10);
    if (!value || value < 1900 || value > 2200) {
      ST.toast("Choose a year between 1900 and 2200");
      el("yearInput").value = view.year;
      return;
    }
    view.year = value;
    renderCalendar();
  }

  el("yearApply").addEventListener("click", applyYear);
  el("yearInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") applyYear();
  });
  el("yearReset").addEventListener("click", function () {
    view.year = new Date().getFullYear();
    renderCalendar();
  });

  renderToday();
  renderCalendar();
  setInterval(renderToday, 30000);
})();
