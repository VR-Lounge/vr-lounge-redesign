/* Gift card sheet + Premium v2 card (.vrl-gift).
 * Issuance: Firebase giftCards when rules allow; otherwise honest error.
 * Force demo UI with ?giftDemo=1 (no write). Empty-card preview name stays demo-only.
 */
(function () {
  "use strict";

  var AMOUNT_MIN = 1000;
  var AMOUNT_MAX = 20000;
  var AMOUNT_STEP = 1000;
  var DEMO_NUMBER = "VRL 007";
  /* Empty-card demo only — never treated as submitted recipient data. */
  var DEMO_RECIPIENT = "ДАВИД МИКЕЛАНДЖЕЛОВИЧ БУОНОРОТТИ";
  var PUBLIC_CARD_BASE = "https://vr-lounge.github.io/vr-lounge-redesign/gift.html";
  var FORCE_DEMO =
    /(?:\?|&)giftDemo=1(?:&|$)/.test(location.search) ||
    window.VRL_GIFT_DEMO === true;
  var rm = window.matchMedia("(prefers-reduced-motion: reduce)");

  function fmtAmount(n) {
    return new Intl.NumberFormat("ru-RU").format(n);
  }

  function nameParts(raw) {
    var words = String(raw || "")
      .trim()
      .toUpperCase()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) {
      words = DEMO_RECIPIENT.split(/\s+/);
      return {
        given: words.slice(0, -1).join(" "),
        family: words[words.length - 1],
        placeholder: false,
      };
    }
    if (words.length === 1) return { given: "", family: words[0], placeholder: false };
    return { given: words.slice(0, -1).join(" "), family: words[words.length - 1], placeholder: false };
  }

  function renderName(nameEl, raw) {
    if (!nameEl) return;
    var parts = nameParts(raw);
    nameEl.replaceChildren();
    nameEl.classList.toggle("is-placeholder", parts.placeholder);
    if (parts.given) {
      var given = document.createElement("span");
      given.className = "given";
      given.textContent = parts.given;
      nameEl.appendChild(given);
    }
    if (parts.family) {
      var family = document.createElement("span");
      family.className = "family";
      family.textContent = parts.family;
      nameEl.appendChild(family);
    }
    fitNames(nameEl);
  }

  function fitNames(nameEl) {
    if (!nameEl) return;
    var root = nameEl.closest(".vrl-gift");
    if (!root) return;
    var scene = root.querySelector(".vrl-gift__scene") || root;
    var w = nameEl.clientWidth || scene.clientWidth * 0.42;
    [
      [".given", 0.0295],
      [".family", 0.0415],
    ].forEach(function (pair) {
      var el = nameEl.querySelector(pair[0]);
      if (!el) return;
      var size = scene.clientWidth * pair[1];
      el.style.fontSize = size + "px";
      while (el.scrollWidth > w && size > 6) {
        size -= 0.25;
        el.style.fontSize = size + "px";
      }
    });
  }

  function setCardAmount(root, n) {
    root.querySelectorAll("[data-vrl-amount]").forEach(function (el) {
      el.textContent = fmtAmount(n);
    });
  }

  function setCardName(root, raw) {
    root.querySelectorAll("[data-vrl-name]").forEach(function (el) {
      renderName(el, raw);
    });
  }

  function setCardNumber(root, value) {
    var text = value || DEMO_NUMBER;
    root.querySelectorAll("[data-vrl-number]").forEach(function (el) {
      el.textContent = text;
    });
    root.querySelectorAll("[data-vrl-number-back]").forEach(function (el) {
      el.textContent = text;
    });
  }

  function syncAllCards(amount, name) {
    document.querySelectorAll("[data-vrl-gift]").forEach(function (root) {
      if (amount != null) setCardAmount(root, amount);
      if (name != null) setCardName(root, name);
      setCardNumber(root, DEMO_NUMBER);
    });
  }

  function initVrlGiftCard(root, options) {
    if (!root) return null;
    options = options || {};
    var scene = root.querySelector(".vrl-gift__scene");
    var tilt = root.querySelector(".vrl-gift__tilt");
    var card = root.querySelector(".vrl-gift__card");
    var front = root.querySelector(".vrl-gift__front");
    var back = root.querySelector(".vrl-gift__back");
    var backLink = back ? back.querySelector("a") : null;
    var flipped = false;
    var tiltEnabled = options.tilt !== false;
    var listeners = [];
    var settleTimer = null;
    var flipRaf = 0;
    var flipStartedAt = 0;
    /* Match --vrl-flip-ms (~900ms) + small cushion if transitionend is missed. */
    var FLIP_SETTLE_MS = 950;
    var FLIP_MIN_MS = 700;

    function on(el, type, fn, opts) {
      if (!el) return;
      el.addEventListener(type, fn, opts);
      listeners.push([el, type, fn, opts]);
    }

    function clearSettleTimer() {
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
    }

    function cancelFlipRaf() {
      if (flipRaf) {
        cancelAnimationFrame(flipRaf);
        flipRaf = 0;
      }
    }

    function markFaceSettled(fromEvent) {
      if (fromEvent && root.classList.contains("is-flipping")) {
        /* Ignore spurious early transitionend while the turn is still in progress. */
        if (flipStartedAt && performance.now() - flipStartedAt < FLIP_MIN_MS) {
          return;
        }
      }
      root.classList.remove("is-flipping");
      root.classList.add("is-face-settled");
    }

    function syncFaceA11y() {
      if (front) front.setAttribute("aria-hidden", flipped ? "true" : "false");
      if (back) back.setAttribute("aria-hidden", flipped ? "false" : "true");
      if (backLink) backLink.tabIndex = flipped ? 0 : -1;
      if (card) card.setAttribute("aria-pressed", flipped ? "true" : "false");
    }

    function applyFlipClass() {
      root.classList.toggle("is-flipped", flipped);
    }

    /**
     * Critical for iPhone/Android: never toggle is-flipped while is-face-settled is still
     * on — that briefly matches .is-face-settled.is-flipped and display:none's the outgoing
     * face in the same frame as the transform change, so WebKit skips the rotateY transition
     * and the card appears to swap instantly. Sequence:
     *   1) enter is-flipping, drop settle (both faces back in the 3D tree)
     *   2) force a layout/paint of the CURRENT transform
     *   3) then toggle is-flipped so the CSS transition can interpolate
     *   4) hide inactive face only on transitionend / timeout
     */
    function setFlipped(next, opts) {
      opts = opts || {};
      var instant = !!opts.instant || rm.matches;
      var wasFlipped = flipped;
      flipped = !!next;
      syncFaceA11y();
      clearSettleTimer();
      cancelFlipRaf();

      if (instant) {
        root.classList.remove("is-flipping");
        applyFlipClass();
        markFaceSettled();
        return;
      }

      if (wasFlipped === flipped && root.classList.contains("is-face-settled")) {
        return;
      }

      root.classList.add("is-flipping");
      root.classList.remove("is-face-settled");

      /* Double RAF for iOS Safari: first RAF commits the remove of is-face-settled,
         second RAF ensures both faces are painted before we apply the rotateY flip. */
      flipRaf = requestAnimationFrame(function () {
        if (card) {
          void card.offsetWidth;
        }
        /* Second RAF: now safe to toggle the flip transform */
        flipRaf = requestAnimationFrame(function () {
          flipRaf = 0;
          flipStartedAt = performance.now();
          applyFlipClass();
          /* Force layout after transform change */
          if (card) {
            void card.offsetHeight;
          }
          settleTimer = setTimeout(function () {
            markFaceSettled(false);
          }, FLIP_SETTLE_MS);
        });
      });
    }

    function flip() {
      setFlipped(!flipped);
    }

    function resetTilt() {
      if (!tilt) return;
      tilt.style.setProperty("--rx", "0deg");
      tilt.style.setProperty("--ry", "0deg");
    }

    function onPointerMove(e) {
      if (!tiltEnabled || rm.matches || e.pointerType === "touch" || !scene || !tilt) return;
      var r = scene.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tilt.style.setProperty("--ry", ((e.clientX - r.left) / r.width - 0.5) * 13 + "deg");
      tilt.style.setProperty("--rx", -((e.clientY - r.top) / r.height - 0.5) * 11 + "deg");
    }

    function onCardClick(e) {
      if (e.target.closest("a")) return;
      flip();
    }

    function onCardKey(e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target && e.target.closest && e.target.closest("a")) return;
      e.preventDefault();
      flip();
    }

    on(card, "click", onCardClick);
    on(card, "keydown", onCardKey);
    on(scene, "pointermove", onPointerMove);
    on(scene, "pointerleave", resetTilt);
    function onFlipTransitionEnd(e) {
      if (!e || e.target !== card) return;
      if (e.propertyName && e.propertyName.indexOf("transform") === -1) return;
      if (!root.classList.contains("is-flipping")) return;
      if (flipStartedAt && performance.now() - flipStartedAt < FLIP_MIN_MS) return;
      clearSettleTimer();
      markFaceSettled(true);
    }
    on(card, "transitionend", onFlipTransitionEnd);
    on(card, "webkitTransitionEnd", onFlipTransitionEnd);

    var resizeObserver = null;
    var nameEl = root.querySelector("[data-vrl-name]");
    if (typeof ResizeObserver !== "undefined" && scene) {
      resizeObserver = new ResizeObserver(function () {
        fitNames(nameEl);
      });
      resizeObserver.observe(scene);
    }

    setFlipped(false, { instant: true });
    setCardNumber(root, DEMO_NUMBER);
    fitNames(nameEl);

    return {
      flip: flip,
      setFlipped: setFlipped,
      destroy: function () {
        clearSettleTimer();
        cancelFlipRaf();
        listeners.forEach(function (item) {
          item[0].removeEventListener(item[1], item[2], item[3]);
        });
        listeners = [];
        if (resizeObserver) resizeObserver.disconnect();
        resetTilt();
      },
    };
  }

  function initGiftSheet() {
    var bs = document.getElementById("gift-bs");
    var openBtn = document.getElementById("btn-gift-open");
    if (!bs || !openBtn) return null;
    var box = bs.querySelector(".bs__box");
    var prev = null;
    var open = false;
    var t = null;
    var submitState = "demo";

    var amountInput = document.getElementById("gift-amount");
    var phoneInput = document.getElementById("gift-phone");
    var nameInput = document.getElementById("gift-recipient-input");
    var form = document.getElementById("gift-form");
    var success = document.getElementById("gift-success");
    var successTitle = document.getElementById("gift-success-title");
    var successBody = document.getElementById("gift-success-body");
    var statusEl = document.getElementById("gift-form-status");
    var amountErr = document.getElementById("amount-error");
    var phoneErr = document.getElementById("phone-error");
    var sheetCard = document.getElementById("gift-sheet-card");
    var sheetCtrl = initVrlGiftCard(sheetCard, { tilt: true });

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

    function setFormState(state, detail) {
      submitState = state;
      if (statusEl) {
        if (state === "submitting") {
          statusEl.textContent = FORCE_DEMO
            ? "Демо: имитация отправки…"
            : "Создаём карту…";
        } else if (state === "error") {
          statusEl.textContent = detail || "Не удалось оформить карту. Повторите.";
        } else {
          statusEl.textContent = "";
        }
      }
      if (!success) return;
      if (state === "success") {
        success.hidden = false;
        success.classList.add("is-visible");
        success.setAttribute("data-gift-state", "success");
        if (detail && detail.publicCode) {
          if (successTitle) successTitle.textContent = "Карта создана · " + detail.publicCode;
          if (successBody) {
            successBody.replaceChildren();
            successBody.appendChild(
              document.createTextNode(
                detail.pending
                  ? "Заявка сохранена (статус «ожидает»). Ссылка на карту: "
                  : "Публичная страница карты: "
              )
            );
            var link = document.createElement("a");
            link.href = detail.url;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = detail.url;
            successBody.appendChild(link);
            successBody.appendChild(document.createElement("br"));
            var pdfHint = document.createElement("p");
            pdfHint.style.marginTop = "8px";
            pdfHint.textContent =
              "Откройте ссылку и нажмите «Скачать / печать PDF», чтобы сохранить визуал карты.";
            successBody.appendChild(pdfHint);
            if (detail.localOnly) {
              var warn = document.createElement("p");
              warn.style.marginTop = "8px";
              warn.style.color = "#f0c4e0";
              warn.textContent =
                "Запись пока только локально в этом браузере (Firestore rules ещё не задеплоены). Для боевой выдачи нужен деплой правил.";
              successBody.appendChild(warn);
            }
          }
        } else if (FORCE_DEMO) {
          if (successTitle) successTitle.textContent = "Демо: заявка никуда не отправлена";
          if (successBody) {
            successBody.replaceChildren();
            successBody.appendChild(
              document.createTextNode(
                "Режим giftDemo. Для покупки подарочной карты позвоните "
              )
            );
            var a = document.createElement("a");
            a.href = "tel:+79302244551";
            a.textContent = "+7 930 224-45-51";
            successBody.appendChild(a);
            successBody.appendChild(document.createTextNode("."));
          }
        }
      } else {
        success.hidden = true;
        success.classList.remove("is-visible");
        success.setAttribute("data-gift-state", state);
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
      form.hidden = false;
      setFormState("demo");
      document.addEventListener("keydown", onKey);
      var closeBtn = bs.querySelector(".bs__x");
      if (closeBtn) closeBtn.focus();
      window.setTimeout(function () {
        if (sheetCtrl) fitNames(sheetCard.querySelector("[data-vrl-name]"));
      }, 40);
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
      return fmtAmount(n) + " ₽";
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
      syncAllCards(n, nameInput.value);
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
      syncAllCards(parseAmount(amountInput.value) || 3000, nameInput.value);
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
      if (btn.disabled || submitState === "submitting") return;
      if (!setAmount(parseAmount(amountInput.value), true) || !validatePhone()) {
        setFormState("error", "Проверьте номинал и телефон.");
        return;
      }
      var recipient = (nameInput.value || "").trim();
      if (!recipient || recipient.split(/\s+/).length < 2) {
        setFormState("error", "Укажите Имя Отчество Фамилия получателя.");
        return;
      }
      btn.disabled = true;
      setFormState("submitting");

      if (FORCE_DEMO) {
        window.setTimeout(function () {
          try {
            form.hidden = true;
            setFormState("success");
            success.focus();
          } catch (err) {
            setFormState("error", "Демо-ошибка интерфейса. Заявка всё равно никуда не ушла.");
            form.hidden = false;
          }
          btn.disabled = false;
        }, 450);
        return;
      }

      issueGiftCard({
        faceValue: parseAmount(amountInput.value),
        buyerPhone: phoneInput.value,
        recipientName: recipient,
      })
        .then(function (card) {
          var url = PUBLIC_CARD_BASE + "?code=" + encodeURIComponent(card.publicCode);
          form.hidden = true;
          setFormState("success", {
            publicCode: card.publicCode,
            url: url,
            pending: card.status === "pending",
            localOnly: !!card._local,
          });
          if (success) success.focus();
        })
        .catch(function (err) {
          console.error(err);
          setFormState(
            "error",
            (err && err.message) ||
              "Не удалось записать карту. Проверьте соединение или позвоните +7 930 224-45-51."
          );
          form.hidden = false;
        })
        .then(function () {
          btn.disabled = false;
        });
    });

    var y0 = null;
    var dy = 0;
    var scroll = bs.querySelector(".bs__gift-scroll");
    box.addEventListener(
      "touchstart",
      function (e) {
        if (scroll && scroll.scrollTop > 0) return;
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

    setAmount(3000, false);
    nameInput.value = "";
    updateName();
    return openSheet;
  }

  function initGiftFieldScroll() {
    var scroll = document.querySelector(".bs--gift .bs__gift-scroll");
    if (!scroll) return;
    scroll.querySelectorAll("input, textarea, select").forEach(function (el) {
      el.addEventListener("focus", function () {
        window.setTimeout(function () {
          try {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          } catch (e) {
            el.scrollIntoView(true);
          }
        }, 280);
      });
    });
  }

  function issueGiftCard(payload) {
    return import("./gift-cards.js").then(function (mod) {
      return import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js").then(function (appMod) {
        return import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js").then(function (fsMod) {
          var firebaseConfig = {
            apiKey: "AIzaSyBaq_faWwfE_TXn4Xh_2U3GYSAsUzGJ1bk",
            authDomain: "vr-lounge33.firebaseapp.com",
            projectId: "vr-lounge33",
            storageBucket: "vr-lounge33.appspot.com",
            messagingSenderId: "825655988090",
            appId: "1:825655988090:web:76d8e0554b8601f8bd10c3",
          };
          var app;
          try {
            app = appMod.getApp();
          } catch (e) {
            app = appMod.initializeApp(firebaseConfig);
          }
          var db = fsMod.getFirestore(app);
          return mod
            .createGiftCard(db, {
              faceValue: payload.faceValue,
              buyerPhone: payload.buyerPhone,
              recipientName: payload.recipientName,
              theme: "amethyst",
              createdBy: "site",
              status: "pending",
              useLocal: false,
            })
            .catch(function (err) {
              console.warn("[gift] Firestore create failed, local fallback:", err);
              return mod.createGiftCard(null, {
                faceValue: payload.faceValue,
                buyerPhone: payload.buyerPhone,
                recipientName: payload.recipientName,
                theme: "amethyst",
                createdBy: "site",
                status: "pending",
                useLocal: true,
              });
            });
        });
      });
    });
  }

  var openGiftSheet = initGiftSheet();
  initGiftFieldScroll();

  if (location.search.indexOf("autogift=1") !== -1 && openGiftSheet) {
    openGiftSheet(true);
  }
})();
