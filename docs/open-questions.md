# Open questions: app values vs. the DIAN Formulario 010 instructions

Status as of 2026-09-08. Two sources were compared against what the app writes into the
010 (`src/upme-defaults.js`, `src/fields-model.js`, `src/pdf-010.js`):

- **DIAN instructions**: pages 4–17 of `010-fillable.pdf` (the re-issued instruction pages,
  including "Anexo – Tabla 1", whose UPME row is on page 14).
- **IVAuto guide**: `Guia Devolucion IVA UPME v8.0.pdf` (ivauto.co, 4 Aug 2026), section
  "Cómo llenar el Formulario 010" (pp. 15–16) and the filled example in Anexo A (pp. 17–18).
  The guide notes it aligned its casilla values with real *autos de inadmisión* (v5.5) and a
  DIAN training session (v6.1).

Several earlier defaults came verbally from a DIAN official via Daniel Páez. On 2026-09-08 that
guidance was declared outdated: the printed DIAN instruction sheet is authoritative, and the code
now follows it (see the "App status" column).

## 1. Resolved by the DIAN instructions and confirmed by the guide

| # | Question | Answer | Source | App status |
|---|---|---|---|---|
| 1 | Casilla 2 Concepto: is "Pago de lo no debido" still code 6? | **No. It is code 3.** Code 6 now means IVA on construction materials. | DIAN p. 4 table; guide p. 15; guide Anexo A shows `3`. | **Done 2026-09-08**: default is `3`; `CONCEPTO` list rebuilt from the new table. |
| 2 | Casilla 40 Forma de pago: "Abono a cuenta"? | **No. `Giro cuenta`** (TIDIS only above 1,000 UVT). Guide example writes `GIRO CUENTA`. Cód. left blank. | DIAN p. 5; guide p. 15 and Anexo A. | **Done 2026-09-08**: 40 is now derived (`Giro cuenta` / `TIDIS` by amount, see item 30). |
| 3 | Casilla 50 Tipo de obligación: "IVA UPME"? | **No. `UPME`**, código N/A (blank in the example). | DIAN annex p. 14; guide p. 16 and Anexo A. | **Done 2026-09-08**: `UPME`, Cód. blank. |
| 4 | Casilla 51 Concepto saldo: "Pago de lo no debido - Otros UPME"? | **No. `IVA` with código `175`.** | DIAN annex p. 14; guide p. 16 and Anexo A. | **Done 2026-09-08**: `IVA` / `175`. |
| 5 | Casilla 53 Período: always `1`? | **Yes.** "Para el campo periodo registre 1." The app hardcodes `1` for the single saldo row and never derives it. | DIAN annex p. 14; guide p. 16. | Consistent. |
| 6 | Casilla 52 Año: year of the invoice? | **Yes**, year of emission of the factura electrónica. | DIAN annex p. 14; guide p. 16. | Consistent (derived from 58). |
| 7 | Casilla 54: blank? | **Yes**, "Casilla no diligenciable" / "En blanco". | DIAN annex p. 14; guide p. 16. | Consistent. |
| 8 | Casilla 55: invoice number with or without prefix? | **With prefix** ("número consecutivo incluido el prefijo"; example `PREF-1234`). | DIAN annex p. 14; guide p. 16 and Anexo A. | Consistent; UI label should say "incluido el prefijo". |
| 9 | Casillas 56 and 57: "Factura electrónica" / "Factura de compra"? | **No. Both blank** ("Casilla no diligenciable" / "En blanco"). | DIAN annex p. 14; guide p. 16 and Anexo A. | **Done 2026-09-08**: both blank; field 57 hidden. |
| 10 | Casilla 58: date of the invoice? | **Yes**, fecha de la factura, written as year / month / day in the three sub-boxes. | DIAN annex p. 14; guide p. 16 (AAAA-MM-DD) and Anexo A. | Consistent (app writes `_yyyy`, `_mm`, `_dd`). |
| 11 | Casilla 1002 Tipo doc. of the signer: text "NIT" or code? | **Code `31`** for a persona natural signing with their NIT. | DIAN p. 6; guide Anexo A shows `31`. | **Done 2026-09-08**: `31`. |
| 12 | Casilla 44: "A solicitud de parte"? | **Yes.** | DIAN p. 5; guide p. 15. | Consistent. |
| 13 | Casillas 45 / 60: description + code? | **`NIT` with código `31`** in both. | DIAN pp. 6–7; guide p. 15 and Anexo A. | Consistent. |
| 14 | Casilla 43: is "Tarjeta de crédito internacional" a valid option? | **No.** Only ahorros or corriente. | DIAN p. 5; guide p. 15. | **Done 2026-09-08**: removed. |
| 15 | Hoja 2 header: which casillas repeat? | 20, 18, 6, 7, 8, 9, 10, 11, 12, identical to Hoja 1. | DIAN p. 6; guide p. 16. | Consistent (mirrored via `_p2`). |
| 16 | Hoja 3: fill or leave blank? | **Leave blank.** Applies only to saldos a favor from IVA declarations. Neither source says to physically remove the page. | DIAN p. 8; guide p. 16. | Consistent (tab hidden, page stays in the PDF). |
| 17 | Compensación block (65–82): fill? | Optional. DIAN may compensate outstanding debts de oficio (art. 861 ET). | DIAN p. 7; guide p. 9. | Consistent (hidden). |
| 18 | Casilla 85 Garantía: leave unchecked? | Yes unless filing with a guarantee, which does not apply here. | DIAN p. 5. | Consistent. |

