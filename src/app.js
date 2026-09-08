// Form rendering, state, localStorage persistence, and download wiring.
(function () {
  "use strict";

  const STORAGE_KEY = "dian-form-data";
  // Seccional dropdown values (field 12) where DIAN requires a video
  // appointment for refund requests.
  const APPOINTMENT_SECCIONALES = new Set([
    "Impuestos de Bogotá",
    "Impuestos de Cali",
    "Impuestos y Aduanas de Bucaramanga",
    "Impuestos de Medellín",
  ]);

  // Colombian currency formatting. Whole-peso amounts only (no fractional
  // pesos). Internal state stores the integer string (e.g., "7380476"); the
  // UI displays it as "7.380.476".
  const COP_FMT = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  function formatCop(raw) {
    if (raw == null || raw === "") return "";
    const n = Number(String(raw));
    return Number.isFinite(n) ? COP_FMT.format(Math.round(n)) : String(raw);
  }
  // DIAN check-digit (DV) algorithm for NIT validation.
  // Pad NIT to 15 digits with leading zeros, multiply each digit (right→left)
  // by the weight series [3,7,13,17,19,23,29,37,41,43,47,53,59,67,71], sum,
  // take mod 11. DV = mod if mod<2 else 11-mod.
  const DV_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  function dianDV(nit) {
    const raw = String(nit || "").replace(/\D/g, "");
    if (!raw) return null;
    const padded = raw.padStart(15, "0");
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      sum += parseInt(padded[14 - i], 10) * DV_WEIGHTS[i];
    }
    const mod = sum % 11;
    return mod < 2 ? mod : 11 - mod;
  }

  function parseCopToRaw(text) {
    if (text == null || text === "") return "";
    let t = String(text).replace(/[^\d.,\-]/g, "");
    if (t === "" || t === "-") return "";
    const hasDot = t.includes(".");
    const hasComma = t.includes(",");
    if (hasDot && hasComma) {
      // Both present — the separator nearer the end is the decimal point;
      // the other one is the thousands grouping.
      if (t.lastIndexOf(",") > t.lastIndexOf(".")) {
        t = t.replace(/\./g, "").replace(",", ".");      // Spanish: 1.234,56
      } else {
        t = t.replace(/,/g, "");                          // US:      1,234.56
      }
    } else if (hasComma) {
      // Only commas. Multiple commas → thousands separators. A single comma
      // followed by exactly 3 digits also looks like a thousands separator
      // ("7,380"); otherwise treat as the Spanish decimal mark.
      const parts = t.split(",");
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        t = t.replace(/,/g, "");
      } else {
        t = t.replace(",", ".");
      }
    } else if (hasDot) {
      // Only dots. Multiple dots → thousands separators. A single dot followed
      // by exactly 3 digits is the Spanish thousands grouping ("7.380"); a dot
      // followed by 1–2 digits (or 4+) is a decimal point and we let Number()
      // parse it normally so it can be rounded to whole pesos.
      const parts = t.split(".");
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        t = t.replace(/\./g, "");
      }
    }
    if (t === "" || t === "-") return "";
    const n = Number(t);
    return Number.isFinite(n) ? String(Math.round(n)) : t;
  }
  const state = loadState();

  const tabsEl = document.getElementById("tabs");
  const panelsEl = document.getElementById("panels");
  const statusEl = document.getElementById("status");
  const model = window.FIELDS_MODEL;
  const UPME_DEFAULTS = window.UPME_DEFAULTS || {};
  const UPME_DEFAULT_LABELS = window.UPME_DEFAULT_LABELS || {};
  const UPME_HIDDEN_TABS = window.UPME_HIDDEN_TABS || new Set();
  const UPME_HIDDEN_SECTIONS = window.UPME_HIDDEN_SECTIONS || new Set();
  const UPME_LOCKED_SECTIONS = window.UPME_LOCKED_SECTIONS || new Set();
  const SECCIONAL_EMAILS = window.SECCIONAL_EMAILS || {};

  const visibleTabs = model.tabs.filter((t) => !UPME_HIDDEN_TABS.has(t.id));
  renderTabs(visibleTabs);
  setActiveTab(visibleTabs[0].id);
  restoreInputs();
  saveState();  // initial run so derived values populate state from existing inputs

  document.getElementById("btn-010").addEventListener("click", onDownload010);
  document.getElementById("btn-dj").addEventListener("click", onDownloadDeclaracion);
  document.getElementById("btn-clear").addEventListener("click", onClear);

  // ------------------------------------------------------------------- state
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      // Strip any keys that are now UPME defaults — defaults own those values
      // and stale user-entered values here can poison derived fields.
      for (const k of Object.keys(window.UPME_DEFAULTS || {})) {
        delete parsed[k];
      }
      return parsed;
    } catch (e) {
      console.warn("loadState: corrupt JSON, starting fresh", e);
      return {};
    }
  }
  function saveState() {
    recomputeDerived();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      setStatus("No se pudo guardar (localStorage lleno o bloqueado)", "warn");
    }
  }
  function walkModelFields(model, cb) {
    for (const tab of model.tabs) {
      for (const section of tab.sections) {
        for (const f of section.fields) {
          if (f.type === "row") f.fields.forEach((sub) => cb(sub, section, tab));
          else cb(f, section, tab);
        }
      }
    }
  }
  function isFieldHidden(field, section, tab) {
    if (field.hidden) return true;
    if (section.hidden) return true;
    if (UPME_HIDDEN_TABS.has(tab.id)) return true;
    if (section.id && UPME_HIDDEN_SECTIONS.has(section.id)) return true;
    return false;
  }
  function pruneHiddenStateKeys() {
    walkModelFields(model, (f, section, tab) => {
      if (!isFieldHidden(f, section, tab)) return;
      delete state[f.key];
      if (f.type === "date" || f.type === "date_mdy") {
        delete state[f.key + "_yyyy"];
        delete state[f.key + "_mm"];
        delete state[f.key + "_dd"];
      }
    });
  }
  function recomputeDerived() {
    // First, clear any state keys belonging to hidden tabs/sections/fields —
    // they have no UI and should never reach the generated PDF.
    pruneHiddenStateKeys();
    // Derives see UPME defaults as if they were part of state. State stays
    // pure (user input only) but derived fields get the right inputs.
    const view = Object.assign({}, state, UPME_DEFAULTS);
    walkModelFields(model, (f, section, tab) => {
      if (!f.derived) return;
      if (isFieldHidden(f, section, tab)) return;  // skip hidden derives
      const newVal = f.derived(view);
      if (newVal === "" || newVal == null) delete state[f.key];
      else state[f.key] = newVal;
      const el = document.getElementById("fld-" + f.key);
      if (el) el.value = f.format === "cop" ? formatCop(newVal) : (newVal || "");
    });
    // Soft-defaults: update displayed value of editable fields that mirror
    // a source field, but only when (a) state still has no user value, and
    // (b) the field isn't currently being edited.
    walkModelFields(model, (f, section, tab) => {
      if (typeof f.softDefault !== "function") return;
      if (isFieldHidden(f, section, tab)) return;
      if (state[f.key]) return;
      const el = document.getElementById("fld-" + f.key);
      if (!el || el === document.activeElement) return;
      const sd = f.softDefault(view);
      el.value = sd || "";
    });
    refreshSeccionalEmail();
    refreshAppointmentStep();
    refreshDvValidation();
  }
  function refreshDvValidation() {
    const dvInput = document.getElementById("fld-6");
    if (!dvInput) return;
    const wrap = dvInput.closest(".field");
    if (!wrap) return;
    // Remove any prior validation note
    const old = wrap.querySelector(".field-note.validation");
    if (old) old.remove();
    dvInput.classList.remove("invalid");
    const nit = state["18"];
    const dv  = state["6"];
    if (!nit || !dv) return;  // nothing to validate yet
    const expected = dianDV(nit);
    if (expected == null) return;
    if (String(expected) !== String(dv).trim()) {
      dvInput.classList.add("invalid");
      const msg = document.createElement("p");
      msg.className = "field-note validation";
      msg.textContent = `DV no coincide con el NIT (esperado: ${expected})`;
      wrap.appendChild(msg);
    }
  }
  function refreshAppointmentStep() {
    const show = APPOINTMENT_SECCIONALES.has(state["12"]);
    const apt = document.getElementById("appointment-step");
    if (apt) apt.hidden = !show;
    const extras = document.getElementById("email-extras");
    if (extras) extras.hidden = !show;
    if (show) {
      const nameEl = document.getElementById("email-subject-name");
      const nitEl  = document.getElementById("email-subject-nit");
      if (nameEl) nameEl.textContent = state["1001"] || "[nombre]";
      if (nitEl)  nitEl.textContent  = state["18"]   || "[NIT]";
    }
  }
  function refreshSeccionalEmail() {
    const emailEl = document.getElementById("seccional-email");
    const noteEl  = document.getElementById("seccional-email-note");
    if (!emailEl) return;
    const seccional = state["12"];
    const email = seccional && SECCIONAL_EMAILS[seccional];
    if (email) {
      emailEl.innerHTML = `<a href="mailto:${email}">${email}</a>`;
      if (noteEl) noteEl.textContent = "";
    } else if (seccional) {
      emailEl.textContent = "(consulte el buzón de la Dirección Seccional correspondiente)";
      if (noteEl) noteEl.textContent = "No hay buzón publicado para esta Dirección Seccional; consulte el listado de buzones de la DIAN antes de radicar.";
    } else {
      emailEl.textContent = "(seleccione una Dirección Seccional)";
      if (noteEl) noteEl.textContent = "";
    }
  }
  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (kind ? " " + kind : "");
    if (msg) clearTimeout(setStatus._t);
    setStatus._t = setTimeout(() => { statusEl.textContent = ""; statusEl.className = "status"; }, 4000);
  }

  // ----------------------------------------------------------------- render
  function renderTabs(tabs) {
    tabs.forEach((tab) => {
      const btn = document.createElement("button");
      btn.className = "tab-button";
      btn.dataset.tab = tab.id;
      btn.textContent = tab.label;
      btn.addEventListener("click", () => setActiveTab(tab.id));
      tabsEl.appendChild(btn);

      const panel = document.createElement("section");
      panel.className = "tab-panel";
      panel.id = "panel-" + tab.id;
      tab.sections.forEach((section) => panel.appendChild(renderSection(section)));
      panelsEl.appendChild(panel);
    });
  }
  function setActiveTab(id) {
    document.querySelectorAll(".tab-button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + id));
  }
  function renderSection(section) {
    if (section.hidden) return document.createComment("hidden section: " + (section.id || section.title));
    if (section.id && UPME_HIDDEN_SECTIONS.has(section.id)) return document.createComment("UPME-hidden: " + section.id);
    const wrap = document.createElement("div");
    wrap.className = "section";
    const locked = section.id && UPME_LOCKED_SECTIONS.has(section.id);
    if (locked) wrap.classList.add("locked");
    const h = document.createElement("h2");
    h.textContent = section.title + (locked ? " (no aplica para UPME)" : "");
    wrap.appendChild(h);
    if (section.intro) {
      const p = document.createElement("p");
      p.className = "section-intro";
      p.textContent = section.intro;
      wrap.appendChild(p);
    }
    if (locked) {
      const p = document.createElement("p");
      p.className = "section-intro";
      p.textContent = "Esta sección se deja en blanco para la solicitud UPME.";
      wrap.appendChild(p);
    }
    const grid = document.createElement("div");
    grid.className = "grid";
    section.fields.forEach((f) => {
      if (f.hidden) return;
      if (f.type === "row") {
        const row = document.createElement("div");
        row.className = "field-row";
        f.fields.forEach((sub) => {
          if (sub.hidden) return;
          row.appendChild(renderField(sub, { sectionLocked: locked }));
        });
        grid.appendChild(row);
      } else {
        grid.appendChild(renderField(f, { sectionLocked: locked }));
      }
    });
    wrap.appendChild(grid);
    return wrap;
  }
  function renderField(f, opts) {
    opts = opts || {};
    const hasDefault = Object.prototype.hasOwnProperty.call(UPME_DEFAULTS, f.key);
    const isDerived = typeof f.derived === "function";
    const locked = opts.sectionLocked || hasDefault || isDerived;

    const wrap = document.createElement("div");
    wrap.className = "field" + (f.short ? " short" : "") + (f.type === "checkbox" ? " checkbox" : "") + (f.type === "textarea" ? " full" : "");
    if (locked) wrap.classList.add("locked");
    const lab = document.createElement("label");
    lab.textContent = f.label + (hasDefault || isDerived ? " (automático)" : "");
    lab.htmlFor = "fld-" + f.key;

    let input;
    if (f.type === "checkbox") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = hasDefault ? !!UPME_DEFAULTS[f.key] : !!state[f.key];
      if (locked) input.disabled = true;
      wrap.appendChild(input);
      wrap.appendChild(lab);
      if (!locked) input.addEventListener("change", () => { state[f.key] = input.checked; saveState(); });
      input.id = lab.htmlFor;
      return wrap;
    } else if (f.type === "select") {
      input = document.createElement("select");
      f.options.forEach(([val, label]) => {
        const o = document.createElement("option");
        o.value = val; o.textContent = label;
        input.appendChild(o);
      });
    } else if (f.type === "textarea") {
      input = document.createElement("textarea");
    } else if (f.type === "date") {
      // Splits into _yyyy / _mm / _dd sub-keys to match the PDF widget layout.
      input = document.createElement("input");
      input.type = "date";
      input.dataset.split = "1";
      input.lang = "en-US";
    } else if (f.type === "date_mdy") {
      // MM/DD/YYYY masked text input. Splits into _yyyy / _mm / _dd like type=date.
      input = document.createElement("input");
      input.type = "text";
      input.placeholder = "MM/DD/YYYY";
      input.inputMode = "numeric";
      input.maxLength = 10;
      input.dataset.mdy = "1";
    } else if (f.type === "date_iso") {
      // Single ISO date, stored as-is (used by dj_* fields, not by 010 widgets).
      input = document.createElement("input");
      input.type = "date";
      input.lang = "en-US";
    } else if (f.type === "email") {
      input = document.createElement("input");
      input.type = "email";
    } else {
      input = document.createElement("input");
      input.type = "text";
    }
    input.id = lab.htmlFor;
    if (locked) input.disabled = true;

    // Restore value (defaults win for UPME-defaulted fields; locked sections stay blank).
    if (hasDefault) {
      input.value = UPME_DEFAULTS[f.key];
    } else if (isDerived) {
      const dv = f.derived(state) || "";
      input.value = f.format === "cop" ? formatCop(dv) : dv;
    } else if (opts.sectionLocked) {
      input.value = "";
    } else if (f.type === "date" && input.dataset.split) {
      const y = state[f.key + "_yyyy"], m = state[f.key + "_mm"], d = state[f.key + "_dd"];
      if (y && m && d) input.value = `${y.padStart(4,"0")}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    } else if (f.type === "date_mdy") {
      const y = state[f.key + "_yyyy"], m = state[f.key + "_mm"], d = state[f.key + "_dd"];
      if (y && m && d) input.value = `${m.padStart(2,"0")}/${d.padStart(2,"0")}/${y.padStart(4,"0")}`;
    } else if (state[f.key] != null) {
      input.value = f.format === "cop" ? formatCop(state[f.key]) : state[f.key];
    }

    // Soft-default: pre-populate the displayed value (but not state) from a
    // computed source when the user hasn't entered anything. Stays editable.
    if (typeof f.softDefault === "function" && !state[f.key] && !locked) {
      const sd = f.softDefault(state);
      if (sd) input.value = sd;
    }

    if (!locked) {
      input.addEventListener("input", () => {
        if (f.type === "date" && input.dataset.split) {
          const v = input.value;  // "YYYY-MM-DD" or ""
          if (v) {
            const [y, m, d] = v.split("-");
            state[f.key + "_yyyy"] = y; state[f.key + "_mm"] = m; state[f.key + "_dd"] = d;
          } else {
            delete state[f.key + "_yyyy"]; delete state[f.key + "_mm"]; delete state[f.key + "_dd"];
          }
        } else if (f.type === "date_mdy") {
          // Auto-insert slashes after MM and DD as user types.
          const digits = input.value.replace(/\D/g, "").slice(0, 8);
          let v = digits;
          if (digits.length >= 5)      v = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
          else if (digits.length >= 3) v = `${digits.slice(0,2)}/${digits.slice(2)}`;
          input.value = v;
          const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (m) {
            state[f.key + "_mm"] = m[1]; state[f.key + "_dd"] = m[2]; state[f.key + "_yyyy"] = m[3];
          } else {
            delete state[f.key + "_yyyy"]; delete state[f.key + "_mm"]; delete state[f.key + "_dd"];
          }
        } else if (f.format === "cop") {
          const raw = parseCopToRaw(input.value);
          if (raw === "") delete state[f.key];
          else state[f.key] = raw;
        } else {
          if (input.value === "") delete state[f.key];
          else state[f.key] = input.value;
        }
        saveState();
      });
      if (f.format === "cop") {
        input.addEventListener("blur", () => {
          if (input.value) input.value = formatCop(parseCopToRaw(input.value));
        });
        input.addEventListener("focus", () => {
          if (input.value) input.value = parseCopToRaw(input.value);
        });
      }
    }

    wrap.appendChild(lab);
    wrap.appendChild(input);
    if (f.note) {
      const note = document.createElement("p");
      note.className = "field-note";
      note.textContent = f.note;
      wrap.appendChild(note);
    }
    return wrap;
  }

  function restoreInputs() {
    // Inputs already populate from state during renderField; this is a no-op
    // hook kept in case we add imports/exports later. Update the status.
    const filled = Object.values(state).filter((v) => v !== "" && v != null && v !== false).length;
    if (filled > 0) setStatus(`Restaurados ${filled} campos desde almacenamiento local`, "good");
  }

  // -------------------------------------------------------------- downloads
  async function onDownload010() {
    try {
      setStatus("Generando 010...");
      const bytes = await window.fillForm010(state);
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "010.pdf");
      setStatus("010 descargado", "good");
    } catch (e) {
      console.error(e);
      setStatus("Error generando 010: " + e.message, "warn");
    }
  }
  async function onDownloadDeclaracion() {
    try {
      setStatus("Generando Declaración Juramentada...");
      const bytes = await window.buildDeclaracion(state);
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "declaracion-juramentada.pdf");
      setStatus("Declaración descargada", "good");
    } catch (e) {
      console.error(e);
      setStatus("Error generando Declaración: " + e.message, "warn");
    }
  }
  function onClear() {
    if (!confirm("¿Borrar todos los datos del formulario? Esta acción no se puede deshacer.")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
})();
