(function () {
  "use strict";

  var STATUS = {
    submitted: { label: "Заявка принята", cls: "badge-st--new" },
    pay_verify: { label: "Ждёт проверки оплаты", cls: "badge-st--wait" },
    issue_pending: { label: "Готовим сертификат", cls: "badge-st--wait" },
    issued: { label: "Выпущен", cls: "badge-st--active" },
    issue_failed: { label: "Выпуск задерживается", cls: "badge-st--part" },
    partial: { label: "Частично использован", cls: "badge-st--part" },
    done: { label: "Погашен", cls: "badge-st--done" },
    cancelled: { label: "Отменён", cls: "badge-st--done" },
    refund: { label: "Возврат", cls: "badge-st--done" },
  };

  var CRM_BASE = "https://crm-demo.vr-lounge.local/admin/request/";

  var seed = [
    {
      id: "REQ-DEMO-1042",
      status: "pay_verify",
      amount: 3000,
      balance: 3000,
      phone: "+7 (9**) ***-**-42",
      recipient: "Кира",
      history: ["Заявка принята (демо)", "Ожидаем подтверждённую оплату"],
    },
    {
      id: "REQ-DEMO-1043",
      status: "issue_pending",
      amount: 10000,
      balance: 10000,
      phone: "+7 (9**) ***-**-43",
      recipient: "",
      history: ["Оплата подтверждена (демо)", "Готовим файл сертификата"],
    },
    {
      id: "REQ-DEMO-1038",
      status: "issued",
      amount: 5000,
      balance: 5000,
      phone: "+7 (9**) ***-**-38",
      recipient: "Артём",
      history: ["Сертификат выпущен (демо)", "Передан покупателю вне этого превью"],
    },
    {
      id: "REQ-DEMO-1039",
      status: "partial",
      amount: 8000,
      balance: 3500,
      phone: "+7 (9**) ***-**-39",
      recipient: "Соня",
      history: ["Активен", "Списание 1 500 ₽ — VR (демо)", "Списание 3 000 ₽ — праздник (демо)"],
    },
    {
      id: "REQ-DEMO-1040",
      status: "issue_failed",
      amount: 7000,
      balance: 7000,
      phone: "+7 (9**) ***-**-40",
      recipient: "Лёша",
      history: [
        "Оплата подтверждена",
        "Ошибка генерации файла (демо)",
        "Повторная оплата не требуется",
      ],
    },
    {
      id: "REQ-DEMO-1041",
      status: "refund",
      amount: 2000,
      balance: 0,
      phone: "+7 (9**) ***-**-41",
      recipient: "Макс",
      history: ["Возврат неиспользованного остатка (демо)"],
    },
  ];

  var certs = seed.slice();
  var selectedId = null;
  var submitting = false;

  var tbody = document.getElementById("cert-tbody");
  var form = document.getElementById("admin-new-form");
  var detail = document.getElementById("admin-detail");

  function badge(status) {
    var s = STATUS[status];
    return '<span class="badge-st ' + s.cls + '">' + s.label + "</span>";
  }

  function tgPreview(c) {
    return (
      "VR LOUNGE | РАБОТА\n" +
      "Новая заявка на подарок: " +
      c.id +
      "\nНоминал: " +
      c.amount.toLocaleString("ru-RU") +
      " ₽\nCRM: " +
      CRM_BASE +
      c.id +
      "\n(без телефона, имени, QR и секретов)"
    );
  }

  function render() {
    if (!tbody) return;
    tbody.innerHTML = certs
      .map(function (c) {
        return (
          "<tr><td>" +
          c.id +
          "</td><td>" +
          badge(c.status) +
          "</td><td>" +
          c.amount.toLocaleString("ru-RU") +
          " ₽</td><td>" +
          c.balance.toLocaleString("ru-RU") +
          " ₽</td><td>" +
          c.phone +
          "</td><td>" +
          (c.recipient || "—") +
          '</td><td><button type="button" class="btn btn--ghost btn--sm select-cert" data-id="' +
          c.id +
          '">Открыть</button></td></tr>"
        );
      })
      .join("");

    tbody.querySelectorAll(".select-cert").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectCert(btn.getAttribute("data-id"));
      });
    });
  }

  function setBtn(id, enabled) {
    var el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  }

  function selectCert(id) {
    selectedId = id;
    var c = certs.find(function (x) {
      return x.id === id;
    });
    if (!c || !detail) return;
    detail.hidden = false;
    document.getElementById("detail-id").textContent = c.id;
    document.getElementById("detail-status").innerHTML = badge(c.status);
    document.getElementById("tg-mock").textContent = tgPreview(c);
    var hist = document.getElementById("detail-history");
    hist.innerHTML = c.history
      .map(function (h) {
        return "<li>" + h + "</li>";
      })
      .join("");

    setBtn("btn-verify-pay", c.status === "submitted");
    setBtn("btn-start-issue", c.status === "pay_verify");
    setBtn("btn-complete-issue", c.status === "issue_pending");
    setBtn("btn-issue-fail", c.status === "issue_pending");
    setBtn("btn-retry-issue", c.status === "issue_failed");
    setBtn(
      "btn-partial",
      c.status === "issued" || c.status === "partial"
    );
    setBtn(
      "btn-cancel",
      c.status === "submitted" || c.status === "pay_verify"
    );
    setBtn(
      "btn-refund",
      c.status === "issued" || c.status === "partial" || c.status === "done"
    );
  }

  function guardSubmit(fn) {
    if (submitting) return;
    submitting = true;
    fn();
    window.setTimeout(function () {
      submitting = false;
    }, 700);
  }

  function findSelected() {
    return certs.find(function (x) {
      return x.id === selectedId;
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      guardSubmit(function () {
        var amount = parseInt(document.getElementById("adm-amount").value, 10);
        var phone = document.getElementById("adm-phone").value.trim();
        var recipient = document.getElementById("adm-name").value.trim();
        if (!phone || amount < 1000 || amount % 1000 !== 0) return;
        var id = "REQ-DEMO-" + String(1100 + certs.length);
        certs.unshift({
          id: id,
          status: "submitted",
          amount: amount,
          balance: amount,
          phone: phone.replace(/\d(?=\d{4})/g, "*").slice(0, 18),
          recipient: recipient,
          history: ["Заявка создана вручную (демо)"],
        });
        render();
        selectCert(id);
        form.reset();
        document.getElementById("adm-amount").value = "5000";
      });
    });
  }

  function bind(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", function () { guardSubmit(fn); });
  }

  bind("btn-verify-pay", function () {
    var c = findSelected();
    if (!c) return;
    c.status = "pay_verify";
    c.history.push("Переведено в «Ждёт проверки оплаты»");
    render();
    selectCert(c.id);
  });

  bind("btn-start-issue", function () {
    var c = findSelected();
    if (!c) return;
    c.status = "issue_pending";
    c.history.push("Оплата подтверждена · готовим сертификат");
    render();
    selectCert(c.id);
  });

  bind("btn-complete-issue", function () {
    var c = findSelected();
    if (!c) return;
    c.status = "issued";
    c.balance = c.amount;
    c.history.push("Сертификат выпущен (демо-файл)");
    render();
    selectCert(c.id);
  });

  bind("btn-issue-fail", function () {
    var c = findSelected();
    if (!c) return;
    c.status = "issue_failed";
    c.history.push("Сбой выпуска · повторная оплата не нужна");
    render();
    selectCert(c.id);
  });

  bind("btn-retry-issue", function () {
    var c = findSelected();
    if (!c) return;
    c.status = "issue_pending";
    c.history.push("Повторная попытка выпуска");
    render();
    selectCert(c.id);
  });

  bind("btn-partial", function () {
    var c = findSelected();
    if (!c || c.balance <= 0) return;
    var spend = Math.min(1000, c.balance);
    c.balance -= spend;
    c.history.push("Списание " + spend.toLocaleString("ru-RU") + " ₽ (демо)");
    if (c.balance === 0) c.status = "done";
    else c.status = "partial";
    render();
    selectCert(c.id);
  });

  bind("btn-cancel", function () {
    var c = findSelected();
    if (!c) return;
    c.status = "cancelled";
    c.balance = 0;
    c.history.push("Заявка отменена (демо)");
    render();
    selectCert(c.id);
  });

  bind("btn-refund", function () {
    var c = findSelected();
    if (!c) return;
    c.status = "refund";
    c.balance = 0;
    c.history.push("Возврат оформлен отдельной процедурой (демо)");
    render();
    selectCert(c.id);
  });

  render();
  selectCert("REQ-DEMO-1040");
})();
