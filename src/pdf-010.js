// Fill the embedded 010-fillable.pdf from the user's state, flatten, and
// return raw PDF bytes. Mirrors fill_form.py:70-137.
(function () {
  "use strict";

  // Blank area of the "Firma de quien suscribe el documento" box on page 1
  // (612×792 pt, origin bottom-left). Measured from the template: block top
  // rule at y=216, header text down to y≈205, left bar to x≈24.5, column
  // separator at x≈308.3, and the 1001 row starting at y≈152. Inset slightly.
  const FIRMA_BOX_010 = { x: 30, y: 156, w: 272, h: 47 };

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

    // Page-suffix mirrors are skipped for any tab listed in UPME_HIDDEN_TABS,
    // so a hidden page is rendered fully blank (no carried-over header fields).
    const hiddenTabs = window.UPME_HIDDEN_TABS || new Set();
    const mirrorSuffixes = ["_p2", "_p3"].filter((s) => !hiddenTabs.has(s.slice(1)));

    // Reformat Colombian-currency fields so the PDF widget matches the UI.
    const COP_KEYS = new Set(["49", "59_1", "59_2", "59_3"]);
    const copFmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
    for (const k of COP_KEYS) {
      if (merged[k] != null && merged[k] !== "") {
        const n = Number(String(merged[k]));
        if (Number.isFinite(n)) merged[k] = copFmt.format(Math.round(n));
      }
    }

    let setCount = 0;
    for (const [key, rawValue] of Object.entries(merged)) {
      if (key.startsWith("dj_")) continue;                      // Declaración-only
      if (key === "firma_png") continue;                        // image, drawn below
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
        for (const suf of mirrorSuffixes) {
          setText("f_" + key + suf, rawValue);
        }
      }
    }

    // Flatten — no AcroForm in output. Matches `fill_form.py --flatten`
    // semantics (the appearance streams from setText are baked in).
    form.flatten();

    // Drawn signature: fit into the signature box, preserving aspect ratio.
    if (state.firma_png) {
      const png = await pdfDoc.embedPng(state.firma_png);
      const b = FIRMA_BOX_010;
      const s = Math.min(b.w / png.width, b.h / png.height);
      const w = png.width * s, h = png.height * s;
      pdfDoc.getPages()[0].drawImage(png, {
        x: b.x + (b.w - w) / 2,
        y: b.y + (b.h - h) / 2,
        width: w,
        height: h,
      });
    }

    const out = await pdfDoc.save({ useObjectStreams: false });
    if (window.__DEBUG_010) console.log(`pdf-010: set ${setCount} widgets`);
    return out;
  }

  window.fillForm010 = fillForm010;
})();
