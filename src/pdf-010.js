// Fill the embedded 010-fillable.pdf from the user's state, flatten, and
// return raw PDF bytes. Mirrors fill_form.py:70-137.
(function () {
  "use strict";

  async function fillForm010(state) {
    const { PDFDocument } = window.PDFLib;
    const templateBytes = window.EMBEDDED_010_BYTES;
    if (!templateBytes) throw new Error("Template 010 no incrustada");

    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    const headerFields = window.HEADER_FIELDS;
    const checkboxFields = window.CHECKBOX_FIELDS;

    // Build the set of widget names available in the PDF for safe mirroring.
    const widgetNames = new Set(form.getFields().map((f) => f.getName()));

    function setText(widgetName, value) {
      if (!widgetNames.has(widgetName)) return;
      try { form.getTextField(widgetName).setText(String(value)); }
      catch (e) { /* not a text field — skip silently */ }
    }
    function setCheckbox(widgetName, value) {
      if (!widgetNames.has(widgetName)) return;
      try {
        const cb = form.getCheckBox(widgetName);
        if (value) cb.check(); else cb.uncheck();
      } catch (e) { /* not a checkbox — skip */ }
    }

    // Merge UPME defaults — defaults always win for keys they cover.
    const merged = Object.assign({}, state, window.UPME_DEFAULTS || {});

    // Reformat Colombian-currency fields so the PDF widget matches the UI.
    const COP_KEYS = new Set(["49", "59_1", "59_2", "59_3"]);
    const copFmt = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    for (const k of COP_KEYS) {
      if (merged[k] != null && merged[k] !== "") {
        const n = Number(String(merged[k]));
        if (Number.isFinite(n)) merged[k] = copFmt.format(n);
      }
    }

    let setCount = 0;
    for (const [key, rawValue] of Object.entries(merged)) {
      if (key.startsWith("dj_")) continue;                      // Declaración-only
      if (rawValue === "" || rawValue == null) continue;
      const widget = "f_" + key;

      if (checkboxFields.has(key)) {
        setCheckbox(widget, !!rawValue);
        setCount++;
        continue;
      }
      setText(widget, rawValue);
      setCount++;

      // Mirror header fields onto _p2 / _p3 counterparts.
      const base = key.split("_")[0];
      if (headerFields.has(base) && !key.includes("_p")) {
        for (const suf of ["_p2", "_p3"]) {
          setText("f_" + key + suf, rawValue);
        }
      }
    }

    // Flatten — no AcroForm in output. Matches `fill_form.py --flatten`
    // semantics (the appearance streams from setText are baked in).
    form.flatten();

    const out = await pdfDoc.save({ useObjectStreams: false });
    if (window.__DEBUG_010) console.log(`pdf-010: set ${setCount} widgets`);
    return out;
  }

  window.fillForm010 = fillForm010;
})();
