/* Calculator — standard, scientific and percentage modes.
   The expression is evaluated by a small hand-written parser (no eval). */

(function () {
  "use strict";

  var ST = window.SimpleTools;
  var el = function (id) {
    return document.getElementById(id);
  };

  var OPERATORS = "+−×÷^";
  var useDeg = true;
  var mode = "standard";
  var expr = "";

  /* ---------------- number formatting ---------------- */

  function formatNumber(n) {
    if (typeof n !== "number" || isNaN(n)) return "Not a number";
    if (!isFinite(n)) return n > 0 ? "∞" : "−∞";
    var abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e13 || abs < 1e-9)) {
      return n.toExponential(6).replace("e+", "e");
    }
    var rounded = parseFloat(n.toPrecision(12));
    if (Object.is(rounded, -0)) rounded = 0;
    return String(rounded);
  }

  function tidy(n, places) {
    if (typeof n !== "number" || !isFinite(n)) return "—";
    var p = typeof places === "number" ? places : 4;
    return parseFloat(n.toFixed(p));
  }

  /* ---------------- tokenizer + parser ---------------- */

  var FUNCTION_NAMES = ["sin", "cos", "tan", "log", "ln", "sqrt", "abs"];

  function tokenize(src) {
    var s = String(src).replace(/−/g, "-").replace(/\s+/g, "");
    var tokens = [];
    var i = 0;

    while (i < s.length) {
      var ch = s.charAt(i);

      if (/[0-9.]/.test(ch)) {
        var num = "";
        while (i < s.length && /[0-9.]/.test(s.charAt(i))) {
          num += s.charAt(i);
          i++;
        }
        if ((num.match(/\./g) || []).length > 1) throw new Error("Check the decimal points");
        tokens.push({ t: "num", v: parseFloat(num) });
        continue;
      }

      if ("+-*/^()%!×÷".indexOf(ch) >= 0) {
        var mapped = ch === "*" ? "×" : ch === "/" ? "÷" : ch === "-" ? "−" : ch;
        tokens.push({ t: mapped });
        i++;
        continue;
      }

      if (ch === "√") {
        tokens.push({ t: "fn", v: "sqrt" });
        i++;
        continue;
      }
      if (ch === "π") {
        tokens.push({ t: "fn", v: "π" });
        i++;
        continue;
      }

      var found = null;
      for (var f = 0; f < FUNCTION_NAMES.length; f++) {
        if (s.slice(i, i + FUNCTION_NAMES[f].length) === FUNCTION_NAMES[f]) {
          found = FUNCTION_NAMES[f];
          break;
        }
      }
      if (!found && ch === "e") found = "e";

      if (found) {
        tokens.push({ t: "fn", v: found });
        i += found.length;
        continue;
      }

      throw new Error('I do not understand "' + ch + '"');
    }

    return addImplicitMultiplication(tokens);
  }

  function endsValue(tok) {
    return (
      tok.t === "num" ||
      tok.t === ")" ||
      tok.t === "%" ||
      tok.t === "!" ||
      (tok.t === "fn" && (tok.v === "π" || tok.v === "e"))
    );
  }

  function startsValue(tok) {
    return tok.t === "num" || tok.t === "(" || tok.t === "fn";
  }

  function addImplicitMultiplication(tokens) {
    var out = [];
    for (var i = 0; i < tokens.length; i++) {
      if (i > 0 && endsValue(tokens[i - 1]) && startsValue(tokens[i])) {
        out.push({ t: "×" });
      }
      out.push(tokens[i]);
    }
    return out;
  }

  function factorial(n) {
    if (n < 0 || Math.abs(n - Math.round(n)) > 1e-9) {
      throw new Error("Factorial needs a whole number");
    }
    var v = Math.round(n);
    if (v > 170) return Infinity;
    var result = 1;
    for (var i = 2; i <= v; i++) result *= i;
    return result;
  }

  function applyFunction(name, arg, degrees) {
    var radians = degrees ? (arg * Math.PI) / 180 : arg;
    switch (name) {
      case "sin":
        return Math.sin(radians);
      case "cos":
        return Math.cos(radians);
      case "tan":
        return Math.tan(radians);
      case "log":
        if (arg <= 0) throw new Error("log needs a number above zero");
        return Math.log10(arg);
      case "ln":
        if (arg <= 0) throw new Error("ln needs a number above zero");
        return Math.log(arg);
      case "sqrt":
        if (arg < 0) throw new Error("√ of a negative number is not real");
        return Math.sqrt(arg);
      case "abs":
        return Math.abs(arg);
      default:
        throw new Error("Unknown function");
    }
  }

  function evaluate(src, degrees) {
    var tokens = tokenize(src);
    var pos = 0;

    function peek() {
      return tokens[pos];
    }
    function take() {
      return tokens[pos++];
    }

    function parseExpression() {
      var value = parseTerm();
      while (peek() && (peek().t === "+" || peek().t === "−")) {
        var op = take().t;
        var rhs = parseTerm();
        value = op === "+" ? value + rhs : value - rhs;
      }
      return value;
    }

    function parseTerm() {
      var value = parseUnary();
      while (peek() && (peek().t === "×" || peek().t === "÷")) {
        var op = take().t;
        var rhs = parseUnary();
        if (op === "×") {
          value = value * rhs;
        } else {
          if (rhs === 0) throw new Error("Cannot divide by zero");
          value = value / rhs;
        }
      }
      return value;
    }

    function parseUnary() {
      if (peek() && peek().t === "−") {
        take();
        return -parseUnary();
      }
      if (peek() && peek().t === "+") {
        take();
        return parseUnary();
      }
      return parsePower();
    }

    function parsePower() {
      var base = parsePostfix();
      if (peek() && peek().t === "^") {
        take();
        return Math.pow(base, parseUnary());
      }
      return base;
    }

    function parsePostfix() {
      var value = parsePrimary();
      while (peek() && (peek().t === "%" || peek().t === "!")) {
        var t = take().t;
        if (t === "%") value = value / 100;
        else value = factorial(value);
      }
      return value;
    }

    function parsePrimary() {
      var tok = peek();
      if (!tok) throw new Error("Incomplete expression");

      if (tok.t === "num") {
        take();
        return tok.v;
      }

      if (tok.t === "(") {
        take();
        var inner = parseExpression();
        if (!peek() || peek().t !== ")") throw new Error("Missing a )");
        take();
        return inner;
      }

      if (tok.t === "fn") {
        take();
        var name = tok.v;
        if (name === "π") return Math.PI;
        if (name === "e") return Math.E;

        var arg;
        if (peek() && peek().t === "(") {
          take();
          arg = parseExpression();
          if (!peek() || peek().t !== ")") throw new Error("Missing a )");
          take();
        } else {
          arg = parsePostfix();
        }
        return applyFunction(name, arg, degrees);
      }

      throw new Error('Unexpected "' + tok.t + '"');
    }

    if (!tokens.length) throw new Error("Incomplete expression");

    var result = parseExpression();
    if (pos < tokens.length) throw new Error('Unexpected "' + tokens[pos].t + '"');
    return result;
  }

  /* ---------------- display ---------------- */

  var exprNode = el("expr");
  var resultNode = el("result");

  function setResult(text, isError) {
    resultNode.textContent = text;
    resultNode.classList.toggle("error", !!isError);
  }

  function render() {
    exprNode.textContent = expr || "0";
    if (!expr) {
      setResult("0", false);
      return;
    }
    try {
      var value = evaluate(expr, useDeg);
      setResult(formatNumber(value), false);
    } catch (err) {
      // while typing, an unfinished expression is normal — show a quiet placeholder
      var unfinished = /Incomplete|Missing/.test(err.message);
      setResult(unfinished ? "…" : err.message, !unfinished);
    }
  }

  /* ---------------- editing ---------------- */

  function insert(text) {
    var last = expr.slice(-1);

    if (text === ".") {
      var lastNumber = expr.split(/[^0-9.]/).pop();
      if (lastNumber.indexOf(".") >= 0) return;
      if (lastNumber === "") text = "0.";
    }

    if (text.length === 1 && OPERATORS.indexOf(text) >= 0) {
      if (expr === "") {
        if (text !== "−") return;
      } else if (OPERATORS.indexOf(last) >= 0) {
        expr = expr.slice(0, -1) + text;
        render();
        return;
      } else if (last === "(" && text !== "−") {
        return;
      }
    }

    if (text === "%" || text === "!" || text === ")") {
      if (expr === "") return;
      if ("+−×÷^(".indexOf(last) >= 0) return;
    }

    if (/^[0-9]$/.test(text) && last === "0") {
      // replace a lone leading zero instead of writing 07
      var before = expr.slice(0, -1);
      if (before === "" || /[^0-9.]$/.test(before)) {
        expr = before;
      }
    }

    expr += text;
    render();
  }

  function backspace() {
    if (!expr) return;

    var functions = ["sin(", "cos(", "tan(", "log(", "ln(", "√(", "abs("];
    for (var i = 0; i < functions.length; i++) {
      if (expr.slice(-functions[i].length) === functions[i]) {
        expr = expr.slice(0, -functions[i].length);
        render();
        return;
      }
    }

    expr = expr.slice(0, -1);
    render();
  }

  function clearAll() {
    expr = "";
    render();
  }

  function toggleSign() {
    if (!expr) {
      expr = "−";
      render();
      return;
    }
    if (expr.slice(0, 1) === "−") {
      expr = expr.slice(1);
    } else {
      expr = "−" + expr;
    }
    render();
  }

  /* ---------------- history ---------------- */

  function getHistory() {
    var list = ST.store.get("calcHistory", []);
    if (!Array.isArray(list)) return [];
    return list.slice(0, ST.LIMITS.history);
  }

  function renderHistory() {
    var list = getHistory();
    var node = el("historyList");

    if (!list.length) {
      node.innerHTML = '<p class="empty" style="margin:0">No sums yet — press = and it lands here.</p>';
      el("historyNote").textContent = "The last " + ST.LIMITS.history + " sums are kept in this browser.";
      return;
    }

    node.innerHTML = list
      .map(function (item, index) {
        return (
          '<button class="history-item" type="button" data-index="' + index + '" title="Use this answer">' +
          '<span class="h-expr">' + escapeHtml(item.expr) + "</span>" +
          '<span class="h-res">' + escapeHtml(item.result) + "</span>" +
          "</button>"
        );
      })
      .join("");

    el("historyNote").textContent =
      list.length + " of " + ST.LIMITS.history + " kept · tap one to reuse the answer";
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function equals() {
    if (!expr) return;
    try {
      var value = evaluate(expr, useDeg);
      var shown = formatNumber(value);
      ST.store.pushLimited(
        "calcHistory",
        { expr: expr, result: shown },
        ST.LIMITS.history
      );
      expr = shown;
      renderHistory();
      render();
      exprNode.textContent = expr;
      setResult(shown, false);
    } catch (err) {
      setResult(err.message, true);
      ST.toast(err.message);
    }
  }

  /* ---------------- percentage mode ---------------- */

  function number(input) {
    var v = parseFloat(el(input).value);
    return isNaN(v) ? 0 : v;
  }

  function setBar(barId, percent, negative) {
    var bar = el(barId);
    var width = Math.max(0, Math.min(100, percent));
    bar.style.width = width + "%";
    var wrap = bar.parentElement;
    if (wrap) wrap.classList.toggle("negative", !!negative);
  }

  function percentOne() {
    var pct = number("p1a");
    var amount = number("p1b");
    var value = (pct / 100) * amount;
    el("p1out").textContent = formatNumber(tidy(value));
    el("p1note").textContent = tidy(pct) + "% of " + tidy(amount) + " · the bar shows the share";
    setBar("p1bar", pct, pct < 0);
  }

  function percentTwo() {
    var part = number("p2a");
    var whole = number("p2b");
    if (whole === 0) {
      el("p2out").textContent = "—";
      el("p2note").textContent = "cannot divide by zero";
      setBar("p2bar", 0, false);
      return;
    }
    var pct = (part / whole) * 100;
    el("p2out").textContent = formatNumber(tidy(pct, 2)) + "%";
    el("p2note").textContent =
      tidy(part) + " of " + tidy(whole) + (Math.abs(pct) > 100 ? " · more than the whole" : "");
    setBar("p2bar", pct, pct < 0);
  }

  function percentThree() {
    var from = number("p3a");
    var to = number("p3b");
    if (from === 0) {
      el("p3out").textContent = "—";
      el("p3note").textContent = "a change from zero has no percentage";
      setBar("p3bar", 0, false);
      return;
    }
    var pct = ((to - from) / Math.abs(from)) * 100;
    var diff = Math.abs(to - from);
    el("p3out").textContent = (pct > 0 ? "+" : pct < 0 ? "−" : "") + formatNumber(tidy(Math.abs(pct), 2)) + "%";
    el("p3note").textContent =
      (pct > 0 ? "increase" : pct < 0 ? "decrease" : "no change") +
      " of " + formatNumber(tidy(diff)) + " · " + tidy(from) + " → " + tidy(to);
    setBar("p3bar", Math.abs(pct), pct < 0);
  }

  ["p1a", "p1b"].forEach(function (id) {
    el(id).addEventListener("input", percentOne);
  });
  ["p2a", "p2b"].forEach(function (id) {
    el(id).addEventListener("input", percentTwo);
  });
  ["p3a", "p3b"].forEach(function (id) {
    el(id).addEventListener("input", percentThree);
  });

  /* ---------------- modes ---------------- */

  function setMode(next) {
    mode = next;
    var isPercent = next === "percent";
    el("calcArea").hidden = isPercent;
    el("pctArea").hidden = !isPercent;
    el("sciKeys").hidden = next !== "scientific";

    el("tabStandard").setAttribute("aria-selected", String(next === "standard"));
    el("tabScientific").setAttribute("aria-selected", String(next === "scientific"));
    el("tabPercent").setAttribute("aria-selected", String(isPercent));

    if (isPercent) {
      percentOne();
      percentTwo();
      percentThree();
    }
  }

  el("tabStandard").addEventListener("click", function () { setMode("standard"); });
  el("tabScientific").addEventListener("click", function () { setMode("scientific"); });
  el("tabPercent").addEventListener("click", function () { setMode("percent"); });

  el("angleBtn").addEventListener("click", function () {
    useDeg = !useDeg;
    el("angleBtn").textContent = useDeg ? "DEG" : "RAD";
    el("angleBtn").setAttribute("aria-pressed", String(!useDeg));
    render();
  });

  /* ---------------- keypad ---------------- */

  document.querySelectorAll("[data-insert]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      insert(btn.getAttribute("data-insert"));
    });
  });

  document.querySelectorAll("[data-action]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var action = btn.getAttribute("data-action");
      if (action === "clear") clearAll();
      else if (action === "back") backspace();
      else if (action === "sign") toggleSign();
      else if (action === "equals") equals();
    });
  });

  el("historyList").addEventListener("click", function (e) {
    var item = e.target.closest("[data-index]");
    if (!item) return;
    var index = parseInt(item.getAttribute("data-index"), 10);
    var entry = getHistory()[index];
    if (!entry) return;
    expr = String(entry.result).replace(/−/g, "−");
    setMode("standard");
    render();
    ST.toast("Answer " + entry.result + " is ready to use");
  });

  el("clearHistory").addEventListener("click", function () {
    ST.store.set("calcHistory", []);
    renderHistory();
    ST.toast("History cleared");
  });

  /* ---------------- keyboard ---------------- */

  document.addEventListener("keydown", function (e) {
    if (mode === "percent") return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    var k = e.key;

    if (/^[0-9]$/.test(k)) {
      insert(k);
    } else if (k === "." || k === ",") {
      insert(".");
    } else if (k === "+" || k === "-" || k === "^" || k === "(" || k === ")" || k === "%" || k === "!") {
      insert(k === "-" ? "−" : k);
    } else if (k === "*" || k === "x" || k === "X") {
      insert("×");
    } else if (k === "/") {
      insert("÷");
    } else if (k === "Enter" || k === "=") {
      equals();
    } else if (k === "Backspace") {
      backspace();
    } else if (k === "Escape") {
      clearAll();
    } else {
      return;
    }
    e.preventDefault();
  });

  /* ---------------- start ---------------- */

  render();
  renderHistory();
  percentOne();
  percentTwo();
  percentThree();
})();
