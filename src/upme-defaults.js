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
  // Values are baked into the generated 010 PDF every time and are NOT
  // presented to the user (the corresponding model fields are hidden).
  //
  // Source — the current DIAN 010 instruction sheet (pages 4-17 of
  // 010-fillable.pdf), in particular the "Anexo - Tabla 1" row for
  // concepto 3 / UPME on page 14. Earlier verbal guidance from a DIAN
  // official (relayed by Daniel Páez, 2026) is superseded by that sheet.
  const UPME_DEFAULTS = {
    "2":         "3",                                  // Concepto 3 = Pago de lo no debido (p. 4 table)
    "20":        "31",                                 // Tipo doc del solicitante = NIT (code)
    // "40" (Forma de pago) is NOT a static default: it is derived from the
    // requested amount (casilla 49) — see UPME_FORMA_PAGO below.
    "44":        "A solicitud de parte",               // Tipo de solicitud (p. 5)
    "45":        "NIT",                                // Tipo doc titular del saldo: descripción (p. 6)
    "45_cod":    "31",                                 // Tipo doc titular del saldo: código (p. 6)
    "50":        "UPME",                               // Tipo obligación (annex p. 14); código N/A → blank
    "51_1":      "IVA",                                // Concepto saldo, fila 1 (annex p. 14)
    "51_1_cod":  "175",                                // Concepto saldo código, fila 1 (annex p. 14)
    "53_1":      "1",                                  // Período: "registre 1" (annex p. 14)
    // 54, 56, 57 (and their Cód. boxes) are "Casilla no diligenciable" for
    // the UPME row (annex p. 14) — intentionally absent so they stay blank.
    "60_1":      "NIT",                                // Tipo doc responsable, fila 1: descripción
    "60_1_cod":  "31",                                 // Tipo doc responsable, fila 1: código (p. 7)
    "1002":      "31",                                 // Tipo doc del suscribe: código per casilla 20 table (p. 6)
    "1005":      "",                                   // Cód. representación: blank when acting a nombre propio (p. 6)
  };

  // Casilla 40 — Descripción forma de pago.
  // DIAN 010 instructions (p. 5): refunds are paid via TIDIS when the amount
  // is above 1.000 UVT, or by "Giro cuenta" (deposit to a bank account)
  // otherwise. UVT is set yearly by DIAN resolution; add each new year here.
  const UVT_BY_YEAR = {
    2025: 49799,
    2026: 52374,
  };
  const TIDIS_THRESHOLD_UVT = 1000;

  function uvtForYear(year) {
    if (UVT_BY_YEAR[year]) return UVT_BY_YEAR[year];
    // Fall back to the latest known year so the rule still applies.
    const years = Object.keys(UVT_BY_YEAR).map(Number).sort((a, b) => b - a);
    return UVT_BY_YEAR[years[0]];
  }

  // Returns "TIDIS" or "Giro cuenta" for a requested amount in COP (string or
  // number, whole pesos). Empty/invalid amounts return "" so nothing is written.
  function formaDePago(valorSolicitado, year) {
    const n = Number(String(valorSolicitado == null ? "" : valorSolicitado).replace(/[^\d]/g, ""));
    if (!Number.isFinite(n) || n <= 0) return "";
    const uvt = uvtForYear(year || new Date().getFullYear());
    return n > TIDIS_THRESHOLD_UVT * uvt ? "TIDIS" : "Giro cuenta";
  }

  // Human-readable labels for the disabled inputs (so users see what's locked
  // without having to consult the codes table).
  const UPME_DEFAULT_LABELS = {
    "2": "3 — Pago de lo no debido",
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
  global.UPME_FORMA_PAGO = formaDePago;
  global.UPME_UVT_BY_YEAR = UVT_BY_YEAR;
})(window);
