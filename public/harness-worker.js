/* learnlab build harness.
 * Runs lesson code + tests inside a Web Worker (browser) or a vm sandbox (scripts/check-content.mjs).
 * Exposes to user code: console.log, plot(series, opts), test(name, fn),
 * assert(cond, msg), assertClose(a, b, tol, msg), assertArrayClose(a, b, tol, msg).
 */
function runHarness(code, tests) {
  var logs = [];
  var plots = [];
  var registered = [];
  var results = [];
  var error = null;

  function fmt(v) {
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(+v.toPrecision(6));
    try {
      return JSON.stringify(v, function (_k, x) {
        return typeof x === "number" ? +x.toPrecision(6) : x;
      });
    } catch (e) {
      return String(v);
    }
  }
  var consoleShim = {
    log: function () { logs.push(Array.prototype.map.call(arguments, fmt).join(" ")); },
    warn: function () { logs.push("⚠ " + Array.prototype.map.call(arguments, fmt).join(" ")); },
    error: function () { logs.push("✖ " + Array.prototype.map.call(arguments, fmt).join(" ")); },
  };
  function plot(series, opts) {
    if (plots.length >= 6) return;
    var list = Array.isArray(series) ? series : [series];
    plots.push({
      series: list.slice(0, 6).map(function (s, i) {
        var y = Array.from(s.y || []);
        var x = s.x ? Array.from(s.x) : y.map(function (_v, j) { return j; });
        // Downsample long series so the UI stays responsive.
        var stride = Math.max(1, Math.ceil(x.length / 1500));
        var xs = [], ys = [];
        for (var j = 0; j < x.length; j += stride) { xs.push(+x[j]); ys.push(+y[j]); }
        return { name: s.name || "series " + (i + 1), x: xs, y: ys, points: !!s.points };
      }),
      opts: opts || {},
    });
  }
  function test(name, fn) { registered.push({ name: name, fn: fn }); }
  function assert(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }
  function assertClose(a, b, tol, msg) {
    tol = tol === undefined ? 1e-6 : tol;
    if (typeof a !== "number" || !isFinite(a)) throw new Error((msg ? msg + ": " : "") + "expected a finite number, got " + fmt(a));
    var scale = Math.max(1, Math.abs(b));
    if (Math.abs(a - b) > tol * scale) throw new Error((msg ? msg + ": " : "") + "expected ≈ " + fmt(b) + ", got " + fmt(a));
  }
  function assertArrayClose(a, b, tol, msg) {
    if (!a || typeof a.length !== "number") throw new Error((msg ? msg + ": " : "") + "expected an array, got " + fmt(a));
    if (a.length !== b.length) throw new Error((msg ? msg + ": " : "") + "expected length " + b.length + ", got " + a.length);
    for (var i = 0; i < b.length; i++) {
      if (Array.isArray(b[i])) assertArrayClose(a[i], b[i], tol, (msg || "") + "[" + i + "]");
      else assertClose(a[i], b[i], tol, (msg || "") + "[" + i + "]");
    }
  }

  try {
    var fn = new Function(
      "console", "plot", "test", "assert", "assertClose", "assertArrayClose",
      '"use strict";\n' + code + "\n;{\n" + tests + "\n}"
    );
    fn(consoleShim, plot, test, assert, assertClose, assertArrayClose);
  } catch (e) {
    error = (e && e.name ? e.name + ": " : "") + (e && e.message ? e.message : String(e));
  }
  if (!error) {
    for (var i = 0; i < registered.length; i++) {
      try {
        registered[i].fn();
        results.push({ name: registered[i].name, pass: true });
      } catch (e) {
        results.push({ name: registered[i].name, pass: false, message: e && e.message ? e.message : String(e) });
      }
    }
  }
  return { logs: logs.slice(0, 500), plots: plots, results: results, error: error };
}

if (typeof self !== "undefined" && typeof importScripts === "function") {
  self.onmessage = function (e) {
    self.postMessage(runHarness(e.data.code, e.data.tests));
  };
}
