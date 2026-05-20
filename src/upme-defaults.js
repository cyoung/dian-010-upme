// UPME submission defaults for the DIAN Form 010.
//
// These are values that should always be the same when requesting the
// IVA refund for a UPME-certified electric vehicle. They are baked into
// the form (rendered as disabled inputs, never written by the user) and
// merged into the state at PDF generation time.
//
// Also declares which tabs/sections are not used for UPME submissions
// (hidden entirely, or locked and rendered blank).
(function (global) {
  "use strict";

  // Field defaults — keys match 010 widget names (without the f_ prefix).
  // Values are baked into the generated 010 PDF every time.
  const UPME_DEFAULTS = {
    "2":         "6",                                  // Concepto = 6 (Pago de lo no debido)
    "20":        "31",                                 // Tipo doc del solicitante = NIT
    "44":        "A solicitud de parte",               // Tipo de solicitud (sentence case per DIAN example)
    "45":        "NIT",                                // Tipo doc titular del saldo (text per DIAN example)
    "45_cod":    "31",                                 // Cód. tipo doc titular del saldo (NIT=31)
    "50":        "Beneficio Tributario",               // Tipo obligación titular saldo
    "51_1":      "Pago de lo no debido - Otros UPME",  // Concepto saldo, fila 1
    "56_1":      "",                                   // Descripción doc reconocimiento, fila 1
    "57_1":      "Factura de compra",                  // Nombre doc reconocimiento, fila 1
    "60_1":      "NIT",                                // Tipo doc responsable, fila 1 (always NIT for UPME)
    "60_1_cod":  "31",                                 // Cód. tipo doc responsable, fila 1 (NIT=31)
    "1002":      "NIT",                                // Tipo doc del suscribe
    "1005":      "",                                   // Cód. representación del suscribe
  };

  // Human-readable labels for the disabled inputs (so users see what's locked
  // without having to consult the codes table).
  const UPME_DEFAULT_LABELS = {
    "2": "6 — Pago de lo no debido",
  };

  // Tabs hidden entirely for UPME submissions.
  const UPME_HIDDEN_TABS = new Set(["p3"]);

  // Sections hidden entirely (no UI, no values in PDF).
  const UPME_HIDDEN_SECTIONS = new Set([
    "saldo_2",
    "saldo_3",
    "comp_titular",
    "comp_1",
    "comp_2",
    "comp_3",
    "comp_4",
  ]);

  // Sections rendered grayed-out / disabled (visible but not editable).
  // Unused for v1, kept for future flexibility.
  const UPME_LOCKED_SECTIONS = new Set();

  global.UPME_DEFAULTS = UPME_DEFAULTS;
  global.UPME_DEFAULT_LABELS = UPME_DEFAULT_LABELS;
  global.UPME_HIDDEN_TABS = UPME_HIDDEN_TABS;
  global.UPME_HIDDEN_SECTIONS = UPME_HIDDEN_SECTIONS;
  global.UPME_LOCKED_SECTIONS = UPME_LOCKED_SECTIONS;
})(window);
