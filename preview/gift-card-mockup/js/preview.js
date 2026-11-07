(function () {
  "use strict";

  var AMOUNT_MIN = 1000;
  var AMOUNT_MAX = 20000;
  var AMOUNT_STEP = 1000;
  var rm = window.matchMedia("(prefers-reduced-motion: reduce)");

  function initBookingSheet() {
    var bs = document.getElementById("bs");
    if (!bs) return;
    var box = bs.querySelector(".bs__box");
    var ctx = bs.querySelector(".bs__ctx");
    var prev = null;
    var open = false;
    var t = null;

    var focusables = function () {
      return Array.prototype.slice
        .call(bs.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'))
        .filter(function (x) {
          return x.offsetParent !== null;
        });
    };

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab") {
        var f = focusables();
        if (!f.length) return;
        var first = f[0];
        var last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function show(label) {
      clearTimeout(t);
      prev = document.activeElement;
      ctx.hidden = !label;
      if (label) ctx.textContent = "Вы выбрали: " + label;
      bs.hidden = false;
      box.style.transform = "";
      document.body.classList.add("lock");
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          bs.classList.add("is-open");
        });
      });
      open = true;
      document.addEventListener("keydown", onKey);
      var call = bs.querySelector(".bs__call");
      if (call) setTimeout(function () { call.focus({ preventScroll: true }); }, rm.matches ? 0 : 60);
    }

    function close() {
      if (!open) return;
      open = false;
      bs.classList.remove("is-open");
      document.removeEventListener("keydown", onKey);
      box.style.transform = "";
      var fin = function () {
        bs.hidden = true;
        document.body.classList.remove("lock");
        if (prev && prev.focus) prev.focus({ preventScroll: true });
      };
      rm.matches ? fin() : (t = setTimeout(fin, 320));
    }

    document.addEventListener("click", function (e) {
      var el = e.target.closest("[data-book]");
      if (!el || e.metaKey || e.ctrlKey) return;
      if (el.id === "btn-gift-open") return;
      e.preventDefault();
      show(el.getAttribute("data-book-label") || el.getAttribute("data-book") || "");
    });

    bs.querySelectorAll("[data-bs-close]").forEach(function (x) {
      x.addEventListener("click", close);
    });

    bs.querySelectorAll(".bs__call, .bs__opt").forEach(function (a) {
      a.addEventListener("click", function () {
        setTimeout(close, 400);
      });
    });

    var y0 = null;
    var dy = 0;
    box.addEventListener(
      "touchstart",
      function (e) {
        if (box.scrollTop > 0) return;
        y0 = e.touches[0].clientY;
        dy = 0;
        box.style.transition = "none";
      },
      { passive: true }
    );
    box.addEventListener(
      "touchmove",
      function (e) {
        if (y0 === null) return;
        dy = Math.max(0, e.touches[0].clientY - y0);
        box.style.transform = dy ? "translateY(" + dy + "px)" : "";
      },
      { passive: true }
    );
    box.addEventListener("touchend", function () {
      if (y0 === null) return;
      box.style.transition = "";
      var h = box.offsetHeight;
      y0 = null;
      if (dy > Math.min(120, h * 0.25)) close();
      else box.style.transform = "";
      dy = 0;
    });
  }

  function initGiftSheet() {
    var bs = document.getElementById("gift-bs");
    var openBtn = document.getElementById("btn-gift-open");
    if (!bs || !openBtn) return;
    var box = bs.querySelector(".bs__box");
    var prev = null;
    var open = false;
    var t = null;

    var amountInput = document.getElementById("gift-amount");
    var phoneInput = document.getElementById("gift-phone");
    var nameInput = document.getElementById("gift-recipient-input");
    var previewAmount = document.getElementById("card-amount");
    var previewName = document.getElementById("card-recipient");
    var form = document.getElementById("gift-form");
    var success = document.getElementById("gift-success");
    var amountErr = document.getElementById("amount-error");
    var phoneErr = document.getElementById("phone-error");

    function focusables() {
      return Array.prototype.slice
        .call(bs.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'))
        .filter(function (x) {
          return x.offsetParent !== null;
        });
    }

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab") {
        var f = focusables();
        if (!f.length) return;
        var first = f[0];
        var last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function openSheet(instant) {
      clearTimeout(t);
      prev = document.activeElement;
      bs.hidden = false;
      document.body.classList.add("lock");
      if (instant) {
        bs.classList.add("is-open");
      } else {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            bs.classList.add("is-open");
          });
        });
      }
      open = true;
      success.classList.remove("is-visible");
      form.hidden = false;
      document.addEventListener("keydown", onKey);
      var closeBtn = bs.querySelector(".bs__x");
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (!open) return;
      open = false;
      bs.classList.remove("is-open");
      document.removeEventListener("keydown", onKey);
      var fin = function () {
        bs.hidden = true;
        document.body.classList.remove("lock");
        if (prev && prev.focus) prev.focus({ preventScroll: true });
      };
      rm.matches ? fin() : (t = setTimeout(fin, 320));
    }

    openBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openSheet();
    });
    bs.querySelectorAll("[data-gift-close]").forEach(function (n) {
      n.addEventListener("click", close);
    });

    function parseAmount(raw) {
      var digits = String(raw).replace(/\s/g, "").replace(/[^\d]/g, "");
      if (!digits) return null;
      return parseInt(digits, 10);
    }

    function isValidAmount(n) {
      return n !== null && !Number.isNaN(n) && n >= AMOUNT_MIN && n <= AMOUNT_MAX && n % AMOUNT_STEP === 0;
    }

    function formatRub(n) {
      return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
    }

    function setAmount(n, showMsg) {
      if (!isValidAmount(n)) {
        amountInput.classList.add("is-invalid");
        if (showMsg && amountErr) {
          amountErr.textContent =
            "От " + formatRub(AMOUNT_MIN) + " до " + formatRub(AMOUNT_MAX) + ", шаг " + AMOUNT_STEP + " ₽";
        }
        return false;
      }
      amountInput.classList.remove("is-invalid");
      if (amountErr) amountErr.textContent = "";
      amountInput.value = String(n);
      previewAmount.textContent = formatRub(n);
      document.querySelectorAll("[data-amount-chip]").forEach(function (btn) {
        var v = parseInt(btn.getAttribute("data-amount-chip"), 10);
        btn.setAttribute("aria-pressed", v === n ? "true" : "false");
      });
      return true;
    }

    function normalizePhone(value) {
      var d = value.replace(/\D/g, "");
      if (d.length === 11 && (d[0] === "7" || d[0] === "8")) d = d.slice(1);
      return d.length === 10 ? d : "";
    }

    function validatePhone() {
      var ok = !!normalizePhone(phoneInput.value);
      phoneInput.classList.toggle("is-invalid", !ok);
      if (phoneErr) phoneErr.textContent = ok ? "" : "Введите мобильный номер РФ";
      return ok;
    }

    function updateName() {
      var name = nameInput.value.trim();
      previewName.textContent = name ? "Для: " + name : "Кому дарите — по желанию";
    }

    document.getElementById("amount-minus").addEventListener("click", function () {
      var n = parseAmount(amountInput.value) || AMOUNT_MIN;
      setAmount(Math.max(AMOUNT_MIN, n - AMOUNT_STEP), true);
    });
    document.getElementById("amount-plus").addEventListener("click", function () {
      var n = parseAmount(amountInput.value) || AMOUNT_MIN;
      setAmount(Math.min(AMOUNT_MAX, n + AMOUNT_STEP), true);
    });
    amountInput.addEventListener("input", function () {
      setAmount(parseAmount(amountInput.value), true);
    });
    document.querySelectorAll("[data-amount-chip]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setAmount(parseInt(btn.getAttribute("data-amount-chip"), 10), true);
      });
    });
    phoneInput.addEventListener("blur", validatePhone);
    nameInput.addEventListener("input", updateName);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = document.getElementById("gift-submit");
      if (btn.disabled) return;
      if (!setAmount(parseAmount(amountInput.value), true) || !validatePhone()) return;
      btn.disabled = true;
      setTimeout(function () {
        btn.disabled = false;
      }, 1000);
      form.hidden = true;
      success.classList.add("is-visible");
      success.focus();
    });

    setAmount(3000, false);
    updateName();
    return openSheet;
  }

  function initCallbarObserver() {
    var cta = document.querySelector(".hero .cta");
    if (!cta || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      document.documentElement.classList.toggle("hero-cta-vis", entries[0].isIntersecting);
    }, { threshold: 0.25 }).observe(cta);
  }

  document.documentElement.classList.add("js");
  initBookingSheet();
  var openGiftSheet = initGiftSheet();
  initCallbarObserver();

  if (location.search.indexOf("autogift=1") !== -1 && openGiftSheet) {
    openGiftSheet(true);
  }
})();
