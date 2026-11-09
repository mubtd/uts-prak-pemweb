/* ============================================================
   ENTRY GATE + CLOUD TRANSITION
   - Menahan preloader agar tetap tampil, lalu menampilkan "Klik untuk masuk".
   - Klik = interaksi yang dibutuhkan browser -> musik boleh diputar.
   - Setelah klik: awan menutup layar, preloader disembunyikan di baliknya,
     awan naik, halaman tampil.
   HARUS dimuat SEBELUM script.js dan music-player.js.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- KONFIGURASI ---------- */
  const SHOW_ONCE_PER_SESSION = true;   // true: gate hanya muncul sekali per sesi tab (bukan tiap pindah halaman)
  const STORAGE_KEY = "itb-entered";
  const COVER_MS = 1000;                // lama fase awan muncul menutup layar
  const RISE_MS = 1700;                 // lama fase awan naik (samakan dengan --entry-rise di CSS)
  const GATE_TEXT = "Klik untuk masuk";
  const FALLBACK_MS = 1000;             // jaring pengaman bila preloader tidak pernah selesai

  // Kontrak dengan music-player.js
  const state = (window.ITB_ENTRY = { active: false });

  const pre = document.getElementById("preloader");
  if (!pre) return;
  try {
    if (SHOW_ONCE_PER_SESSION && sessionStorage.getItem(STORAGE_KEY) === "1") return;
  } catch (e) {}

  state.active = true;
  const root = document.documentElement;
  root.classList.add("entry-locked");

  let entered = false;
  let gate = null;
  let observer = null;

  /* ---------- GATE ---------- */
  function showGate() {
    if (gate || entered) return;
    gate = document.createElement("button");
    gate.type = "button";
    gate.className = "entry-gate";
    gate.setAttribute("aria-label", GATE_TEXT);
    gate.innerHTML = '<span class="entry-gate__text"></span>';
    gate.firstChild.textContent = GATE_TEXT;
    gate.addEventListener("click", enter);
    document.body.appendChild(gate);
    try { gate.focus({ preventScroll: true }); } catch (e) {}
  }

  // script.js menambahkan "preloader-hidden" setelah halaman load.
  // Class itu dicabut lagi pada microtask yang sama (sebelum browser sempat render),
  // sehingga preloader tidak pernah terlihat menghilang; gate tampil sebagai gantinya.
  function intercept() {
    if (pre.classList.contains("preloader-hidden")) pre.classList.remove("preloader-hidden");
    showGate();
  }
  if (pre.classList.contains("preloader-hidden")) intercept();
  observer = new MutationObserver(() => {
    if (!entered && pre.classList.contains("preloader-hidden")) intercept();
  });
  observer.observe(pre, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("load", () => setTimeout(() => { if (!entered) showGate(); }, FALLBACK_MS));

  /* ---------- MASUK ---------- */
  function enter() {
    if (entered) return;
    entered = true;
    if (observer) observer.disconnect();
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch (e) {}

    // Dikirim langsung di dalam handler klik: music-player.js memutar lagu saat izin autoplay aktif
    document.dispatchEvent(new CustomEvent("itb:entry-click"));

    if (gate) {
      gate.classList.add("is-leaving");
      setTimeout(() => gate && gate.remove(), 250);
    }

    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) fadeOut(); else runClouds();
  }

  function hidePreloader() {
    pre.classList.add("preloader-hidden");
    pre.style.display = "none";
    window.scrollTo(0, 0);
  }

  function finish() {
    root.classList.remove("entry-locked");
    document.dispatchEvent(new CustomEvent("itb:entry-done"));
  }

  // Pengguna dengan "reduce motion": tanpa awan, cukup fade
  function fadeOut() {
    pre.style.transition = "opacity .35s ease";
    pre.style.opacity = "0";
    setTimeout(() => { hidePreloader(); finish(); }, 400);
  }

  /* ---------- AWAN ---------- */
  // Bentuk awan pixel: [baris, x, lebar] pada grid 24 kolom. Baris terakhir diberi bayangan.
  const CLOUD_VARIANTS = [
    { h: 6, rects: [[0,10,6],[1,7,12],[2,3,18],[3,1,22],[4,0,24],[5,1,22]] },
    { h: 5, rects: [[0,4,5],[0,13,6],[1,2,9],[1,11,10],[2,1,22],[3,0,24],[4,1,22]] },
  ];
  CLOUD_VARIANTS.forEach((v) => {
    const rects = v.rects.map((r) => {
      const fill = r[0] === v.h - 1 ? "#d6e6ff" : "#ffffff";
      return "<rect x='" + r[1] + "' y='" + r[0] + "' width='" + r[2] + "' height='1' fill='" + fill + "'/>";
    }).join("");
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 " + v.h + "' shape-rendering='crispEdges'>" + rects + "</svg>";
    v.url = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  });

  const rand = (min, max) => min + Math.random() * (max - min);

  function makeCloud(cx, cy, width, drift) {
    const v = CLOUD_VARIANTS[Math.random() < 0.5 ? 0 : 1];
    const w = Math.max(24, Math.round(width / 24) * 24);       // kelipatan 24 -> piksel tajam & seragam
    const h = (w / 24) * v.h;
    const el = document.createElement("span");
    el.className = "entry-clouds__cloud";
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.style.left = Math.round(cx - w / 2) + "px";
    el.style.top = Math.round(cy - h / 2) + "px";
    el.style.backgroundImage = v.url;
    el.style.setProperty("--d", rand(0, 0.5).toFixed(2) + "s");
    el.style.setProperty("--drift", Math.round(drift) + "px");
    return el;
  }

  function buildClouds() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const layerH = Math.round(vh * 1.5);
    const base = Math.min(560, Math.max(200, vw * 0.32));

    const layer = document.createElement("div");
    layer.className = "entry-clouds";
    layer.setAttribute("aria-hidden", "true");
    layer.style.height = layerH + "px";
    layer.style.setProperty("--entry-rise", RISE_MS + "ms");

    const sky = document.createElement("div");
    sky.className = "entry-clouds__sky";
    layer.appendChild(sky);

    // Awan acak memenuhi layar (bagian atas ikut naik sedikit lebih cepat = parallax)
    for (let y = base * 0.1; y < layerH - base * 0.3; y += base * 0.32) {
      let x = -rand(0, 0.5) * base;
      while (x < vw + base * 0.3) {
        const w = base * rand(0.8, 1.3);
        const drift = y < layerH * 0.65 ? -rand(0, vh * 0.18) : 0;
        layer.appendChild(makeCloud(x + w / 2, y, w, drift));
        x += w * rand(0.7, 1.0);
      }
    }

    // Dua baris awan rapat tepat di tepi bawah lapisan: tepi bawah langit jadi bergerigi ala awan
    [layerH, layerH - base * 0.2].forEach((y) => {
      let x = -base * 0.3;
      while (x < vw + base * 0.3) {
        const w = base * rand(0.95, 1.25);
        layer.appendChild(makeCloud(x + w / 2, y, w, 0));
        x += w * 0.55;                                          // overlap -> tidak ada celah
      }
    });

    return layer;
  }

  function runClouds() {
    const layer = buildClouds();
    document.body.appendChild(layer);
    void layer.offsetWidth;                                     // paksa reflow agar animasi mulai bersih
    layer.classList.add("is-covering");

    setTimeout(() => {
      hidePreloader();                                          // preloader ditutup saat layar sudah tertutup awan
      layer.classList.add("is-rising");

      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        layer.remove();
        finish();
      };
      layer.addEventListener("transitionend", (e) => {
        if (e.target === layer && e.propertyName === "transform") end();
      });
      setTimeout(end, RISE_MS + 600);
    }, COVER_MS);
  }
})();
