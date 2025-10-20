const storageKey = "polar-shifts";
const grid = document.getElementById("calendarGrid");
const menu = document.getElementById("shiftMenu");
let data = JSON.parse(localStorage.getItem(storageKey) || "{}");
let currentCell = null;

function restore() {
  grid.querySelectorAll(".cell[data-day]").forEach((cell) => {
    const year = grid.closest(".calendar").dataset.year;
    const month = grid.closest(".calendar").dataset.month;
    const day = String(cell.dataset.day).padStart(2, "0");
    const id = `${year}-${month}-${day}`;
    applyShiftClass(cell, data[id]);
  });
}
function applyShiftClass(cell, shift) {
  cell.classList.remove("shift-day", "shift-night", "shift-off");
  if (!shift) return;
  cell.classList.add(`shift-${shift}`);
}

function openMenu(x, y, cell) {
  currentCell = cell;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.hidden = false;
}
function closeMenu() {
  menu.hidden = true;
  currentCell = null;
}

grid.addEventListener("click", (e) => {
  const cell = e.target.closest(".cell[data-day]");
  if (
    !cell ||
    cell.classList.contains("cell--prev") ||
    cell.classList.contains("cell--next")
  )
    return;
  const rect = cell.getBoundingClientRect();
  openMenu(
    rect.left + rect.width / 2,
    rect.top + window.scrollY + rect.height / 2,
    cell
  );
});

