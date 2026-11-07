(function () {
  "use strict";

  var AMOUNT_MIN = 1000;
  var AMOUNT_MAX = 20000;
  var AMOUNT_STEP = 1000;
  var DEMO_SERIAL = "№ образца · VR-DEMO-0123";

  var sheetRoot = document.getElementById("gift-sheet-root");
  var sheet = document.getElementById("gift-sheet");
  var openBtn = document.getElementById("btn-gift-open");
  var closeBtn = document.getElementById("gift-sheet-close");
  var form = document.getElementById("gift-form");
  var successPanel = document.getElementById("gift-success");
  var amountInput = document.getElementById("gift-amount");
  var phoneInput = document.getElementById("gift-phone");
  var nameInput = document.getElementById("gift-recipient");
  var amountMinus = document.getElementById("amount-minus");
  var amountPlus = document.getElementById("amount-plus");
  var chipButtons = document.querySelectorAll("[data-amount-chip]");
  var previewAmount = document.getElementById("card-amount");
  var previewName = document.getElementById("card-recipient");
  var lastFocus = null;

  var focusableSelector =
    'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function formatRub(n) {
    return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
  }

  function parseAmount(raw) {
    var digits = String(raw).replace(/\s/g, "").replace(/[^\d]/g, "");
    if (!digits) return null;
    return parseInt(digits, 10);
  }

  function isValidAmount(n) {
    if (n === null || Number.isNaN(n)) return false;
    if (n < AMOUNT_MIN || n > AMOUNT_MAX) return false;
    return n % AMOUNT_STEP === 0;
  }

  function setAmount(n, options) {
    var opts = options || {};
    if (!isValidAmount(n)) {
      amountInput.classList.add("is-invalid");
      amountInput.setAttribute("aria-invalid", "true");
      if (opts.showMessage && amountErr) {
        amountErr.textContent =
          "Номинал от " +
          formatRub(AMOUNT_MIN) +
          " до " +
          formatRub(AMOUNT_MAX) +
          ", только кратно " +
          AMOUNT_STEP +
          " ₽";
      }
      return false;
    }
    amountInput.classList.remove("is-invalid");
    amountInput.removeAttribute("aria-invalid");
    if (amountErr) amountErr.textContent = "";
    amountInput.value = String(n);
    previewAmount.textContent = formatRub(n);
    chipButtons.forEach(function (btn) {
      var v = parseInt(btn.getAttribute("data-amount-chip"), 10);
      btn.setAttribute("aria-pressed", v === n ? "true" : "false");
    });
    return true;
  }

  var amountErr = document.getElementById("amount-error");

  function normalizePhone(value) {
    var d = value.replace(/\D/g, "");
    if (d.length === 11 && (d[0] === "7" || d[0] === "8")) d = d.slice(1);
    if (d.length === 10) return d;
    return "";
  }

  function formatPhoneDisplay(digits) {
    if (digits.length !== 10) return valueOrEmpty(phoneInput.value);
    return (
      "+7 (" +
      digits.slice(0, 3) +
      ") " +
      digits.slice(3, 6) +
      "-" +
      digits.slice(6, 8) +
      "-" +
      digits.slice(8, 10)
    );
  }

  function valueOrEmpty(v) {
    return v || "";
  }

  function validatePhone() {
    var digits = normalizePhone(phoneInput.value);
    var phoneErr = document.getElementById("phone-error");
    if (!digits) {
      phoneInput.classList.add("is-invalid");
      phoneInput.setAttribute("aria-invalid", "true");
      if (phoneErr) phoneErr.textContent = "Введите мобильный номер РФ: 10 цифр после +7";
      return false;
    }
    phoneInput.classList.remove("is-invalid");
    phoneInput.removeAttribute("aria-invalid");
    if (phoneErr) phoneErr.textContent = "";
    return true;
  }

  function updateRecipientPreview() {
    var name = nameInput.value.trim();
    previewName.textContent = name ? "Для: " + name : "Имя получателя — по желанию";
  }

  function getFocusable(container) {
    return Array.prototype.slice.call(container.querySelectorAll(focusableSelector)).filter(
      function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      }
    );
  }

  function trapFocus(e) {
    if (!sheetRoot || !sheetRoot.classList.contains("is-open")) return;
    if (e.key !== "Tab") return;
    var nodes = getFocusable(sheet);
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openSheet() {
    if (!sheetRoot) return;
    lastFocus = document.activeElement;
    sheetRoot.classList.add("is-open");
    sheetRoot.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    successPanel.classList.remove("is-visible");
    form.hidden = false;
    var first = closeBtn || getFocusable(sheet)[0];
    if (first) first.focus();
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("keydown", trapFocus);
  }

  function closeSheet() {
    if (!sheetRoot) return;
    sheetRoot.classList.remove("is-open");
    sheetRoot.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
    document.removeEventListener("keydown", trapFocus);
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSheet();
    }
  }

  function placeStars() {
    var host = document.querySelector(".stars");
    if (!host || prefersReducedMotion()) return;
    var count = window.innerWidth < 700 ? 18 : 28;
    for (var i = 0; i < count; i++) {
      var s = document.createElement("span");
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 55 + "%";
      s.style.animationDelay = Math.random() * 3 + "s";
      host.appendChild(s);
    }
  }

  if (amountMinus) {
    amountMinus.addEventListener("click", function () {
      var n = parseAmount(amountInput.value) || AMOUNT_MIN;
      setAmount(Math.max(AMOUNT_MIN, n - AMOUNT_STEP), { showMessage: true });
    });
  }
  if (amountPlus) {
    amountPlus.addEventListener("click", function () {
      var n = parseAmount(amountInput.value) || AMOUNT_MIN;
      setAmount(Math.min(AMOUNT_MAX, n + AMOUNT_STEP), { showMessage: true });
    });
  }

  amountInput.addEventListener("input", function () {
    var n = parseAmount(amountInput.value);
    if (n === null) {
      amountInput.classList.add("is-invalid");
      if (amountErr) amountErr.textContent = "Укажите сумму цифрами";
      return;
    }
    setAmount(n, { showMessage: true });
  });

  amountInput.addEventListener("blur", function () {
    var n = parseAmount(amountInput.value);
    if (isValidAmount(n)) amountInput.value = String(n);
  });

  chipButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var n = parseInt(btn.getAttribute("data-amount-chip"), 10);
      setAmount(n, { showMessage: true });
    });
  });

  phoneInput.addEventListener("blur", function () {
    var digits = normalizePhone(phoneInput.value);
    if (digits) phoneInput.value = formatPhoneDisplay(digits);
    validatePhone();
  });

  nameInput.addEventListener("input", updateRecipientPreview);

  if (openBtn) openBtn.addEventListener("click", openSheet);
  if (closeBtn) closeBtn.addEventListener("click", closeSheet);
  if (sheetRoot) {
    sheetRoot.addEventListener("click", function (e) {
      if (e.target === sheetRoot) closeSheet();
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var submitBtn = document.getElementById("gift-submit");
      if (submitBtn && submitBtn.disabled) return;

      var amountOk = setAmount(parseAmount(amountInput.value), { showMessage: true });
      var phoneOk = validatePhone();
      if (!amountOk || !phoneOk) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        window.setTimeout(function () {
          submitBtn.disabled = false;
        }, 1200);
      }

      form.hidden = true;
      successPanel.classList.add("is-visible");
      var h = successPanel.querySelector("h3");
      if (h) h.focus();
    });
  }

  setAmount(3000, { showMessage: false });
  updateRecipientPreview();
  placeStars();

  var serialEl = document.getElementById("card-serial");
  if (serialEl) serialEl.textContent = DEMO_SERIAL;
})();
