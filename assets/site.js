/* Общие скрипты сайта: тема, мобильное меню, демонстрация свёртки. */
(function () {
  "use strict";

  /* ---------- Тема ---------- */
  var root = document.documentElement;
  function storedTheme() {
    try { return localStorage.getItem("cv-theme"); } catch (e) { return null; }
  }
  function saveTheme(v) {
    try { localStorage.setItem("cv-theme", v); } catch (e) { /* хранилище недоступно */ }
  }
  var t = storedTheme();
  if (t === "light" || t === "dark") root.setAttribute("data-theme", t);

  function currentTheme() {
    var a = root.getAttribute("data-theme");
    if (a) return a;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var themeBtn = document.querySelector(".theme-toggle");
    function label() {
      if (!themeBtn) return;
      var dark = currentTheme() === "dark";
      themeBtn.innerHTML = '<span class="tt-icon" aria-hidden="true">◐</span><span class="tt-text">' + (dark ? "Светлая тема" : "Тёмная тема") + "</span>";
      themeBtn.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
    }
    if (themeBtn) {
      label();
      themeBtn.addEventListener("click", function () {
        var next = currentTheme() === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        saveTheme(next);
        label();
      });
    }

    /* ---------- Мобильное меню ---------- */
    var navBtn = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (navBtn && nav) {
      navBtn.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        navBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    document.querySelectorAll("[data-conv]").forEach(initConv);
  });

  /* ---------- Демонстрация свёртки ---------- */
  var IMAGE = [
    [10, 20, 30, 40, 50, 60, 70, 80],
    [10, 20, 30, 40, 50, 60, 70, 80],
    [10, 20, 220, 220, 220, 220, 70, 80],
    [10, 20, 220, 220, 220, 220, 70, 80],
    [10, 20, 220, 220, 220, 220, 70, 80],
    [10, 20, 220, 220, 220, 220, 70, 80],
    [10, 20, 30, 40, 50, 60, 70, 80],
    [10, 20, 30, 40, 50, 60, 70, 80]
  ];

  var KERNELS = {
    sobelx: { name: "Собель по X", k: [-1, 0, 1, -2, 0, 2, -1, 0, 1], div: 1, abs: true },
    sobely: { name: "Собель по Y", k: [-1, -2, -1, 0, 0, 0, 1, 2, 1], div: 1, abs: true },
    laplace: { name: "Лаплас", k: [0, 1, 0, 1, -4, 1, 0, 1, 0], div: 1, abs: true },
    box: { name: "Размытие 3×3", k: [1, 1, 1, 1, 1, 1, 1, 1, 1], div: 9, abs: false },
    sharpen: { name: "Повышение резкости", k: [0, -1, 0, -1, 5, -1, 0, -1, 0], div: 1, abs: false }
  };

  function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
  function paint(cell, v) {
    cell.style.background = "rgb(" + v + "," + v + "," + v + ")";
    cell.style.color = v > 120 ? "#111" : "#eee";
  }

  function initConv(box) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var kernelKey = box.getAttribute("data-kernel") || "sobelx";
    var autoplay = box.hasAttribute("data-autoplay") && !reduce;
    var H = IMAGE.length, W = IMAGE[0].length, OH = H - 2, OW = W - 2;

    box.innerHTML =
      '<div class="conv__row">' +
      '<div><div class="conv__label">Изображение 8×8</div><div class="px-grid conv-in"></div></div>' +
      '<div><div class="conv__label">Ядро</div><div class="kernel-grid conv-k"></div><div class="conv__label conv-div" style="margin-top:.4rem"></div></div>' +
      '<div><div class="conv__label">Результат 6×6</div><div class="px-grid conv-out"></div></div>' +
      "</div>" +
      '<div class="conv__readout" aria-live="polite"></div>' +
      '<div class="conv__controls" role="group" aria-label="Выбор ядра свёртки"></div>';

    var inG = box.querySelector(".conv-in"), outG = box.querySelector(".conv-out");
    var kG = box.querySelector(".conv-k"), divL = box.querySelector(".conv-div");
    var readout = box.querySelector(".conv__readout"), controls = box.querySelector(".conv__controls");
    inG.style.gridTemplateColumns = "repeat(" + W + ", var(--cell, 30px))";
    outG.style.gridTemplateColumns = "repeat(" + OW + ", var(--cell, 30px))";

    var inCells = [], outCells = [];
    IMAGE.forEach(function (row) {
      row.forEach(function (v) {
        var c = document.createElement("span");
        c.className = "px"; c.textContent = v; paint(c, v);
        inG.appendChild(c); inCells.push(c);
      });
    });
    for (var i = 0; i < OH * OW; i++) {
      var c = document.createElement("button");
      c.type = "button";
      c.className = "px";
      c.style.border = "0"; c.style.padding = "0"; c.style.cursor = "pointer";
      c.setAttribute("aria-label", "Ячейка результата " + (Math.floor(i / OW) + 1) + ", " + (i % OW + 1));
      (function (idx) {
        c.addEventListener("click", function () { stop(); show(idx, true); });
      })(i);
      outG.appendChild(c); outCells.push(c);
    }

    var timer = null, pos = 0;

    function compute(idx) {
      var r = Math.floor(idx / OW), col = idx % OW, K = KERNELS[kernelKey], s = 0, terms = [];
      for (var dy = 0; dy < 3; dy++) {
        for (var dx = 0; dx < 3; dx++) {
          var w = K.k[dy * 3 + dx], v = IMAGE[r + dy][col + dx];
          s += w * v;
          if (w !== 0) terms.push((w < 0 ? "(" + w + ")" : w) + "·" + v);
        }
      }
      var raw = s / K.div;
      var out = clamp(K.abs ? Math.abs(raw) : raw);
      return { r: r, c: col, sum: s, raw: raw, out: out, terms: terms };
    }

    function clearMarks() {
      inCells.forEach(function (c) { c.classList.remove("in-win"); });
      outCells.forEach(function (c) { c.classList.remove("out-cur"); });
    }

    function show(idx, mark) {
      var res = compute(idx), K = KERNELS[kernelKey];
      clearMarks();
      for (var dy = 0; dy < 3; dy++) for (var dx = 0; dx < 3; dx++) inCells[(res.r + dy) * W + res.c + dx].classList.add("in-win");
      outCells[idx].textContent = res.out; paint(outCells[idx], res.out);
      if (mark) outCells[idx].classList.add("out-cur");
      var expr = res.terms.length > 5 ? res.terms.slice(0, 5).join(" + ") + " + …" : res.terms.join(" + ");
      var txt = "Окно (" + (res.r + 1) + ", " + (res.c + 1) + "): " + (K.div !== 1 ? "(" + expr + ") / " + K.div : expr) +
        " = " + (Math.round(res.raw * 10) / 10);
      if (K.abs) txt += " → |·| и обрезка до [0, 255] → " + res.out;
      else if (res.out !== Math.round(res.raw)) txt += " → обрезка до [0, 255] → " + res.out;
      readout.textContent = txt;
    }

    function resetOut() {
      outCells.forEach(function (c) { c.textContent = ""; c.style.background = "var(--surface-2)"; c.style.color = ""; });
      pos = 0;
    }

    function fillAll() {
      for (var i = 0; i < OH * OW; i++) show(i, false);
      clearMarks();
      readout.textContent = "Нажмите на любую ячейку результата, чтобы увидеть, как она вычислена.";
    }

    function tick() {
      show(pos, true);
      pos++;
      if (pos >= OH * OW) {
        stop();
        timer = setTimeout(function () { resetOut(); play(); }, 2200);
        playBtn.textContent = "Пауза"; playBtn.setAttribute("aria-pressed", "true");
      }
    }
    function play() { stop(); timer = setInterval(tick, 380); playBtn.textContent = "Пауза"; playBtn.setAttribute("aria-pressed", "true"); }
    function stop() { clearInterval(timer); clearTimeout(timer); timer = null; playBtn.textContent = "Анимация"; playBtn.setAttribute("aria-pressed", "false"); }

    function renderKernel() {
      var K = KERNELS[kernelKey];
      kG.innerHTML = "";
      K.k.forEach(function (w) { var s = document.createElement("span"); s.textContent = w; kG.appendChild(s); });
      divL.textContent = K.div !== 1 ? "× 1/" + K.div : (K.abs ? "берём модуль" : "");
      Array.prototype.forEach.call(controls.querySelectorAll("[data-k]"), function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-k") === kernelKey ? "true" : "false");
      });
    }

    Object.keys(KERNELS).forEach(function (key) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = KERNELS[key].name; b.setAttribute("data-k", key);
      b.addEventListener("click", function () {
        kernelKey = key; renderKernel();
        var wasPlaying = timer !== null;
        stop(); resetOut();
        if (wasPlaying) play(); else fillAll();
      });
      controls.appendChild(b);
    });
    var playBtn = document.createElement("button");
    playBtn.type = "button"; playBtn.className = "chip"; playBtn.style.marginLeft = "auto";
    playBtn.addEventListener("click", function () {
      if (timer !== null) { stop(); }
      else { if (pos === 0 || pos >= OH * OW) resetOut(); play(); }
    });
    controls.appendChild(playBtn);

    renderKernel();
    resetOut();
    if (autoplay) play(); else { stop(); fillAll(); }
  }
})();
