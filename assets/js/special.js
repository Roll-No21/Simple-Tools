/* Special day page — is today a special day?
   Works fully offline from a built-in list of world days,
   and asks Wikipedia for holidays + "on this day" notes. */

(function () {
  "use strict";

  var ST = window.SimpleTools;
  var el = function (id) {
    return document.getElementById(id);
  };

  /* ---------------- built-in world days (month, day) ---------------- */

  var FIXED = [
    [1, 1, "New Year's Day"],
    [1, 4, "World Braille Day"],
    [1, 26, "Republic Day (India)"],
    [1, 29, "International Puzzle Day"],
    [1, 30, "School Day of Non-violence and Peace"],
    [2, 4, "World Cancer Day"],
    [2, 9, "World Pizza Day"],
    [2, 11, "International Day of Women and Girls in Science"],
    [2, 13, "World Radio Day"],
    [2, 14, "Valentine's Day"],
    [2, 20, "World Day of Social Justice"],
    [2, 21, "International Mother Language Day"],
    [3, 3, "World Wildlife Day"],
    [3, 8, "International Women's Day"],
    [3, 14, "Pi Day"],
    [3, 15, "World Consumer Rights Day"],
    [3, 20, "International Day of Happiness"],
    [3, 21, "World Poetry Day"],
    [3, 21, "International Day of Forests"],
    [3, 21, "World Down Syndrome Day"],
    [3, 22, "World Water Day"],
    [3, 24, "World Tuberculosis Day"],
    [4, 2, "World Autism Awareness Day"],
    [4, 7, "World Health Day"],
    [4, 12, "International Day of Human Space Flight"],
    [4, 22, "Earth Day"],
    [4, 23, "World Book and Copyright Day"],
    [5, 1, "Labour Day"],
    [5, 3, "World Press Freedom Day"],
    [5, 8, "World Red Cross and Red Crescent Day"],
    [5, 12, "International Nurses Day"],
    [5, 15, "International Day of Families"],
    [5, 18, "International Museum Day"],
    [5, 20, "World Bee Day"],
    [5, 21, "World Day for Cultural Diversity"],
    [5, 21, "International Tea Day"],
    [5, 31, "World No Tobacco Day"],
    [6, 1, "World Milk Day"],
    [6, 5, "World Environment Day"],
    [6, 8, "World Oceans Day"],
    [6, 12, "World Day Against Child Labour"],
    [6, 14, "World Blood Donor Day"],
    [6, 21, "International Day of Yoga"],
    [6, 21, "World Music Day"],
    [6, 30, "International Asteroid Day"],
    [7, 7, "World Chocolate Day"],
    [7, 11, "World Population Day"],
    [7, 17, "World Emoji Day"],
    [7, 18, "Nelson Mandela International Day"],
    [7, 30, "International Day of Friendship"],
    [8, 8, "International Cat Day"],
    [8, 9, "International Day of the World's Indigenous Peoples"],
    [8, 12, "International Youth Day"],
    [8, 12, "World Elephant Day"],
    [8, 13, "International Left-Handers Day"],
    [8, 15, "Independence Day (India)"],
    [8, 19, "World Photography Day"],
    [9, 5, "International Day of Charity"],
    [9, 8, "International Literacy Day"],
    [9, 15, "International Day of Democracy"],
    [9, 16, "International Day for the Preservation of the Ozone Layer"],
    [9, 21, "International Day of Peace"],
    [9, 27, "World Tourism Day"],
    [10, 1, "International Day of Older Persons"],
    [10, 2, "Gandhi Jayanti / International Day of Non-Violence"],
    [10, 4, "World Animal Day"],
    [10, 5, "World Teachers' Day"],
    [10, 10, "World Mental Health Day"],
    [10, 16, "World Food Day"],
    [10, 24, "United Nations Day"],
    [10, 31, "World Cities Day"],
    [11, 5, "World Tsunami Awareness Day"],
    [11, 13, "World Kindness Day"],
    [11, 14, "World Diabetes Day"],
    [11, 19, "World Toilet Day"],
    [11, 20, "World Children's Day"],
    [11, 21, "World Hello Day"],
    [12, 1, "World AIDS Day"],
    [12, 3, "International Day of Persons with Disabilities"],
    [12, 4, "International Cheetah Day"],
    [12, 10, "Human Rights Day"],
    [12, 11, "International Mountain Day"],
    [12, 25, "Christmas Day"],
    [12, 31, "New Year's Eve"]
  ];

  /* ---------------- date helpers ---------------- */

  function isLeap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  function isSameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function nthWeekday(year, monthIndex, weekday, n) {
    var first = new Date(year, monthIndex, 1);
    var offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, monthIndex, 1 + offset + (n - 1) * 7);
  }

  function lastWeekday(year, monthIndex, weekday) {
    var last = new Date(year, monthIndex + 1, 0);
    var offset = (last.getDay() - weekday + 7) % 7;
    return new Date(year, monthIndex, last.getDate() - offset);
  }

  /* Meeus / Jones / Butcher Easter algorithm */
  function easter(year) {
    var a = year % 19,
      b = Math.floor(year / 100),
      c = year % 100,
      d = Math.floor(b / 4),
      e = b % 4,
      f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4),
      k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7,
      m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31),
      day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  /* rules that follow the calendar rather than a fixed date */
  var RULES = [
    {
      name: "World Sleep Day",
      date: function (y) { return nthWeekday(y, 2, 5, 2); } // 2nd Friday of March
    },
    {
      name: "Mother's Day",
      date: function (y) { return nthWeekday(y, 4, 0, 2); } // 2nd Sunday of May
    },
    {
      name: "World Laughter Day",
      date: function (y) { return nthWeekday(y, 4, 0, 1); } // 1st Sunday of May
    },
    {
      name: "Father's Day",
      date: function (y) { return nthWeekday(y, 5, 0, 3); } // 3rd Sunday of June
    },
    {
      name: "Friendship Day",
      date: function (y) { return nthWeekday(y, 7, 0, 1); } // 1st Sunday of August
    },
    {
      name: "Earth Hour",
      date: function (y) { return lastWeekday(y, 2, 6); } // last Saturday of March
    },
    {
      name: "World Rivers Day",
      date: function (y) { return nthWeekday(y, 8, 0, 4); } // 4th Sunday of September
    },
    {
      name: "World Cleanup Day",
      date: function (y) { return nthWeekday(y, 8, 6, 3); } // 3rd Saturday of September
    },
    {
      name: "World Smile Day",
      date: function (y) { return nthWeekday(y, 9, 5, 1); } // 1st Friday of October
    },
    {
      name: "Thanksgiving (US)",
      date: function (y) { return nthWeekday(y, 10, 4, 4); } // 4th Thursday of November
    },
    {
      name: "World Philosophy Day",
      date: function (y) { return nthWeekday(y, 10, 4, 3); } // 3rd Thursday of November
    },
    {
      name: "Easter Sunday",
      date: easter
    },
    {
      name: "Good Friday",
      date: function (y) {
        var e = easter(y);
        return new Date(y, e.getMonth(), e.getDate() - 2);
      }
    }
  ];

  function observancesFor(date) {
    var out = [];
    var m = date.getMonth() + 1;
    var d = date.getDate();
    var y = date.getFullYear();

    FIXED.forEach(function (row) {
      if (row[0] === m && row[1] === d) out.push(row[2]);
    });

    RULES.forEach(function (rule) {
      if (isSameDay(rule.date(y), date)) out.push(rule.name);
    });

    return out;
  }

  /* ---------------- formatting ---------------- */

  function longDate(date) {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function toInputValue(date) {
    return (
      date.getFullYear() + "-" + ST.pad2(date.getMonth() + 1) + "-" + ST.pad2(date.getDate())
    );
  }

  function cleanText(text, max) {
    var t = String(text || "")
      .replace(/\s+/g, " ")
      .replace(/\((?:listen|help|info)\)/gi, "")
      .trim();
    if (max && t.length > max) {
      t = t.slice(0, max).replace(/[ ,;:.]+\S*$/, "") + "…";
    }
    return t;
  }

  /* ---------------- local verdict ---------------- */

  var selected = new Date();
  selected.setHours(12, 0, 0, 0);
  var localCount = 0;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderLocal() {
    var names = observancesFor(selected);
    var isToday = isSameDay(selected, new Date());
    localCount = names.length;

    var title, sub;
    if (names.length) {
      title = names.length === 1 ? "Yes — it's " + names[0] : "Yes — " + names.length + " special things today";
      sub = longDate(selected) + " · " + (isToday ? "today" : "the date you picked");
    } else {
      title = "An ordinary day, and that's fine";
      sub = longDate(selected) + " · no world day in the built-in list";
    }

    el("verdictTitle").textContent = title;
    el("verdictSub").textContent = sub;
    el("verdictMark").textContent = names.length ? "✦" : "○";
    el("localBadges").innerHTML = names
      .map(function (n) {
        return '<span class="badge">' + n + "</span>";
      })
      .join("");

    el("dateInput").value = toInputValue(selected);
  }

  function renderUpcoming() {
    var seen = {};
    var items = [];
    var base = new Date();
    base.setHours(12, 0, 0, 0);

    for (var i = 1; i <= 400 && items.length < 6; i++) {
      var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      var names = observancesFor(d);
      for (var j = 0; j < names.length; j++) {
        if (seen[names[j]]) continue;
        seen[names[j]] = true;
        items.push({ days: i, name: names[j], date: d });
        break;
      }
    }

    el("upcomingList").innerHTML = items
      .map(function (it) {
        return (
          "<li>" +
          '<span class="li-year">' + (it.days === 1 ? "tomorrow" : "in " + it.days + " days") + "</span>" +
          it.name +
          ' <span class="hint"> · ' +
          it.date.toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
          "</span></li>"
        );
      })
      .join("");
  }

  /* ---------------- online: Wikipedia “On this day” ---------------- */

  var API = "https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday";
  var requestId = 0;

  function setStatus(id, state, label) {
    var node = el(id);
    node.className = "status";
    node.innerHTML = '<i class="dot ' + state + '"></i>' + label;
  }

  function skeleton(listId, rows) {
    var html = "";
    for (var i = 0; i < rows; i++) html += '<li class="skeleton" aria-hidden="true"></li>';
    el(listId).innerHTML = html;
  }

  function fetchJson(url, signal) {
    if (typeof fetch !== "function") {
      return Promise.reject(new Error("fetch is not available"));
    }
    return fetch(url, {
      signal: signal,
      headers: { Accept: "application/json" },
      mode: "cors",
      cache: "no-store"
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  /* If the built-in list had nothing for this date but Wikipedia does,
     make the big answer mention it instead of claiming an ordinary day. */
  function showOnlineVerdict(holidays) {
    if (localCount || !holidays.length) return;

    var names = holidays
      .slice(0, 3)
      .map(function (h) {
        // the first clause is usually the name of the day itself
        var full = cleanText(h.text, 140);
        var firstClause = full.split(/[,;(\[]/)[0].trim();
        if (firstClause.length < 6) firstClause = full.slice(0, 70).trim();
        return firstClause.replace(/[\s,;:.]+$/, "");
      })
      .filter(Boolean);

    if (!names.length) return;

    el("verdictTitle").textContent =
      names.length === 1 ? "Yes — " + names[0] : "Yes — " + names.length + " observances today";
    el("verdictSub").textContent =
      longDate(selected) + " · from Wikipedia's list, not the built-in one";
    el("verdictMark").textContent = "✦";
    el("localBadges").innerHTML = names
      .map(function (n) {
        return '<span class="badge">' + escapeHtml(n) + "</span>";
      })
      .join("");
  }

  function loadOnline(date) {
    var id = ++requestId;
    var mm = ST.pad2(date.getMonth() + 1);
    var dd = ST.pad2(date.getDate());
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, 9000);

    setStatus("holidayStatus", "waiting", "loading");
    setStatus("eventStatus", "waiting", "loading");
    skeleton("holidayList", 3);
    skeleton("eventList", 3);

    fetchJson(API + "/holidays/" + mm + "/" + dd, controller.signal)
      .then(function (data) {
        if (id !== requestId) return;
        var holidays = (data && data.holidays) || [];
        if (!holidays.length) {
          el("holidayList").innerHTML =
            '<li class="muted">No holiday is listed for this date.</li>';
        } else {
          el("holidayList").innerHTML = holidays
            .slice(0, 6)
            .map(function (h) {
              var page = (h.pages && h.pages[0]) || null;
              var text = cleanText(h.text, 220);
              var body = page
                ? '<a href="' + page.content_urls.mobile.page + '" target="_blank" rel="noopener">' + text + "</a>"
                : text;
              return "<li>" + body + "</li>";
            })
            .join("");
        }
        setStatus("holidayStatus", "live", "live from Wikipedia");
        showOnlineVerdict(holidays);
      })
      .catch(function () {
        if (id !== requestId) return;
        el("holidayList").innerHTML =
          '<li class="muted">Could not reach Wikipedia. The built-in world days above still work offline.</li>';
        setStatus("holidayStatus", "offline", "offline");
      })
      .then(function () {
        return fetchJson(API + "/selected/" + mm + "/" + dd, controller.signal);
      })
      .then(function (data) {
        if (id !== requestId || !data) return;
        clearTimeout(timer);
        var events = (data.selected || []).slice(0, 5);
        if (!events.length) {
          el("eventList").innerHTML = '<li class="muted">Nothing notable is listed for this date.</li>';
        } else {
          el("eventList").innerHTML = events
            .map(function (ev) {
              var page = (ev.pages && ev.pages[0]) || null;
              var text = cleanText(ev.text, 200);
              var body = page
                ? '<a href="' + page.content_urls.mobile.page + '" target="_blank" rel="noopener">' + text + "</a>"
                : text;
              return "<li><span class=\"li-year\">" + (ev.year || "—") + "</span>" + body + "</li>";
            })
            .join("");
        }
        setStatus("eventStatus", "live", "live from Wikipedia");
      })
      .catch(function () {
        if (id !== requestId) return;
        el("eventList").innerHTML =
          '<li class="muted">No connection, so this list is empty.</li>';
        setStatus("eventStatus", "offline", "offline");
        clearTimeout(timer);
      });
  }

  /* ---------------- wiring ---------------- */

  function update() {
    renderLocal();
    loadOnline(selected);
  }

  el("dateInput").addEventListener("change", function () {
    var value = el("dateInput").value;
    if (!value) return;
    var parts = value.split("-");
    selected = new Date(+parts[0], +parts[1] - 1, +parts[2], 12, 0, 0, 0);
    update();
  });

  el("todayBtn").addEventListener("click", function () {
    selected = new Date();
    selected.setHours(12, 0, 0, 0);
    update();
  });

  el("refreshBtn").addEventListener("click", function () {
    loadOnline(selected);
  });

  renderUpcoming();
  update();
})();