## 2. Resolved only by the guide (not addressed by the DIAN instructions)

| # | Question | Guide answer | App status |
|---|---|---|---|
| 19 | Casilla 1005 Cód. representación: numeric code or description? DIAN prose says "escriba la descripción asociada al código". | Guide's persona jurídica example writes the **numeric code** (`18` for representante legal principal), 1002 = `13`, 1003 = the representative's cédula, 1004 blank, 1006 = razón social. | Only relevant if apoderado / persona jurídica support is added. |
| 20 | Casilla 12: short name or full official name? | **Full name in caps**, e.g. `DIRECCIÓN SECCIONAL DE IMPUESTOS DE BOGOTÁ`, **with its code** in the Cód. box (`32` for Bogotá). "Del RUT". | App writes a short form (`Impuestos de Bogotá`) and leaves Cód. blank. Consider full name + code from the DIAN p. 4–5 table. |
| 21 | Casilla 26–28 codes: leave blank? | Example **fills them**: `COLOMBIA` / `169`, departamento / `11`, ciudad / `001` (DIVIPOLA codes as in the RUT). The guide lists 169 among the fixed values to "copy exactly". | App hides `26_cod`, `27_cod`, `28_cod`. Consider adding País = COLOMBIA / 169 as defaults and letting the user enter dept/city codes from their RUT. |
| 22 | Casillas 14, 24, 25: any format rule? | Must be **exactly as in the RUT** (caps, abbreviations). Any difference is grounds for inadmisión. All email to DIAN must come from the RUT email. | App accepts free text. Add a UI note. |
| 23 | Casilla 49 / 59 number format: `9.500.000` or `9500000`? | Guide text says "sin decimales"; the example writes **`9500000`** with no separators. | App writes `9.500.000` (es-CO grouping). Probably tolerated, but the example uses plain digits. |
| 24 | Casillas 48 / 63 name order? | Example: **apellidos first** (`APELLIDO APELLIDO NOMBRE NOMBRE`), same as 1001. DIAN text says "nombres y apellidos". | App writes nombres first for 48 and 63. Low risk; consider matching the example. |
| 25 | Multiple invoices: one 010 with several saldo rows? | **One solicitud per factura.** DIAN inadmits a single trámite with several invoices. | Consistent (only saldo row 1 is used). |
| 26 | Casilla 18 format? | Guide table says "Del RUT (sin puntos)"; its own example shows `1.234.567`. Internally inconsistent; follow the table (no dots). | App writes what the user types. Consider stripping dots. |

## 3. Still open

| # | Question | Notes |
|---|---|---|
| 27 | Should the output PDF include the blank Hoja 3 and the 14 instruction pages? | **Decided 2026-09-08: yes.** The download keeps the whole 17-page form, blank Hoja 3 and instruction pages included. This is what `fillForm010` already does; no change. |
| 28 | Dirección Seccional Delegadas (Tumaco, Pamplona, San José del Guaviare, Inírida, Mitú, Puerto Carreño). | Dropped from the DIAN casilla 12 table. Unknown whether applicants there select the parent seccional. Guide says "Del RUT" (casilla 12 of the RUT names the seccional). **2026-09-08: dropdown now shows only the 35 offices in the current table** (with DIAN codes in `SECCIONAL_CODES`); the six Delegadas are parked in `SECCIONAL_DELEGADAS_ORPHANED` in `src/fields-model.js` and ignored for now. |
| 29 | Apoderado filing for a persona natural. | DIAN p. 6 describes it (1005 = apoderado especial/general, 1006 = represented person). Guide only covers persona jurídica. The app cannot produce this today; decide whether to support it. |
| 30 | Casilla 40 when the refund exceeds 1,000 UVT (about 52.4 M COP in 2026). | **Implemented 2026-09-08.** Casilla 40 is now derived from casilla 49: `Giro cuenta` up to 1,000 UVT, `TIDIS` above. UVT per year lives in `UVT_BY_YEAR` in `src/upme-defaults.js` (2025: 49,799; 2026: 52,374) and must be extended each January. |
| 31 | Which written value wins when a DIAN desk official disagrees with the printed annex? | **Decided 2026-09-08: the printed 010 instruction sheet wins.** The verbal DIAN guidance relayed by Daniel Páez (casillas 2, 40, 50, 51, 56, 57) is treated as outdated and has been replaced in code by the annex values. |

## Note

The guide's v7.0 changelog (25 Jul 2026) says it removed the link to this tool
(cyoung.github.io) because it was "desactualizada frente al formato vigente y podía inducir
errores de inadmisión", and that it will be re-listed if updated. Items 1–4, 9 and 11 above are
exactly the values that would have caused that.
