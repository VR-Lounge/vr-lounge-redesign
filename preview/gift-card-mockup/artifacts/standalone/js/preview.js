(function () {
  "use strict";

  var AMOUNT_MIN = 1000;
  var AMOUNT_MAX = 20000;
  var AMOUNT_STEP = 1000;
  var DEMO_NUMBER = "VRL 007";
  /* Empty-card demo only — never treated as submitted recipient data. */
  var DEMO_RECIPIENT = "ДАВИД МИКЕЛАНДЖЕЛОВИЧ БУОНОРОТТИ";
  var rm = window.matchMedia("(prefers-reduced-motion: reduce)");
  var giftControllers = [];

  function fmtAmount(n) {
    return new Intl.NumberFormat("ru-RU").format(n);
  }

  function toast(message) {
    var el = document.getElementById("vrl-gift-toast");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(function () {
      el.hidden = true;
    }, 4000);
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
    [[".given", 0.0295], [".family", 0.0415]].forEach(function (pair) {
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

  function destroyGiftController(ctrl) {
    if (!ctrl || !ctrl.destroy) return;
    ctrl.destroy();
    giftControllers = giftControllers.filter(function (c) {
      return c !== ctrl;
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

      if (card) {
        void card.offsetWidth;
      }

      flipRaf = requestAnimationFrame(function () {
        flipRaf = 0;
        flipStartedAt = performance.now();
        applyFlipClass();
        settleTimer = setTimeout(function () {
          markFaceSettled(false);
        }, FLIP_SETTLE_MS);
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

    var api = {
      root: root,
      flip: flip,
      setFlipped: setFlipped,
      resetTilt: resetTilt,
      setTiltEnabled: function (on) {
        tiltEnabled = !!on;
        resetTilt();
      },
      setPaused: function (paused) {
        root.classList.toggle("is-paused", !!paused);
      },
      setTheme: function (theme) {
        root.classList.remove("vrl-gift--amethyst", "vrl-gift--silver");
        if (theme === "amethyst") root.classList.add("vrl-gift--amethyst");
        else if (theme === "silver") root.classList.add("vrl-gift--silver");
        root.setAttribute("data-theme", theme || "obsidian");
      },
      setAmount: function (n) {
        setCardAmount(root, n);
      },
      setName: function (raw) {
        setCardName(root, raw);
      },
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

    giftControllers.push(api);
    return api;
  }

  function downloadBlob(blob, name) {
    var a = document.createElement("a");
    var url = URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 2000);
  }

  async function renderGiftCanvas(root, backSide) {
    var img = root.querySelector(".vrl-gift__portrait");
    var amountEl = root.querySelector("[data-vrl-amount]");
    var nameEl = root.querySelector("[data-vrl-name]");
    var numberEl = root.querySelector("[data-vrl-number]");
    var theme = root.getAttribute("data-theme") || "obsidian";
    var amountText = amountEl ? amountEl.textContent.trim() : "3 000";
    var numberText = numberEl ? numberEl.textContent.trim() : DEMO_NUMBER;
    var demoParts = nameParts("");
    var given = demoParts.given;
    var family = demoParts.family;
    if (nameEl) {
      var g = nameEl.querySelector(".given");
      var f = nameEl.querySelector(".family");
      given = g ? g.textContent : demoParts.given;
      family = f ? f.textContent : demoParts.family;
    }

    var image = new Image();
    image.src = img ? img.currentSrc || img.src : "";
    await document.fonts.ready;
    if (image.src) {
      try {
        await image.decode();
      } catch (e) {
        /* continue without portrait */
      }
    }

    var c = document.createElement("canvas");
    c.width = 1712;
    c.height = 1080;
    var x = c.getContext("2d");
    x.scale(2, 2);

    function txt(t, px, py, size, col, weight, max, align) {
      weight = weight || 400;
      col = col || "#eee5f4";
      align = align || "left";
      x.font = weight + " " + size + 'px "Inter Cyr",Arial,sans-serif';
      while (max && x.measureText(t).width > max && size > 6) {
        size -= 0.25;
        x.font = weight + " " + size + 'px "Inter Cyr",Arial,sans-serif';
      }
      x.fillStyle = col;
      x.textBaseline = "top";
      x.textAlign = align;
      x.fillText(t, px, py);
    }

    function lines(arr, px, py, size, line, col) {
      arr.forEach(function (t, i) {
        txt(t, px, py + i * line, size, col || "#dfd7e8");
      });
    }

    x.beginPath();
    if (x.roundRect) x.roundRect(1, 1, 854, 538, 28);
    else x.rect(1, 1, 854, 538);
    x.clip();

    var colors =
      theme === "silver"
        ? ["#0b0f14", "#344f59"]
        : theme === "amethyst"
          ? ["#111018", "#784187"]
          : ["#0b0b12", "#483052"];
    var g = x.createLinearGradient(0, 0, 856, 540);
    g.addColorStop(0, colors[0]);
    g.addColorStop(1, colors[1]);
    x.fillStyle = g;
    x.fillRect(0, 0, 856, 540);

    if (!backSide) {
      x.strokeStyle = "#d5b4f010";
      x.beginPath();
      x.ellipse(180, 300, 200, 350, -0.4, 0, Math.PI * 2);
      x.stroke();
      if (image.complete && image.naturalWidth) {
        var iw = 856 * 0.38;
        var ih = 540 * 0.91;
        var r = Math.min(iw / image.width, ih / image.height);
        var w = image.width * r;
        var h = image.height * r;
        x.drawImage(image, 856 * 0.065 + (iw - w) / 2, 540 * 0.04 + (ih - h) / 2, w, h);
      }
      txt("PRIVATE GIFT / 01", 51, 42, 8.5, "#b6a6c6");
      var lg = x.createLinearGradient(440, 0, 795, 0);
      lg.addColorStop(0, theme === "silver" ? "#ffffff" : "#e346d9");
      lg.addColorStop(1, "#e5dcf0");
      txt("VR LOUNGE", 441, 59, 54, lg, 850, 365);
      txt("П О Д А Р О Ч Н А Я   К А Р Т А", 441, 131, 9.8, "#b8a8c6");
      txt(amountText, 438, 175, 103, "#f5edf8", 450, 325);
      x.font = '450 103px "Inter Cyr",Arial,sans-serif';
      var aw = x.measureText(amountText).width;
      txt("₽", 443 + aw, 193, 70, "#b9a8c5", 350);
      txt("ТОЛЬКО ДЛЯ ВАС", 441, 310, 9.5, "#a899b8");
      if (given && family) {
        txt(given, 800, 350, 25.2, "#eee5f4", 400, 359, "right");
        txt(family, 800, 389, 35.5, "#eee5f4", 750, 359, "right");
      } else if (family) {
        txt(family, 800, 350, 35.5, "#eee5f4", 750, 359, "right");
      } else if (given) {
        txt(given, 800, 350, 22, "#c5b6d1", 400, 359, "right");
      }
      txt(numberText, 800, 485, 24, "#c5b6d1", 400, 350, "right");
      txt("Д Р У Г О Е  И З М Е Р Е Н И Е", 364, 507, 9.5, "#c3b4d1");
    } else {
      txt("VR LOUNGE", 60, 48, 36, "#dfc6ec", 800);
      txt("VR, PS5, Kinect-танцы, караоке и", 800, 44, 19.5, "#b9afc3", 400, 365, "right");
      txt("лучшие дни рождения в одном клубе", 800, 72, 19.5, "#b9afc3", 400, 365, "right");
      x.fillStyle = "#ffffff20";
      x.fillRect(60, 106, 736, 1);
      txt("ВАШЕ МЕСТО ВСТРЕЧИ", 60, 133, 14, "#ac9bbb");
      txt("КАК ИСПОЛЬЗОВАТЬ", 452, 133, 14, "#ac9bbb");
      lines(["Кольчугино", "ул. Зернова 11", "ТЦ «ТРИО»"], 60, 202, 32.5, 43, "#fff");
      lines(["Запись и вопросы", "+7 930 224-45-51"], 60, 390, 19, 29);
      txt("ОБРАЗЕЦ · НЕ АКТИВИРОВАН", 60, 460, 12, "#e8d4f5", 600);
      lines(
        [
          "Свяжитесь с администратором",
          "и согласуйте дату и развлечения.",
          "При записи назовите номер",
          "карты.",
          "",
          "Номинал, остаток и условия",
          "подтверждает администратор.",
        ],
        452,
        205,
        19.5,
        30
      );
      txt("vr-lounge.ru", 60, 486, 18.8, "#bcb0c9");
      txt(numberText, 796, 486, 18.8, "#bcb0c9", 400, 280, "right");
    }

    x.strokeStyle = "#ead4ff55";
    x.lineWidth = 1;
    x.beginPath();
    if (x.roundRect) x.roundRect(1, 1, 854, 538, 28);
    else x.rect(1, 1, 854, 538);
    x.stroke();
    return c;
  }

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
        if (state === "submitting") statusEl.textContent = "Демо: имитация отправки…";
        else if (state === "error") statusEl.textContent = detail || "Не удалось показать демо-статус. Повторите.";
        else if (state === "success") statusEl.textContent = "";
        else statusEl.textContent = "";
      }
      if (!success) return;
      if (state === "success") {
        success.hidden = false;
        success.classList.add("is-visible");
        success.setAttribute("data-gift-state", "success");
        if (successTitle) successTitle.textContent = "Демо: заявка никуда не отправлена";
        if (successBody) {
          successBody.replaceChildren();
          successBody.appendChild(
            document.createTextNode(
              "Это превью без CRM, оплаты и выпуска сертификата. Для реальной покупки позвоните "
            )
          );
          var a = document.createElement("a");
          a.href = "tel:+79302244551";
          a.textContent = "+7 930 224-45-51";
          successBody.appendChild(a);
          successBody.appendChild(document.createTextNode("."));
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
      btn.disabled = true;
      setFormState("submitting");
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
    });

    setAmount(3000, false);
    nameInput.value = "";
    updateName();
    return openSheet;
  }

  function initCallbarObserver() {
    var hero = document.querySelector(".preview-hero .hero");
    if (!hero || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(
      function (entries) {
        var ratio = entries[0].intersectionRatio;
        document.documentElement.classList.toggle("hero-cta-vis", ratio > 0.06);
      },
      { threshold: [0, 0.06, 0.12, 0.25, 0.5, 1] }
    ).observe(hero);
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

  function initCardLightbox() {
    var openBtn = document.getElementById("btn-view-full-card");
    var lb = document.getElementById("card-lightbox");
    var mount = document.getElementById("card-lightbox-mount");
    if (!openBtn || !lb || !mount) return;
    var template = document.getElementById("gift-sheet-card");
    var open = false;
    var ctrl = null;
    var amountInput = document.getElementById("gift-amount");
    var nameInput = document.getElementById("gift-recipient-input");

    function close() {
      if (!open) return;
      open = false;
      lb.hidden = true;
      lb.classList.remove("is-open");
      document.body.classList.remove("lock", "gift-lb-open");
      destroyGiftController(ctrl);
      ctrl = null;
      mount.innerHTML = "";
      openBtn.focus();
    }

    function currentAmount() {
      var n = parseInt(String(amountInput && amountInput.value).replace(/\D/g, ""), 10);
      return n >= AMOUNT_MIN && n <= AMOUNT_MAX ? n : 3000;
    }

    function show() {
      if (!template) return;
      mount.innerHTML = "";
      var clone = template.cloneNode(true);
      clone.id = "gift-lightbox-card";
      clone.classList.add("vrl-gift--full");
      clone.setAttribute("data-vrl-mode", "lightbox");
      mount.appendChild(clone);

      var chrome = document.createElement("div");
      chrome.className = "vrl-gift-full-chrome";
      chrome.innerHTML =
        '<p class="vrl-gift__hint">Наведите курсор для объёма · нажмите на карту, чтобы перевернуть</p>' +
        '<div class="vrl-gift__themes" role="group" aria-label="Отделка (только полное превью)">' +
        '<button type="button" class="vrl-gift__theme" data-theme="obsidian" aria-pressed="true">01 / OBSIDIAN</button>' +
        '<button type="button" class="vrl-gift__theme" data-theme="amethyst" aria-pressed="false">02 / AMETHYST</button>' +
        '<button type="button" class="vrl-gift__theme" data-theme="silver" aria-pressed="false">03 / TITANIUM</button>' +
        "</div>" +
        '<div class="vrl-gift__toolbar">' +
        '<button type="button" class="btn" data-vrl-flip>↻ Перевернуть</button>' +
        '<button type="button" class="btn" data-vrl-png>Скачать PNG</button>' +
        '<button type="button" class="btn" data-vrl-print>Печать / PDF · 2 стороны</button>' +
        '<button type="button" class="btn" data-vrl-pause aria-pressed="false">Пауза анимации</button>' +
        "</div>";
      mount.appendChild(chrome);

      ctrl = initVrlGiftCard(clone, { tilt: true });
      ctrl.setAmount(currentAmount());
      ctrl.setName(nameInput ? nameInput.value : "");
      ctrl.setTheme("obsidian");

      chrome.querySelectorAll("[data-theme]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var theme = btn.getAttribute("data-theme");
          ctrl.setTheme(theme);
          chrome.querySelectorAll("[data-theme]").forEach(function (b) {
            b.setAttribute("aria-pressed", b === btn ? "true" : "false");
          });
        });
      });
      chrome.querySelector("[data-vrl-flip]").addEventListener("click", function () {
        ctrl.flip();
      });
      chrome.querySelector("[data-vrl-pause]").addEventListener("click", function () {
        var paused = !clone.classList.contains("is-paused");
        ctrl.setPaused(paused);
        this.textContent = paused ? "Продолжить анимацию" : "Пауза анимации";
        this.setAttribute("aria-pressed", paused ? "true" : "false");
      });
      chrome.querySelector("[data-vrl-png]").addEventListener("click", function () {
        renderGiftCanvas(clone, clone.classList.contains("is-flipped"))
          .then(function (c) {
            c.toBlob(function (b) {
              if (b) downloadBlob(b, "VR-Lounge-gift-" + (clone.getAttribute("data-theme") || "obsidian") + ".png");
            }, "image/png");
          })
          .catch(function (err) {
            toast("Не удалось создать PNG: " + (err && err.message ? err.message : "ошибка"));
          });
      });
      chrome.querySelector("[data-vrl-print]").addEventListener("click", function () {
        Promise.all([renderGiftCanvas(clone, false), renderGiftCanvas(clone, true)])
          .then(function (canvases) {
            var w = window.open("", "_blank");
            if (!w) {
              toast("Разрешите всплывающие окна для печати");
              return;
            }
            w.document.write(
              "<!doctype html><title>VR Lounge · демо печать</title><style>body{font-family:Arial,sans-serif;text-align:center;background:#111;color:#ddd}img{width:170mm;max-width:95%;margin:12px auto;display:block;border-radius:12px}@media print{body{background:#fff;color:#000}}</style>"
            );
            w.document.write("<p>VR LOUNGE · ДЕМОНСТРАЦИОННЫЙ МАКЕТ · НЕ АКТИВИРОВАН</p>");
            canvases.forEach(function (c) {
              w.document.write('<img src="' + c.toDataURL("image/png") + '" alt="">');
            });
            w.document.close();
            w.focus();
            w.print();
          })
          .catch(function (err) {
            toast("Ошибка печати: " + (err && err.message ? err.message : "ошибка"));
          });
      });

      lb.hidden = false;
      requestAnimationFrame(function () {
        lb.classList.add("is-open");
      });
      document.body.classList.add("lock", "gift-lb-open");
      open = true;
      lb.querySelector(".card-lightbox__x").focus();
    }

    openBtn.addEventListener("click", function (e) {
      e.preventDefault();
      show();
    });
    lb.querySelectorAll("[data-card-lb-close]").forEach(function (n) {
      n.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) close();
    });
  }

  document.documentElement.classList.add("js");
  initBookingSheet();
  var openGiftSheet = initGiftSheet();
  initCallbarObserver();
  initCardLightbox();
  initGiftFieldScroll();

  if (location.search.indexOf("autogift=1") !== -1 && openGiftSheet) {
    openGiftSheet(true);
    if (location.search.indexOf("focusphone=1") !== -1) {
      window.addEventListener("load", function () {
        var sc = document.querySelector(".bs--gift .bs__gift-scroll");
        var phone = document.getElementById("gift-phone");
        if (sc && phone) {
          phone.focus();
          phone.scrollIntoView({ block: "center" });
          sc.scrollTop = sc.scrollHeight;
        }
      });
    }
  }
  if (location.search.indexOf("scrolled=1") !== -1) {
    window.addEventListener("load", function () {
      var el = document.getElementById("preview-scroll-spacer");
      if (el) window.scrollTo(0, el.offsetTop - 40);
    });
  }
  if (location.search.indexOf("fulllb=1") !== -1) {
    window.addEventListener("load", function () {
      var btn = document.getElementById("btn-view-full-card");
      if (btn) btn.click();
    });
  }
})();
