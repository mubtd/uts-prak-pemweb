/*
 * pendaftaran.js — Study Club PTI UMS
 * Logika halaman pendaftaran: navbar mobile, countdown, validasi,
 * autosave draft, kirim data, dan logging console untuk debugging.
 *
 * Buka DevTools (F12) > Console untuk melihat log bertag [Daftar].
 * Set DEBUG = false untuk mematikan log non-error.
 */
(function () {
  'use strict';

  /* ============ KONFIGURASI ============ */
  var CONFIG = {
    DEBUG: true,
    // Tutup pendaftaran: 1 Desember 2026 pukul 00:00 WIB (UTC+7)
    DEADLINE: '2026-12-01T00:00:00+07:00',
    // Isi dengan URL backend / Google Apps Script / Formspree.
    // Jika null, data hanya dicetak di console (mode simulasi).
    ENDPOINT: null,
    // Halaman tujuan setelah pendaftaran berhasil & tombol OK ditekan
    REDIRECT_URL: 'index.html',
    DRAFT_KEY: 'sc-pti-daftar-draft',
    SUBMITTED_KEY: 'sc-pti-daftar-submitted',
    ALASAN_MIN: 20
  };

  /* ============ LOGGER ============ */
  var TAG = '%c[Daftar]';
  var STYLE = 'background:#70b237;color:#fff;padding:1px 6px;font-weight:bold';
  var log = {
    info: function () {
      if (!CONFIG.DEBUG) return;
      console.log.apply(console, [TAG, STYLE].concat([].slice.call(arguments)));
    },
    warn: function () {
      if (!CONFIG.DEBUG) return;
      console.warn.apply(console, [TAG, STYLE].concat([].slice.call(arguments)));
    },
    error: function () {
      console.error.apply(console, [TAG, STYLE].concat([].slice.call(arguments)));
    }
  };

  /* ============ UTIL ============ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function safeStorage(fn) { try { return fn(); } catch (e) { log.warn('localStorage tidak tersedia:', e.message); return null; } }

  /* ============ INFO HALAMAN (console) ============ */
  function logPageInfo() {
    if (!CONFIG.DEBUG) return;
    console.groupCollapsed(TAG + ' Halaman dimuat', STYLE);
    console.log('URL      :', location.href);
    console.log('Waktu    :', new Date().toString());
    console.log('Viewport :', window.innerWidth + 'x' + window.innerHeight,
      '(' + (window.innerWidth <= 768 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop') + ')');
    console.log('Deadline :', CONFIG.DEADLINE);
    console.log('Endpoint :', CONFIG.ENDPOINT || '(belum diatur — mode simulasi)');
    console.groupEnd();
  }

  /* ============ PRELOADER ============
   * Alur sama seperti index.html / script.js:
   *   halaman siap -> tambah kelas "preloader-hidden" -> entry-gate.js mencegat
   *   kelas itu dan menampilkan "Klik untuk masuk" + transisi awan.
   *
   * Tambahan agar tidak pernah macet di animasi pohon/matahari:
   *   1. Pemicu ganda: event "load" ATAU DOMContentLoaded + 2,5 dtk
   *      (jika ada resource yang menahan "load").
   *   2. Jaring pengaman: jika setelah SAFETY_MS tombol gate tidak muncul dan
   *      preloader masih tampil, preloader ditutup paksa.
   * Dipanggil langsung (bukan menunggu DOMContentLoaded) supaya listener
   * "load" pasti terpasang lebih dulu, sama seperti script.js.
   */
  function initPreloader() {
    var pre = $('#preloader');
    if (!pre) return;

    var start = Date.now();
    var triggered = false;
    var SAFETY_MS = 9000;

    function elapsed() { return (Date.now() - start) + ' ms'; }

    function trigger(reason) {
      if (triggered) return;
      triggered = true;
      log.info('Preloader selesai (' + reason + ', ' + elapsed() + '). Gate aktif: ' +
        !!(window.ITB_ENTRY && window.ITB_ENTRY.active));
      pre.classList.add('preloader-hidden');
    }

    // Pemicu 1: halaman selesai dimuat (sama seperti script.js)
    if (document.readyState === 'complete') {
      setTimeout(function () { trigger('load'); }, 500);
    } else {
      window.addEventListener('load', function () {
        setTimeout(function () { trigger('load'); }, 500);
      });
    }

    // Pemicu 2: cadangan bila "load" tertahan resource yang lambat
    function onDomReady() {
      setTimeout(function () {
        if (!triggered) {
          log.warn('Event "load" belum datang setelah 2,5 dtk — lanjut tanpa menunggu.');
          trigger('DOMContentLoaded');
        }
      }, 2500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onDomReady);
    else onDomReady();

    // Jaring pengaman: jangan biarkan pengunjung terkunci di preloader
    setTimeout(function () {
      var gateVisible = !!document.querySelector('.entry-gate');
      var stillThere = document.body.contains(pre) && pre.style.display !== 'none';
      var hiddenByCss = pre.classList.contains('preloader-hidden');
      if (stillThere && !gateVisible && !hiddenByCss) {
        log.warn('Gate tidak muncul setelah ' + SAFETY_MS + ' ms — preloader ditutup paksa.');
        pre.style.display = 'none';
        document.documentElement.classList.remove('entry-locked');
      } else if (stillThere && !gateVisible && hiddenByCss && pre.style.display !== 'none') {
        // Kelas sudah ditambahkan tapi gate tak pernah dibuat: pastikan preloader benar-benar hilang
        log.warn('Preloader sudah diberi kelas hidden tetapi gate tidak ada — ditutup paksa.');
        pre.style.display = 'none';
        document.documentElement.classList.remove('entry-locked');
      }
    }, SAFETY_MS);

    document.addEventListener('itb:entry-click', function () { log.info('Pengunjung menekan "Klik untuk masuk".'); });
    document.addEventListener('itb:entry-done', function () { log.info('Transisi masuk selesai (' + elapsed() + ').'); });
  }

  /* ============ NAVBAR MOBILE ============ */
  function initNav() {
    var btn = $('#hamburgerBtn');
    var nav = $('#mainNav');
    if (!btn || !nav) return;

    function setOpen(open) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Tutup menu navigasi' : 'Buka menu navigasi');
      nav.classList.toggle('is-open', open);
    }
    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });
    $all('.nav__link', nav).forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1024) setOpen(false);
    });
  }

  /* ============ COUNTDOWN ============ */
  var registrationClosed = false;

  function initCountdown(onClose) {
    var root = $('#pendaftaran-countdown');
    var title = $('#countdown-title');
    if (!root) return;

    var els = {
      d: $('[data-countdown-days]', root),
      h: $('[data-countdown-hours]', root),
      m: $('[data-countdown-minutes]', root),
      s: $('[data-countdown-seconds]', root)
    };
    var target = new Date(CONFIG.DEADLINE).getTime();
    if (isNaN(target)) {
      log.error('DEADLINE tidak valid:', CONFIG.DEADLINE);
      return;
    }

    var timer = null;
    var lastDayLogged = null;

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        els.d.textContent = els.h.textContent = els.m.textContent = els.s.textContent = '00';
        if (title) {
          title.textContent = 'Pendaftaran sudah ditutup';
          title.classList.add('is-closed');
        }
        if (!registrationClosed) {
          registrationClosed = true;
          log.warn('Pendaftaran DITUTUP (deadline terlewati).');
          onClose();
        }
        clearInterval(timer);
        return;
      }
      var days = Math.floor(diff / 86400000);
      var hours = Math.floor(diff / 3600000) % 24;
      var mins = Math.floor(diff / 60000) % 60;
      var secs = Math.floor(diff / 1000) % 60;
      els.d.textContent = pad(days);
      els.h.textContent = pad(hours);
      els.m.textContent = pad(mins);
      els.s.textContent = pad(secs);

      // Log sekali per hari agar console tidak penuh
      if (lastDayLogged !== days) {
        lastDayLogged = days;
        log.info('Sisa waktu pendaftaran: ' + days + ' hari ' + hours + ' jam ' + mins + ' menit');
      }
    }
    tick();
    timer = setInterval(tick, 1000);
  }

  /* ============ VALIDASI ============ */
  var validators = {
    nama: function (v) {
      v = v.trim();
      if (!v) return 'Nama lengkap wajib diisi.';
      if (v.length < 3) return 'Nama minimal 3 karakter.';
      if (!/^[A-Za-zÀ-ÿ'.\-\s]+$/.test(v)) return 'Nama hanya boleh berisi huruf, spasi, titik, dan tanda hubung.';
      return '';
    },
    nim: function (v) {
      v = v.trim().toUpperCase();
      if (!v) return 'NIM wajib diisi.';
      if (!/^[A-Z0-9]{8,15}$/.test(v)) return 'NIM harus 8–15 karakter huruf/angka tanpa spasi.';
      return '';
    },
    angkatan: function (v) {
      return v ? '' : 'Pilih angkatan kamu.';
    },
    email: function (v) {
      v = v.trim();
      if (!v) return 'Email wajib diisi.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Format email tidak valid.';
      return '';
    },
    whatsapp: function (v) {
      v = v.replace(/[\s\-()]/g, '');
      if (!v) return 'Nomor WhatsApp wajib diisi.';
      if (!/^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(v)) return 'Gunakan nomor Indonesia, contoh 08123456789.';
      return '';
    },
    alasan: function (v) {
      v = v.trim();
      if (!v) return 'Alasan bergabung wajib diisi.';
      if (v.length < CONFIG.ALASAN_MIN) return 'Minimal ' + CONFIG.ALASAN_MIN + ' karakter (sekarang ' + v.length + ').';
      return '';
    }
  };

  function normalizePhone(v) {
    v = v.replace(/[\s\-()]/g, '');
    if (v.indexOf('+62') === 0) return '62' + v.slice(3);
    if (v.charAt(0) === '0') return '62' + v.slice(1);
    return v;
  }

  function setFieldError(name, message) {
    var errEl = $('[data-error-for="' + name + '"]');
    if (!errEl) return;
    errEl.textContent = message || '';
    var field = errEl.closest('.field');
    if (field) {
      field.classList.toggle('has-error', !!message);
      field.classList.toggle('is-valid', !message && name !== 'minat' && name !== 'setuju');
    }
  }

  /* ============ FORM ============ */
  function initForm() {
    var form = $('#form-daftar');
    if (!form) { log.error('Form #form-daftar tidak ditemukan.'); return; }

    var statusEl = $('#form-status');
    var submitBtn = $('#btn-submit');
    var resetBtn = $('#btn-reset');
    var alasan = $('#alasan');
    var counter = $('#alasan-counter');
    var modal = $('#modal-sukses');
    var modalText = $('#modal-text');
    var modalClose = $('#modal-close');
    var isSubmitting = false;

    function showStatus(msg, type) {
      statusEl.textContent = msg || '';
      statusEl.className = 'form-status' + (type ? ' is-' + type : '');
    }

    function updateCounter() {
      counter.textContent = alasan.value.length + '/' + alasan.getAttribute('maxlength');
    }

    function getMinat() {
      return $all('input[name="minat"]:checked', form).map(function (c) { return c.value; });
    }

    function validateField(name) {
      var msg = '';
      if (validators[name]) {
        msg = validators[name](form.elements[name].value);
      } else if (name === 'minat') {
        msg = getMinat().length ? '' : 'Pilih minimal satu bidang.';
      } else if (name === 'setuju') {
        msg = form.elements.setuju.checked ? '' : 'Kamu harus menyetujui pernyataan ini.';
      }
      setFieldError(name, msg);
      return msg;
    }

    function validateAll() {
      var names = ['nama', 'nim', 'angkatan', 'email', 'whatsapp', 'minat', 'alasan', 'setuju'];
      var errors = {};
      names.forEach(function (n) {
        var m = validateField(n);
        if (m) errors[n] = m;
      });
      return errors;
    }

    function collectData() {
      return {
        nama: form.elements.nama.value.trim(),
        nim: form.elements.nim.value.trim().toUpperCase(),
        angkatan: form.elements.angkatan.value,
        email: form.elements.email.value.trim().toLowerCase(),
        whatsapp: normalizePhone(form.elements.whatsapp.value),
        minat: getMinat(),
        alasan: form.elements.alasan.value.trim(),
        setuju: form.elements.setuju.checked,
        waktu_daftar: new Date().toISOString(),
        sumber: location.pathname
      };
    }

    /* ---- Autosave draft ---- */
    var saveTimer = null;
    function saveDraft() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        var d = collectData();
        delete d.waktu_daftar; delete d.sumber;
        safeStorage(function () { localStorage.setItem(CONFIG.DRAFT_KEY, JSON.stringify(d)); });
        log.info('Draft disimpan otomatis.');
      }, 500);
    }
    function restoreDraft() {
      var raw = safeStorage(function () { return localStorage.getItem(CONFIG.DRAFT_KEY); });
      if (!raw) return;
      try {
        var d = JSON.parse(raw);
        ['nama', 'nim', 'angkatan', 'email', 'whatsapp', 'alasan'].forEach(function (k) {
          if (d[k] && form.elements[k]) form.elements[k].value = d[k];
        });
        (d.minat || []).forEach(function (val) {
          var c = $('input[name="minat"][value="' + val.replace(/"/g, '\\"') + '"]', form);
          if (c) c.checked = true;
        });
        updateCounter();
        log.info('Draft dipulihkan dari penyimpanan lokal.', d);
      } catch (e) {
        log.warn('Draft rusak, diabaikan:', e.message);
        safeStorage(function () { localStorage.removeItem(CONFIG.DRAFT_KEY); });
      }
    }

    /* ---- Event: validasi saat blur / input ---- */
    ['nama', 'nim', 'angkatan', 'email', 'whatsapp', 'alasan'].forEach(function (name) {
      var el = form.elements[name];
      el.addEventListener('blur', function () { validateField(name); });
      el.addEventListener('input', function () {
        if (el.closest('.field').classList.contains('has-error')) validateField(name);
        saveDraft();
      });
      el.addEventListener('change', function () { validateField(name); saveDraft(); });
    });
    $all('input[name="minat"]', form).forEach(function (c) {
      c.addEventListener('change', function () { validateField('minat'); saveDraft(); });
    });
    form.elements.setuju.addEventListener('change', function () { validateField('setuju'); });
    alasan.addEventListener('input', updateCounter);

    /* ---- Reset ---- */
    resetBtn.addEventListener('click', function () {
      setTimeout(function () {
        $all('.field', form).forEach(function (f) { f.classList.remove('has-error', 'is-valid'); });
        $all('.field__error', form).forEach(function (e) { e.textContent = ''; });
        showStatus('');
        updateCounter();
        safeStorage(function () { localStorage.removeItem(CONFIG.DRAFT_KEY); });
        log.info('Form direset & draft dihapus.');
      }, 0);
    });

    /* ---- Submit ---- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (isSubmitting) return;

      if (registrationClosed) {
        showStatus('Pendaftaran sudah ditutup.', 'error');
        log.warn('Submit ditolak: pendaftaran ditutup.');
        return;
      }

      // Honeypot: bot biasanya mengisi semua field
      if (form.elements.website.value) {
        log.warn('Honeypot terisi — submit diabaikan (dugaan bot).');
        return;
      }

      var errors = validateAll();
      var errKeys = Object.keys(errors);
      if (errKeys.length) {
        console.groupCollapsed(TAG + ' Validasi gagal (' + errKeys.length + ' field)', STYLE);
        console.table(errors);
        console.groupEnd();
        showStatus('Periksa kembali ' + errKeys.length + ' isian yang masih salah.', 'error');
        var first = $('[name="' + errKeys[0] + '"]', form) || $('#minat-group');
        if (first && first.focus) first.focus();
        return;
      }

      var prev = safeStorage(function () { return localStorage.getItem(CONFIG.SUBMITTED_KEY); });
      var data = collectData();
      if (prev && prev === data.nim) {
        log.warn('NIM ' + data.nim + ' sudah pernah mendaftar dari perangkat ini.');
        showStatus('NIM ini sudah terdaftar dari perangkat ini.', 'info');
        return;
      }

      isSubmitting = true;
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      showStatus('Mengirim data...', 'info');

      console.group(TAG + ' Data pendaftaran siap dikirim', STYLE);
      console.table(data);
      console.log('JSON:', JSON.stringify(data, null, 2));
      console.groupEnd();

      sendData(data).then(function (res) {
        log.info('Pendaftaran sukses.', res);
        safeStorage(function () {
          localStorage.setItem(CONFIG.SUBMITTED_KEY, data.nim);
          localStorage.removeItem(CONFIG.DRAFT_KEY);
        });
        form.reset();
        $all('.field', form).forEach(function (f) { f.classList.remove('has-error', 'is-valid'); });
        updateCounter();
        showStatus('');
        openModal(data, res.simulated);
      }).catch(function (err) {
        log.error('Gagal mengirim data:', err);
        showStatus('Gagal mengirim data. Cek koneksi internet lalu coba lagi.', 'error');
      }).then(function () {
        isSubmitting = false;
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = registrationClosed;
      });
    });

    function sendData(data) {
      if (!CONFIG.ENDPOINT) {
        log.warn('ENDPOINT belum diatur → mode simulasi (data TIDAK dikirim ke server).');
        return new Promise(function (resolve) {
          setTimeout(function () { resolve({ ok: true, simulated: true }); }, 800);
        });
      }
      log.info('POST →', CONFIG.ENDPOINT);
      return fetch(CONFIG.ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        log.info('Respons server:', r.status, r.statusText);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return { ok: true, simulated: false };
      });
    }

    /* ---- Modal ---- */
    function openModal(data, simulated) {
      var firstName = data.nama.split(/\s+/)[0];
      modalText.textContent = 'Terima kasih, ' + firstName + '! Pendaftaranmu sudah kami terima. ' +
        'Pantau WhatsApp (' + data.whatsapp + ') untuk info grup selanjutnya.' +
        (simulated ? ' (Mode simulasi: data belum dikirim ke server.)' : '');
      modal.hidden = false;
      modalClose.focus();
    }
    function closeModal() {
      modal.hidden = true;
      log.info('Modal ditutup. Mengalihkan ke ' + CONFIG.REDIRECT_URL + ' ...');
      window.location.href = CONFIG.REDIRECT_URL;
    }
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    /* ---- Tutup form saat deadline lewat ---- */
    function lockForm() {
      $all('input, select, textarea, button', form).forEach(function (el) { el.disabled = true; });
      showStatus('Pendaftaran sudah ditutup. Pantau Instagram @hmpptiums untuk info selanjutnya.', 'error');
    }

    updateCounter();
    restoreDraft();
    initCountdown(lockForm);
    log.info('Form siap. Field terdaftar:', Object.keys(validators).concat(['minat', 'setuju']));
  }

  /* ============ ERROR GLOBAL ============ */
  window.addEventListener('error', function (e) {
    log.error('Error tak tertangani:', e.message, '@', e.filename + ':' + e.lineno);
  });
  window.addEventListener('unhandledrejection', function (e) {
    log.error('Promise ditolak:', e.reason);
  });

  /* ============ INIT ============ */
  initPreloader(); // langsung, bukan menunggu DOMContentLoaded

  function init() {
    logPageInfo();
    initNav();
    initForm();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();