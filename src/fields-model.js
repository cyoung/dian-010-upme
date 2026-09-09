// Form structure for the DIAN 010 + Declaración Juramentada builder.
// Keys match widget names in 010-fillable.pdf (without the f_ prefix),
// so persisted state JSON is interchangeable with the Python tool.
(function (global) {
  "use strict";

  const HEADER_FIELDS = new Set(["4","6","7","8","9","10","11","12","14","18","20"]);
  const CHECKBOX_FIELDS = new Set(["85"]);

  // Code-list options for select fields. Empty first entry = blank.
  // Casilla 20 / 45 / 60 / 1002 — "TIPOS DE DOCUMENTO" table, DIAN 010
  // instructions p. 4 (identical tables on pp. 7-8 for casillas 60 and 79).
  const TIPO_DOC = [
    ["", "-- seleccione --"],
    ["11", "11 — Registro civil de nacimiento"],
    ["12", "12 — Tarjeta de identidad"],
    ["13", "13 — Cédula de ciudadanía"],
    ["14", "14 — Certificado Registraduría sin identificación"],
    ["22", "22 — Cédula de extranjería"],
    ["31", "31 — NIT"],
    ["33", "33 — Identificación extranjeros diferente a NIT asignado DIAN"],
    ["41", "41 — Pasaporte"],
    ["42", "42 — Documento de identificación extranjero"],
    ["43", "43 — Sin identificación del exterior o para uso definido DIAN"],
    ["48", "48 — Permiso por Protección Temporal - PPT"],
    ["61", "61 — Patrimonio autónomo"],
  ];
  // Casilla 2 — "CONCEPTO DEVOLUCIÓN" table, DIAN 010 instructions p. 4.
  const CONCEPTO = [
    ["", "-- seleccione --"],
    ["1", "1 — Saldos a favor"],
    ["2", "2 — Pago en exceso"],
    ["3", "3 — Pago de lo no debido"],
    ["4", "4 — Retención renta: acuerdo de reestructuración o concordatario"],
    ["5", "5 — Retención renta en exceso: dividendos y participaciones"],
    ["6", "6 — IVA pagado en materiales de construcción"],
    ["7", "7 — IVA e INC diplomáticos, organismos internacionales y misiones"],
    ["8", "8 — IVA pagado por instituciones estatales de educación superior"],
  ];
  const TIPO_CUENTA = [
    ["", "-- seleccione --"],
    ["AHORROS",  "Ahorros"],
    ["CORRIENTE","Corriente"],
  ];  // casilla 43: "ahorro o corriente" only (DIAN 010 instructions p. 5)
  const TIPO_SOLICITUD = [
    ["", "-- seleccione --"],
    ["A solicitud de parte", "A solicitud de parte"],
    ["De oficio",            "De oficio"],
  ];
  // Dirección Seccional — casilla 12. Mirrors the "CASILLA 12 - DIRECCIONES
  // SECCIONALES" table in the current DIAN 010 instructions (pp. 4-5 of
  // 010-fillable.pdf), sorted alphabetically for the dropdown.
  // Entry = [value written to the PDF, label shown in the UI, DIAN code].
  // Value = short form that fits the PDF cell; label = full DIAN name.
  const SECCIONAL_TABLE = [
    ["Impuestos y Aduanas de Arauca",            "Dirección Seccional de Impuestos y Aduanas de Arauca",          "34"],
    ["Impuestos y Aduanas de Armenia",           "Dirección Seccional de Impuestos y Aduanas de Armenia",         "1"],
    ["Impuestos y Aduanas de Barrancabermeja",   "Dirección Seccional de Impuestos y Aduanas de Barrancabermeja", "29"],
    ["Impuestos de Barranquilla",                "Dirección Seccional de Impuestos de Barranquilla",              "2"],
    ["Impuestos de Bogotá",                      "Dirección Seccional de Impuestos de Bogotá",                    "32"],
    ["Impuestos y Aduanas de Bucaramanga",       "Dirección Seccional de Impuestos y Aduanas de Bucaramanga",     "4"],
    ["Impuestos y Aduanas de Buenaventura",      "Dirección Seccional de Impuestos y Aduanas de Buenaventura",    "35"],
    ["Impuestos de Cali",                        "Dirección Seccional de Impuestos de Cali",                      "5"],
    ["Impuestos de Cartagena",                   "Dirección Seccional de Impuestos de Cartagena",                 "6"],
    ["Impuestos de Cúcuta",                      "Dirección Seccional de Impuestos de Cúcuta",                    "7"],
    ["Impuestos y Aduanas de Florencia",         "Dirección Seccional de Impuestos y Aduanas de Florencia",       "28"],
    ["Impuestos y Aduanas de Girardot",          "Dirección Seccional de Impuestos y Aduanas de Girardot",        "8"],
    ["Operativa de Grandes Contribuyentes",      "Dirección Operativa de Grandes Contribuyentes",                 "31"],
    ["Impuestos y Aduanas de Ibagué",            "Dirección Seccional de Impuestos y Aduanas de Ibagué",          "9"],
    ["Impuestos y Aduanas de Leticia",           "Dirección Seccional de Impuestos y Aduanas de Leticia",         "38"],
    ["Impuestos y Aduanas de Manizales",         "Dirección Seccional de Impuestos y Aduanas de Manizales",       "10"],
    ["Impuestos de Medellín",                    "Dirección Seccional de Impuestos de Medellín",                  "11"],
    ["Impuestos y Aduanas de Montería",          "Dirección Seccional de Impuestos y Aduanas de Montería",        "12"],
    ["Impuestos y Aduanas de Neiva",             "Dirección Seccional de Impuestos y Aduanas de Neiva",           "13"],
    ["Impuestos y Aduanas de Palmira",           "Dirección Seccional de Impuestos y Aduanas de Palmira",         "15"],
    ["Impuestos y Aduanas de Pasto",             "Dirección Seccional de Impuestos y Aduanas de Pasto",           "14"],
    ["Impuestos y Aduanas de Pereira",           "Dirección Seccional de Impuestos y Aduanas de Pereira",         "16"],
    ["Impuestos y Aduanas de Popayán",           "Dirección Seccional de Impuestos y Aduanas de Popayán",         "17"],
    ["Impuestos y Aduanas de Puerto Asís",       "Dirección Seccional de Impuestos y Aduanas de Puerto Asís",     "46"],
    ["Impuestos y Aduanas de Quibdó",            "Dirección Seccional de Impuestos y Aduanas de Quibdó",          "18"],
    ["Impuestos y Aduanas de Riohacha",          "Dirección Seccional de Impuestos y Aduanas de Riohacha",        "25"],
    ["Impuestos y Aduanas de San Andrés",        "Dirección Seccional de Impuestos y Aduanas de San Andrés",      "27"],
    ["Impuestos y Aduanas de Santa Marta",       "Dirección Seccional de Impuestos y Aduanas de Santa Marta",     "19"],
    ["Impuestos y Aduanas de Sincelejo",         "Dirección Seccional de Impuestos y Aduanas de Sincelejo",       "23"],
    ["Impuestos y Aduanas de Sogamoso",          "Dirección Seccional de Impuestos y Aduanas de Sogamoso",        "26"],
    ["Impuestos y Aduanas de Tuluá",             "Dirección Seccional de Impuestos y Aduanas de Tuluá",           "21"],
    ["Impuestos y Aduanas de Tunja",             "Dirección Seccional de Impuestos y Aduanas de Tunja",           "20"],
    ["Impuestos y Aduanas de Valledupar",        "Dirección Seccional de Impuestos y Aduanas de Valledupar",      "24"],
    ["Impuestos y Aduanas de Villavicencio",     "Dirección Seccional de Impuestos y Aduanas de Villavicencio",   "22"],
    ["Impuestos y Aduanas de Yopal",             "Dirección Seccional de Impuestos y Aduanas de Yopal",           "44"],
  ];
  // Dropdown options ([value, label]) and value -> DIAN code lookup.
  const SECCIONAL = [["", "-- seleccione --"], ...SECCIONAL_TABLE.map(([v, l]) => [v, l])];
  const SECCIONAL_CODES = Object.fromEntries(SECCIONAL_TABLE.map(([v, , c]) => [v, c]));

  // Direcciones Seccionales Delegadas that appeared in the OLD 010 instructions
  // but are absent from the current casilla 12 table. Kept for reference only;
  // NOT offered in the dropdown. If an applicant's RUT names one of these, the
  // competent (parent) seccional is unresolved — see docs/open-questions.md.
  const SECCIONAL_DELEGADAS_ORPHANED = [
    ["Delegada de Tumaco",                       "Dirección Seccional Delegada de Tumaco"],
    ["Delegada de Pamplona",                     "Dirección Seccional Delegada de Pamplona"],
    ["Delegada de San José del Guaviare",        "Dirección Seccional Delegada de San José del Guaviare"],
    ["Delegada de Inírida",                      "Dirección Seccional Delegada de Impuestos y Aduanas de Inírida"],
    ["Delegada de Mitú",                         "Dirección Seccional Delegada de Mitú"],
    ["Delegada de Puerto Carreño",               "Dirección Seccional Delegada de Puerto Carreño"],
  ];
  // Buzones for manual radicación of refund requests, by seccional short-form value.
  // Source: dian.gov.co/Prensa/Documents/Buzones_recepcion_solicitudes_devolucion_manual.pdf
  // Bogotá has two buzones (naturales / jurídicas); for UPME EV refunds the
  // applicant is typically a natural person, so we use the naturales buzón.
  // Puerto Asís (new in the current DIAN table) has no published buzón yet,
  // so it is omitted (UI shows a fallback note).
  const SECCIONAL_EMAILS = {
    "Impuestos y Aduanas de Armenia":          "dsia_armenia_devoluciones@dian.gov.co",
    "Impuestos de Barranquilla":                "dsi_barranquilla_devoluciones@dian.gov.co",
    "Impuestos de Bogotá":                      "dsi_bogota_recaudo_naturales@dian.gov.co",
    "Impuestos y Aduanas de Bucaramanga":       "dsia_bucaramanga_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Buenaventura":      "dsia_buenaventura_devoluciones@dian.gov.co",
    "Impuestos de Cali":                        "dsi_cali_devoluciones@dian.gov.co",
    "Impuestos de Cartagena":                   "dsi_cartagena_devoluciones@dian.gov.co",
    "Impuestos de Cúcuta":                      "dsi_cucuta_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Arauca":            "dsia_arauca_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Barrancabermeja":   "dsia_barrancabermeja_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Florencia":         "dsia_florencia_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Girardot":          "dsia_girardot_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Ibagué":            "dsia_ibague_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Leticia":           "dsia_leticia_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Manizales":         "dsia_manizales_devoluciones@dian.gov.co",
    "Impuestos de Medellín":                    "dsi_medellin_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Montería":          "dsia_monteria_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Neiva":             "dsia_neiva_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Palmira":           "dsia_palmira_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Pasto":             "dsia_pasto_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Pereira":           "dsia_pereira_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Popayán":           "dsia_popayan_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Quibdó":            "dsia_quibdo_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Riohacha":          "dsia_riohacha_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de San Andrés":        "dsia_sanandres_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Santa Marta":       "dsia_stamarta_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Sincelejo":         "dsia_sincelejo_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Sogamoso":          "dsia_sogamoso_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Tuluá":             "dsia_tulua_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Tunja":             "dsia_tunja_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Valledupar":        "dsia_valledupar_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Villavicencio":     "dsia_villavicencio_devoluciones@dian.gov.co",
    "Impuestos y Aduanas de Yopal":             "dsia_yopal_devoluciones@dian.gov.co",
    "Operativa de Grandes Contribuyentes":      "dsi_grandesc_devoluciones@dian.gov.co",
  };

  // ---------------------------------------------------------------------------
  // Page 1: Datos del solicitante + Formas de pago + Quien suscribe + Firma
  // ---------------------------------------------------------------------------
  const PAGE1 = {
    id: "p1",
    label: "Página 1",
    sections: [
      {
        id: "concepto",
        title: "Concepto",
        fields: [
          { key: "2", label: "2. Concepto", type: "select", options: CONCEPTO },
          { key: "4", label: "4. Número de formulario", type: "text", hidden: true },
        ],
      },
      {
        id: "solicitante",
        title: "Datos del solicitante",
        fields: [
          { type: "row", fields: [
            { key: "20", label: "20. Tipo de documento", type: "select", options: TIPO_DOC, short: true },
            { key: "18", label: "18. Número de identificación (NIT)", type: "text" },
            { key: "6",  label: "6. DV", type: "text", short: true },
          ]},
          { type: "row", fields: [
            { key: "9",  label: "9. Primer nombre", type: "text" },
            { key: "10", label: "10. Otros nombres", type: "text" },
          ]},
          { type: "row", fields: [
            { key: "7",  label: "7. Primer apellido", type: "text" },
            { key: "8",  label: "8. Segundo apellido", type: "text" },
          ]},
          { key: "11", label: "11. Razón social", type: "text", hidden: true },
          { key: "14", label: "14. Correo electrónico", type: "email" },
          { key: "25", label: "25. Teléfono", type: "text" },
          { key: "24", label: "24. Dirección", type: "text" },
          { type: "row", fields: [
            { key: "26", label: "26. País", type: "text" },
            { key: "27", label: "27. Departamento", type: "text" },
            { key: "28", label: "28. Ciudad / Municipio", type: "text" },
          ]},
          { key: "12", label: "12. Dirección seccional", type: "select", options: SECCIONAL },
          { key: "12_cod", label: "Cód. (12)", type: "text", short: true, hidden: true },
          { key: "26_cod", label: "Cód. (26)", type: "text", short: true, hidden: true },
          { key: "27_cod", label: "Cód. (27)", type: "text", short: true, hidden: true },
          { key: "28_cod", label: "Cód. (28)", type: "text", short: true, hidden: true },
        ],
      },
      {
        id: "condenada",
        title: "Entidad condenada (si aplica)",
        hidden: true,
        fields: [
          { key: "29", label: "29. Razón social entidad condenada", type: "text" },
          { key: "30", label: "30. NIT entidad condenada", type: "text" },
          { key: "31", label: "31. DV", type: "text", short: true },
        ],
      },
      {
        id: "pago",
        title: "Formas de pago",
        fields: [
          // Derived from casilla 49: "TIDIS" above 1.000 UVT, else "Giro cuenta"
          // (DIAN 010 instructions, casilla 40). Resolved at runtime via the
          // helper exported by upme-defaults.js.
          { key: "40", label: "40. Descripción forma de pago", type: "text",
            derived: (s) => (window.UPME_FORMA_PAGO ? window.UPME_FORMA_PAGO(s["49"]) : ""),
            note: "Giro cuenta hasta 1.000 UVT; TIDIS por encima. Se calcula con el valor de la casilla 49." },
          { key: "41", label: "41. Entidad financiera o bancaria", type: "text" },
          { key: "42", label: "42. Número de cuenta", type: "text" },
          { key: "43", label: "43. Tipo de cuenta", type: "select", options: TIPO_CUENTA },
          { key: "44", label: "44. Tipo de solicitud", type: "select", options: TIPO_SOLICITUD },
          { key: "85", label: "85. ¿Con garantía?", type: "checkbox", hidden: true },
          { key: "40_cod", label: "Cód. (40)", type: "text", short: true, hidden: true },
          { key: "41_cod", label: "Cód. (41)", type: "text", short: true, hidden: true },
          { key: "43_cod", label: "Cód. (43)", type: "text", short: true, hidden: true },
          { key: "44_cod", label: "Cód. (44)", type: "text", short: true, hidden: true },
        ],
      },
      {
        id: "suscribe",
        title: "Quien suscribe el documento",
        fields: [
          { key: "1001", label: "1001. Apellidos y nombres", type: "text",
            derived: (s) => [s["7"], s["8"], s["9"], s["10"]].filter(Boolean).join(" ") },
          { key: "1002", label: "1002. Tipo doc.", type: "text", short: true },
          { key: "1003", label: "1003. No. identificación", type: "text",
            derived: (s) => s["18"] || "" },
          { key: "1004", label: "1004. DV", type: "text", short: true,
            derived: (s) => s["6"] || "" },
          { key: "1005", label: "1005. Cód. representación", type: "text", short: true },
          { key: "1006", label: "1006. Organización", type: "text", hidden: true },
          // Drawn signature (PNG data URL). Embedded into the 010 signature box
          // and onto the Declaración's "Firma" line; blank = sign by hand.
          { key: "firma_png", label: "Firma de quien suscribe el documento", type: "signature",
            note: "Se insertará en la casilla de firma del 010 y sobre la línea «Firma» de la Declaración. Déjela vacía si prefiere firmar a mano." },
        ],
      },
      {
        id: "tercero",
        title: "Tercero (si aplica)",
        hidden: true,
        fields: [
          { key: "1007", label: "1007. Apellidos y nombres", type: "text" },
          { key: "1008", label: "1008. Tipo doc.", type: "text", short: true },
          { key: "1009", label: "1009. No. identificación", type: "text",
            derived: (s) => s["18"] || "" },
          { key: "1010", label: "1010. DV", type: "text", short: true,
            derived: (s) => s["6"] || "" },
          { key: "1011", label: "1011. Cód. representación", type: "text", short: true },
          { key: "1012", label: "1012. Organización", type: "text" },
        ],
      },
      {
        id: "firma",
        title: "Firma",
        hidden: true,
        fields: [
          { key: "997", label: "997. Fecha expedición", type: "date", hidden: true },
        ],
      },
    ],
  };

  // ---------------------------------------------------------------------------
  // Page 2: Titular del saldo + 3 saldo rows + Titular compensación + 4 comp rows
  // ---------------------------------------------------------------------------
  function saldoRow(n) {
    return {
      id: `saldo_${n}`,
      title: `Saldo a favor — fila ${n}`,
      fields: [
        { key: `51_${n}`,     label: "51. Concepto saldo", type: "text" },
        { key: `51_${n}_cod`, label: "Cód. (51)", type: "text", short: true, hidden: true },
        { key: `52_${n}`,     label: "52. Año gravable", type: "text", short: true,
          derived: (s) => s[`58_${n}_yyyy`] || "" },
        // Período: fixed "1" (set via UPME_DEFAULTS, not presented to the
        // user). DIAN 010 instructions, annex p. 14 (UPME row): "Para el
        // campo periodo registre 1".
        { key: `53_${n}`,     label: "53. Período", type: "text", short: true, hidden: true },
        { key: `54_${n}`,     label: "54. No. documento o acto administrativo", type: "text", hidden: true },
        { key: `55_${n}`,     label: "55. Número de factura de compra", type: "text" },
        { key: `56_${n}`,     label: "56. Descripción documento de reconocimiento", type: "text", hidden: true },
        { key: `56_${n}_cod`, label: "Cód. (56)", type: "text", short: true, hidden: true },
        // 56 and 57 are "Casilla no diligenciable" for the UPME row (annex p. 14).
        { key: `57_${n}`,     label: "57. Nombre del documento de reconocimiento", type: "text", hidden: true },
        { key: `57_${n}_cod`, label: "Cód. (57)", type: "text", short: true, hidden: true },
        { key: `58_${n}`,     label: "58. Fecha de factura de compra", type: "date_mdy" },
        { key: `59_${n}`,     label: "59. Valor solicitado por origen $", type: "text",
          format: "cop", derived: (s) => s["49"] || "" },
        { key: `60_${n}`,     label: "60. Tipo de documento responsable", type: "text", short: true },
        { key: `60_${n}_cod`, label: "Cód. (60)", type: "text", short: true },
        { key: `61_${n}`,     label: "61. No. identificación responsable", type: "text",
          derived: (s) => s["18"] || "" },
        { key: `62_${n}`,     label: "62. DV", type: "text", short: true,
          derived: (s) => s["6"] || "" },
        { key: `63_${n}`,     label: "63. Nombres y/o razón social responsable", type: "text",
          derived: (s) => [s["9"], s["10"], s["7"], s["8"]].filter(Boolean).join(" ") },
      ],
    };
  }
  function compRow(n) {
    return {
      id: `comp_${n}`,
      title: `Compensación — fila ${n}`,
      fields: [
        { key: `73_${n}`,     label: "73. Tipo obligación", type: "text" },
        { key: `73_${n}_cod`, label: "Cód. (73)", type: "text", short: true },
        { key: `74_${n}`,     label: "74. Año gravable", type: "text", short: true },
        { key: `75_${n}`,     label: "75. Período", type: "text", short: true },
        { key: `76_${n}`,     label: "76. No. declaración o acto administrativo", type: "text" },
        { key: `77_${n}`,     label: "77. Fecha declaración o acto administrativo", type: "date" },
        { key: `78_${n}`,     label: "78. Valor $", type: "text" },
        { key: `79_${n}`,     label: "79. Tipo de documento responsable", type: "text", short: true },
        { key: `79_${n}_cod`, label: "Cód. (79)", type: "text", short: true },
        { key: `80_${n}`,     label: "80. No. identificación responsable", type: "text" },
        { key: `81_${n}`,     label: "81. DV", type: "text", short: true },
        { key: `82_${n}`,     label: "82. Nombres y/o razón social responsable", type: "text" },
      ],
    };
  }
  const PAGE2 = {
    id: "p2",
    label: "Página 2",
    sections: [
      {
        id: "saldo_titular",
        title: "Titular del saldo",
        fields: [
          { key: "45", label: "45. Tipo de documento", type: "text", short: true },
          { key: "45_cod", label: "Cód. (45)", type: "text", short: true },
          { key: "46", label: "46. Número de identificación", type: "text",
            derived: (s) => s["18"] || "" },
          { key: "47", label: "47. DV", type: "text", short: true,
            derived: (s) => s["6"] || "" },
          { key: "48", label: "48. Nombres y/o razón social", type: "text",
            derived: (s) => [s["9"], s["10"], s["7"], s["8"]].filter(Boolean).join(" ") },
          { key: "49", label: "49. Valor solicitado total $", type: "text", format: "cop" },
          { key: "50", label: "50. Tipo obligación", type: "text", hidden: true },
          { key: "50_cod", label: "Cód. (50)", type: "text", short: true, hidden: true },
        ],
      },
      saldoRow(1), saldoRow(2), saldoRow(3),
      {
        id: "comp_titular",
        title: "Titular de la compensación",
        fields: [
          { key: "65", label: "65. Tipo de documento", type: "select", options: TIPO_DOC },
          { key: "65_cod", label: "Cód. (65)", type: "text", short: true },
          { key: "66", label: "66. Número de identificación", type: "text" },
          { key: "67", label: "67. DV", type: "text", short: true },
          { key: "68", label: "68. Nombres y/o razón social", type: "text" },
        ],
      },
      compRow(1), compRow(2), compRow(3), compRow(4),
    ],
  };

  // ---------------------------------------------------------------------------
  // Page 3: Operación que originó el saldo a favor
  // ---------------------------------------------------------------------------
  function exentaRow(n) {
    return [
      { key: `91_${n}`,     label: `91. Concepto exenta — fila ${n}`, type: "text" },
      { key: `91_${n}_cod`, label: `Cód. (91 — fila ${n})`, type: "text", short: true },
      { key: `92_${n}`,     label: `92. Valor solicitado $ — fila ${n}`, type: "text" },
    ];
  }
  function exportRow(n) {
    return [
      { key: `93_${n}`,     label: `93. Concepto exportación — fila ${n}`, type: "text" },
      { key: `93_${n}_cod`, label: `Cód. (93 — fila ${n})`, type: "text", short: true },
      { key: `94_${n}`,     label: `94. Valor solicitado $ — fila ${n}`, type: "text" },
    ];
  }
  const exentaFields = [];
  const exportFields = [];
  for (let n = 1; n <= 15; n++) exentaFields.push(...exentaRow(n));
  for (let n = 1; n <= 15; n++) exportFields.push(...exportRow(n));

  const PAGE3 = {
    id: "p3",
    label: "Página 3",
    sections: [
      {
        id: "clase_op",
        title: "Clase de operación que originó el saldo",
        fields: [
          { key: "88_1",     label: "88. Clase de operación — fila 1", type: "text" },
          { key: "88_1_cod", label: "Cód. (88 — fila 1)", type: "text", short: true },
          { key: "88_2",     label: "88. Clase de operación — fila 2", type: "text" },
          { key: "88_2_cod", label: "Cód. (88 — fila 2)", type: "text", short: true },
          { key: "88_3",     label: "88. Clase de operación — fila 3", type: "text" },
          { key: "88_3_cod", label: "Cód. (88 — fila 3)", type: "text", short: true },
          { key: "88_4",     label: "88. Clase de operación — fila 4", type: "text" },
          { key: "88_4_cod", label: "Cód. (88 — fila 4)", type: "text", short: true },
        ],
      },
      {
        id: "valores",
        title: "Valores principales",
        fields: [
          { key: "89", label: "89. Valor solicitado por devolución IVA retenido $", type: "text" },
          { key: "90", label: "90. Valor solicitado por exceso impuesto descontable $", type: "text" },
          { key: "95", label: "95. Valor IVA por exploración de hidrocarburos $", type: "text" },
        ],
      },
      { id: "exenta",    title: "Operaciones exentas (15 filas)",         fields: exentaFields },
      { id: "exportacion", title: "Operaciones de exportación (15 filas)", fields: exportFields },
    ],
  };

  // ---------------------------------------------------------------------------
  // Page 4 (Declaración Juramentada) — 12 dj_* fields
  // ---------------------------------------------------------------------------
  const DECLARACION = {
    id: "dj",
    label: "Declaración Juramentada",
    sections: [
      {
        id: "dj_main",
        title: "Datos para la Declaración Juramentada",
        intro:
          "Los demás datos (nombre, cédula, dirección, factura, etc.) se toman " +
          "automáticamente de las pestañas anteriores.",
        fields: [
          { key: "dj_tipo_doc", label: "Tipo de documento de identidad", type: "select", options: [
            ["", "-- seleccione --"],
            ["Cédula de ciudadanía",  "Cédula de ciudadanía"],
            ["Cédula de extranjería", "Cédula de extranjería"],
            ["Otro",                   "Otro"],
          ]},
          { key: "dj_doc_num",           label: "Número de documento de identidad", type: "text",
            softDefault: (s) => s["18"] || "" },
          { key: "dj_ciudad_expedicion", label: "Ciudad de expedición del documento", type: "text" },
          { key: "dj_upme_cert_num",     label: "No. del certificado UPME", type: "text" },
          { key: "dj_upme_cert_fecha",   label: "Fecha del certificado UPME", type: "date_iso" },
          { key: "dj_marca",             label: "Marca del vehículo", type: "text" },
          { key: "dj_modelo",            label: "Línea / modelo", type: "text" },
          { key: "dj_anio",              label: "Año modelo", type: "text", short: true },
          { key: "dj_vin",               label: "VIN / número de chasis", type: "text" },
          { key: "dj_placa",             label: "Placa (si aplica)", type: "text", short: true },
          { key: "dj_valor_bien",        label: "Valor del bien antes de IVA $", type: "text", format: "cop" },
          { key: "dj_valor_iva",         label: "Valor del IVA pagado $", type: "text", format: "cop" },
          { key: "dj_descripcion_vehiculo", label: "Descripción del vehículo según factura", type: "textarea" },
          { key: "dj_proveedor_nombre",  label: "Proveedor / vendedor", type: "text",
            softDefault: () => "TESLA MOTORS COLOMBIA, S.A.S." },
          { key: "dj_proveedor_nit",     label: "NIT vendedor", type: "text",
            softDefault: () => "901.789.698" },
          { key: "dj_fecha_firma",       label: "Fecha de la firma", type: "date_iso" },
        ],
      },
    ],
  };

  global.FIELDS_MODEL = { tabs: [PAGE1, PAGE2, PAGE3, DECLARACION] };
  global.HEADER_FIELDS = HEADER_FIELDS;
  global.CHECKBOX_FIELDS = CHECKBOX_FIELDS;
  global.SECCIONAL_EMAILS = SECCIONAL_EMAILS;
  global.SECCIONAL_CODES = SECCIONAL_CODES;
  global.SECCIONAL_DELEGADAS_ORPHANED = SECCIONAL_DELEGADAS_ORPHANED;
})(window);