menu.addEventListener("click", (e) => {
  const btn = e.target.closest(".shift-menu__item");
  if (!btn || !currentCell) return;
  const shift = btn.dataset.shift;
  const year = grid.closest(".calendar").dataset.year;
  const month = grid.closest(".calendar").dataset.month;
  const day = String(currentCell.dataset.day).padStart(2, "0");
  const id = `${year}-${month}-${day}`;

  if (shift === "clear") {
    delete data[id];
    applyShiftClass(currentCell, null);
  } else {
    data[id] = shift;
    applyShiftClass(currentCell, shift);
  }
  localStorage.setItem(storageKey, JSON.stringify(data));
  closeMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
document.addEventListener("click", (e) => {
  if (!menu.hidden && !menu.contains(e.target) && e.target !== currentCell)
    closeMenu();
});

document.getElementById("clearAll")?.addEventListener("click", () => {
  if (!confirm("Очистить все отметки смен?")) return;
  data = {};
  localStorage.removeItem(storageKey);
  grid
    .querySelectorAll(".cell[data-day]")
    .forEach((c) => applyShiftClass(c, null));
});

restore();
(function () {
  const section = document.querySelector(".calendar");
  const year = String(section?.dataset.year || "");
  const monthStr = String(section?.dataset.month || "01");
  const storageKey = "polar_shifts_" + year + "_" + monthStr;

  const grid = document.getElementById("calendarGrid");
  if (!grid) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = (n) => String(n).padStart(2, "0");
  const toKeyByDay = (d) => [year, monthStr, fmt(d)].join("-");
  const parseTime = (v) => {
    const [h, m] = String(v || "0:0")
      .split(":")
      .map(Number);
    return h + (m || 0) / 60;
  };
  const hoursBetween = (a, b) => {
    let h = parseTime(b) - parseTime(a);
    if (h < 0) h += 24;
    return h;
  };

  let data = JSON.parse(localStorage.getItem(storageKey) || "{}");
  let activeDateKey = null;
  let selected = null;

  // обёртка контента ячеек
  $$(".cell[data-day]").forEach((c) => {
    if (!c.querySelector(".cell--content")) {
      const v = c.innerHTML;
      c.innerHTML =
        '<div class="cell--content"><div class="num">' + v + "</div></div>";
    }
    c.addEventListener("click", (e) => {
      if (e.target.closest(".tag")) return;
      const day = Number(c.dataset.day);
      openPicker(toKeyByDay(day));
    });
  });

  function renderAll() {
    $$(".cell[data-day]").forEach((c) => {
      const wrap = $(".cell--content", c);
      $$(".tag", wrap).forEach((t) => t.remove());
      const key = toKeyByDay(Number(c.dataset.day));
      const rec = data[key];
      if (rec) {
        const tag = document.createElement("div");
        tag.className = "tag";
        tag.innerHTML =
          '<span class="dot dot--' +
          (rec.kind || "day") +
          '"></span><span>' +
          rec.title +
          "</span>";
        wrap.appendChild(tag);
        tag.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openEditor(key);
        });
      }
    });
  }

  const backdrop = $("#modalBackdrop");
  const modalClose = $("#modalClose");
  const modalBack = $("#modalBack");
  const modalSave = $("#modalSave");
  const modalDelete = $("#modalDelete");
  const editor = $("#editor");
  const shiftList = $("#shiftList");

  const eTitle = $("#eTitle");
  const eStart = $("#eStart");
  const eEnd = $("#eEnd");
  const ePay = $("#ePay");
  const eRate = $("#eRate");
  const eHours = $("#eHours");
  const eTotal = $("#eTotal");
  const rateLabel = $("#rateLabel");

  function open() {
    backdrop.style.display = "flex";
  }
  function close() {
    backdrop.style.display = "none";
    selected = null;
    activeDateKey = null;
    editor.hidden = true;
    modalBack.hidden = true;
    modalDelete.hidden = true;
    modalSave.disabled = true;
    $("#modalTitle").textContent = "Выбрать смену";
  }
  modalClose.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  function openPicker(dateKey) {
    activeDateKey = dateKey;
    $("#modalTitle").textContent = "Выбрать смену";
    editor.hidden = true;
    modalBack.hidden = true;
    modalDelete.hidden = true;
    modalSave.disabled = true;
    open();
  }

  function fillEditor(rec) {
    eTitle.value = rec.title || "";
    eStart.value = rec.start || "09:00";
    eEnd.value = rec.end || "18:00";
    ePay.value = rec.pay || "hourly";
    eRate.value = rec.rate ?? 10;
    eHours.value = rec.hours ?? hoursBetween(eStart.value, eEnd.value);
    calcTotal();
    toggleRate();
  }

  function openEditor(dateKey) {
    activeDateKey = dateKey;
    try {
      const [yy, mm, dd] = dateKey.split("-");
      const dt = new Date(Number(yy), Number(mm) - 1, Number(dd));
      $("#modalTitle").textContent = dt.toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch (_) {
      $("#modalTitle").textContent = "Редактировать смену";
    }
    editor.hidden = false;
    modalBack.hidden = false;
    modalDelete.hidden = false;
    modalSave.disabled = false;
    open();
    const current = data[dateKey];
    if (current) selected = current;
    else
      selected = {
        title: "",
        start: "09:00",
        end: "18:00",
        pay: "hourly",
        rate: 10,
        hours: 9,
        kind: "day",
      };
    fillEditor(selected);
  }

  shiftList.addEventListener("click", (e) => {
    const btn = e.target.closest(".shift-item");
    if (!btn || !activeDateKey) return;
    selected = {
      title: btn.dataset.title,
      start: btn.dataset.start,
      end: btn.dataset.end,
      pay: btn.dataset.pay || "hourly",
      rate: Number(btn.dataset.rate || 10),
      hours: hoursBetween(btn.dataset.start, btn.dataset.end),
      kind: btn.dataset.id,
    };
    openEditor(activeDateKey);
  });

  modalBack.addEventListener("click", () => openPicker(activeDateKey));
  modalDelete.addEventListener("click", () => {
    if (activeDateKey) {
      delete data[activeDateKey];
      localStorage.setItem(storageKey, JSON.stringify(data));
      renderAll();
    }
    close();
  });

  modalSave.addEventListener("click", () => {
    if (!activeDateKey || !selected) return;
    selected.title = eTitle.value.trim() || selected.title || "Смена";
    selected.start = eStart.value;
    selected.end = eEnd.value;
    selected.pay = ePay.value;
    selected.rate = Number(eRate.value || 0);
    selected.hours = Number(eHours.value || 0);
    const hours = Number(selected.hours || 0);
    const rate = Number(selected.rate || 0);
    selected.total =
      selected.pay === "hourly"
        ? hours * rate
        : selected.pay === "fixed"
        ? rate
        : 0;
    data[activeDateKey] = selected;
    localStorage.setItem(storageKey, JSON.stringify(data));
    renderAll();
    close();
  });

  function calcTotal() {
    const pay = ePay.value,
      hours = Number(eHours.value || 0),
      rate = Number(eRate.value || 0);
    eTotal.value =
      Math.round(
        (pay === "hourly" ? hours * rate : pay === "fixed" ? rate : 0) * 100
      ) / 100;
  }
  function toggleRate() {
    const pay = ePay.value;
    if (pay === "hourly") {
      rateLabel.textContent = "Ставка (Br/ч)";
      eRate.disabled = false;
    } else if (pay === "fixed") {
      rateLabel.textContent = "Фиксированная сумма (Br)";
      eRate.disabled = false;
    } else {
      rateLabel.textContent = "Ставка";
      eRate.disabled = true;
      eRate.value = 0;
    }
    calcTotal();
  }
  ePay.addEventListener("change", toggleRate);
  [eStart, eEnd].forEach((el) =>
    el.addEventListener("change", () => {
      eHours.value = (
        parseTime(eEnd.value) - parseTime(eStart.value) < 0
          ? 24 + parseTime(eEnd.value) - parseTime(eStart.value)
          : parseTime(eEnd.value) - parseTime(eStart.value)
      ).toFixed(1);
      calcTotal();
    })
  );
  [eRate, eHours].forEach((el) => el.addEventListener("input", calcTotal));

  const clearBtn = document.getElementById("clearAll");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (confirm("Очистить все смены за месяц?")) {
        data = {};
        localStorage.setItem(storageKey, JSON.stringify(data));
        renderAll();
      }
    });
  }

  renderAll();
})();
