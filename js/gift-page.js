/* Public gift card page: 3D flip + Firestore read-only by publicCode. No redeem. */
(function () {
  "use strict";

  var PHONE_TEL = "+79302244551";
  var PHONE_HUMAN = "8 930 224-45-51";
  var SITE_URL = "https://vr-lounge.github.io/vr-lounge-redesign/";
  var WA_URL = "https://wa.me/79302244551";
  var STATUS_LABELS = {
    draft: "Черновик",
    pending: "Ожидает оплату",
    issued: "Активна",
    partial: "Частично использована",
    redeemed: "Погашена",
    void: "Аннулирована",
  };

  function fmtRub(n) {
    return new Intl.NumberFormat("ru-RU").format(Number(n) || 0) + " ₽";
  }

  function fmtDate(v) {
    if (!v) return "—";
    try {
      var d = v.toDate ? v.toDate() : new Date(v);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return "—";
    }
  }

  function nameParts(raw) {
    var words = String(raw || "")
      .trim()
      .toUpperCase()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return { given: "", family: "НЕ УКАЗАНО", placeholder: true };
    if (words.length === 1) return { given: "", family: words[0], placeholder: false };
    return {
      given: words.slice(0, -1).join(" "),
      family: words[words.length - 1],
      placeholder: false,
    };
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
    var family = document.createElement("span");
    family.className = "family";
    family.textContent = parts.family;
    nameEl.appendChild(family);
  }

  function setText(sel, text) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = text;
    });
  }

  function initFlip(root) {
    if (!root) return null;
    var scene = root.querySelector(".vrl-gift__scene");
    var tilt = root.querySelector(".vrl-gift__tilt");
    var card = root.querySelector(".vrl-gift__card");
    var front = root.querySelector(".vrl-gift__front");
    var back = root.querySelector(".vrl-gift__back");
    var backLink = back ? back.querySelector("a") : null;
    var flipped = false;
    var flipRaf = 0;
    var flipStartedAt = 0;
    var settleTimer = 0;
    var FLIP_MIN_MS = 700;
    var rm = window.matchMedia("(prefers-reduced-motion: reduce)");

    function clearSettle() {
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = 0;
      }
    }

    function cancelFlipRaf() {
      if (flipRaf) {
        cancelAnimationFrame(flipRaf);
        flipRaf = 0;
      }
    }

    function finishFlip(fromEvent) {
      if (fromEvent && root.classList.contains("is-flipping")) {
        if (flipStartedAt && performance.now() - flipStartedAt < FLIP_MIN_MS) return;
      }
      root.classList.remove("is-flipping");
      root.classList.add("is-face-settled");
      if (front) front.setAttribute("aria-hidden", flipped ? "true" : "false");
      if (back) back.setAttribute("aria-hidden", flipped ? "false" : "true");
      if (backLink) backLink.tabIndex = flipped ? 0 : -1;
      if (card) card.setAttribute("aria-pressed", flipped ? "true" : "false");
    }

    function setFlipped(next, opts) {
      opts = opts || {};
      var wasFlipped = flipped;
      flipped = !!next;
      clearSettle();
      cancelFlipRaf();

      if (opts.instant || rm.matches) {
        root.classList.remove("is-flipping");
        root.classList.toggle("is-flipped", flipped);
        finishFlip(false);
        return;
      }

      if (wasFlipped === flipped && root.classList.contains("is-face-settled")) return;

      root.classList.add("is-flipping");
      root.classList.remove("is-face-settled");
      flipRaf = requestAnimationFrame(function () {
        flipRaf = requestAnimationFrame(function () {
          flipRaf = 0;
          flipStartedAt = performance.now();
          root.classList.toggle("is-flipped", flipped);
          settleTimer = window.setTimeout(function () {
            finishFlip(false);
          }, 980);
        });
      });
    }

    function flip() {
      setFlipped(!flipped);
    }

    function onPointer(e) {
      if (e.target.closest("a,button")) return;
      e.preventDefault();
      flip();
    }

    function onKey(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flip();
      }
    }

    function onTransitionEnd(e) {
      if (!card || e.target !== card) return;
      if (e.propertyName && e.propertyName.indexOf("transform") === -1) return;
      if (!root.classList.contains("is-flipping")) return;
      if (flipStartedAt && performance.now() - flipStartedAt < FLIP_MIN_MS) return;
      finishFlip(true);
    }

    if (card) {
      card.addEventListener("click", onPointer);
      card.addEventListener("keydown", onKey);
      card.addEventListener("transitionend", onTransitionEnd);
    }

    var rx = 0;
    var ry = 0;
    function onMove(e) {
      if (!tilt || rm.matches || root.classList.contains("is-flipping")) return;
      var rect = (scene || root).getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      rx = Math.max(-8, Math.min(8, -y * 12));
      ry = Math.max(-10, Math.min(10, x * 14));
      tilt.style.setProperty("--rx", rx + "deg");
      tilt.style.setProperty("--ry", ry + "deg");
    }
    function onLeave() {
      if (!tilt) return;
      tilt.style.setProperty("--rx", "0deg");
      tilt.style.setProperty("--ry", "0deg");
    }
    if (scene && !rm.matches) {
      scene.addEventListener("pointermove", onMove);
      scene.addEventListener("pointerleave", onLeave);
    }

    setFlipped(false, { instant: true });
    return { flip: flip, setFlipped: setFlipped };
  }

  function fillCard(card) {
    var amount = card.balance != null ? card.balance : card.faceValue;
    setText("[data-vrl-amount]", new Intl.NumberFormat("ru-RU").format(Number(amount) || 0));
    setText("[data-vrl-number]", card.publicCode || "VRL-······");
    setText("[data-vrl-number-back]", card.publicCode || "VRL-······");
    document.querySelectorAll("[data-vrl-name]").forEach(function (el) {
      renderName(el, card.recipientName);
    });
    var specimen = document.getElementById("cardSpecimen");
    if (specimen) {
      var label = STATUS_LABELS[card.status] || card.status || "—";
      specimen.textContent =
        card.status === "pending"
          ? "ОЖИДАЕТ ОПЛАТУ"
          : card.status === "void"
            ? "АННУЛИРОВАНА"
            : "БАЛАНС · " + label.toUpperCase();
    }
    var theme = card.theme === "silver" ? "silver" : "amethyst";
    var root = document.getElementById("public-gift-card");
    if (root) {
      root.classList.toggle("vrl-gift--amethyst", theme === "amethyst");
      root.classList.toggle("vrl-gift--silver", theme === "silver");
    }
  }

  function fillMeta(card, ledger, sourceLabel) {
    document.getElementById("statFace").textContent = fmtRub(card.faceValue);
    document.getElementById("statBalance").textContent = fmtRub(card.balance);
    document.getElementById("statStatus").textContent =
      STATUS_LABELS[card.status] || card.status || "—";
    document.getElementById("statIssued").textContent = fmtDate(
      card.issuedAt || card.paidAt || card.createdAt
    );
    var statusEl = document.getElementById("loadStatus");
    if (statusEl) {
      statusEl.textContent = sourceLabel;
      statusEl.removeAttribute("data-tone");
    }
    document.title = (card.publicCode || "Карта") + " · VR Lounge";

    var list = document.getElementById("ledgerList");
    if (!list) return;
    if (!ledger.length) {
      list.innerHTML = '<p class="gp-empty">Операций пока нет — баланс равен номиналу.</p>';
      return;
    }
    list.innerHTML = ledger
      .slice()
      .sort(function (a, b) {
        return String(b.createdAt).localeCompare(String(a.createdAt));
      })
      .map(function (e) {
        var debit = e.kind === "debit";
        var sign = debit ? "−" : "+";
        var note = e.note || (debit ? "Списание" : "Зачисление");
        note = String(note).replace(/</g, "&lt;");
        return (
          '<div class="gp-ledger__row">' +
          '<div><span class="gp-ledger__amt ' +
          (debit ? "is-debit" : "is-credit") +
          '">' +
          sign +
          fmtRub(e.amount) +
          '</span> <span class="gp-ledger__meta">· ' +
          note +
          "</span></div>" +
          '<div class="gp-ledger__date">' +
          fmtDate(e.createdAt) +
          "</div></div>"
        );
      })
      .join("");
  }

  function showError(msg) {
    var statusEl = document.getElementById("loadStatus");
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.setAttribute("data-tone", "err");
    }
  }

  async function main() {
    var root = document.getElementById("public-gift-card");
    initFlip(root);

    var params = new URLSearchParams(location.search);
    var code = (params.get("code") || params.get("c") || "").trim().toUpperCase().replace(/\s+/g, "");

    document.getElementById("btnCall").href = "tel:" + PHONE_TEL;
    document.getElementById("btnBook").href = WA_URL + "?text=" + encodeURIComponent(
      "Здравствуйте! Хочу записаться. Подарочная карта " + (code || "")
    );
    document.getElementById("btnSite").href = SITE_URL;
    document.getElementById("phoneHuman").textContent = PHONE_HUMAN;

    document.getElementById("btnPrint").addEventListener("click", function () {
      window.print();
    });

    if (!code) {
      showError("Откройте персональную ссылку с кодом карты: ?code=VRL-XXXXXX");
      return;
    }

    try {
      var appMod = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
      var fsMod = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
      var giftMod = await import("./gift-cards.js?v=20261109-delivery");
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
      var card = await giftMod.findGiftCardByCode(db, code, false);
      if (!card) {
        showError("Карта не найдена. Проверьте код в ссылке.");
        return;
      }
      var ledger = await giftMod.getGiftCardLedger(db, card.id, false);
      fillCard(card);
      fillMeta(card, ledger, "Ваша карта · данные онлайн");
      if (params.get("print") === "1") {
        window.setTimeout(function () {
          try {
            window.print();
          } catch (e) {
            /* ignore */
          }
        }, 700);
      }
    } catch (err) {
      console.warn("gift page load failed", err);
      showError("Не удалось загрузить карту. Обновите страницу или напишите администратору.");
    }
  }

  main();
})();
