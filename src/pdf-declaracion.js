// Draw the Declaración Juramentada from scratch using pdf-lib.
// Layout reference: declaracion_juramentada_devolucion_iva_upme_dian.docx
(function () {
  "use strict";

  const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const TIPO_DOC_ABREV = {
    "Cédula de ciudadanía":  "C.C.",
    "Cédula de extranjería": "C.E.",
    "Otro":                   "Documento",
  };

  async function buildDeclaracion(state) {
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const v = resolvePlaceholders(state);

    // Page geometry — A4, conservative margins.
    const PAGE_W = 595.28, PAGE_H = 841.89;
    const MARGIN_X = 64;
    const TOP_Y = PAGE_H - 60;
    const MAX_W = PAGE_W - MARGIN_X * 2;

    const ctx = newCtx(pdfDoc, font, bold, MARGIN_X, TOP_Y, MAX_W, PAGE_W, PAGE_H);

    drawHeading(ctx, "DECLARACIÓN JURAMENTADA");
    drawHeading(ctx, "Solicitud de devolución del IVA pagado en la adquisición de");
    drawHeading(ctx, "vehículo eléctrico certificado por la UPME");
    gap(ctx, 10);

    // Intro paragraph. Placeholders rendered in bold via **...** markers.
    drawPara(ctx,
      `Yo, **${v.nombre}**, mayor de edad, identificado(a) con **${v.tipoDocFull}** ` +
      `No. **${v.cedula}** expedido(a) en **${v.ciudadExpedicion}**, domiciliado(a) en **${v.ciudadDomicilio}**, ` +
      `actuando en nombre propio y en calidad de solicitante de la devolución del IVA pagado en ` +
      `la adquisición de un vehículo eléctrico certificado por la Unidad de Planeación Minero ` +
      `Energética —UPME—, manifiesto bajo la gravedad de juramento lo siguiente:`);
    gap(ctx, 6);

    drawNumbered(ctx, 1, `Que soy persona natural no obligada a llevar contabilidad.`);
    drawNumbered(ctx, 2,
      `Que la factura electrónica relacionada en la solicitud de devolución corresponde a la ` +
      `adquisición del vehículo eléctrico certificado por la UPME, según certificado ` +
      `No. **${v.upmeCertNum}** de fecha **${v.upmeCertFecha}**.`);
    drawNumbered(ctx, 3, `Que el vehículo adquirido corresponde a la información detallada a continuación:`);
    gap(ctx, 4);
    drawTable(ctx, [
      ["Marca",                 v.marca],
      ["Línea / modelo",        v.modelo],
      ["Año modelo",            v.anio],
      ["VIN / número de chasis", v.vin],
      ["Placa, si aplica",      v.placa],
    ]);
    gap(ctx, 6);

    drawNumbered(ctx, 4, `Que la factura electrónica soporte de la adquisición corresponde a la siguiente información:`);
    gap(ctx, 4);
    drawTable(ctx, [
      ["Número de factura, incluido prefijo", v.facturaNum],
      ["Fecha de factura",                    v.facturaFecha],
      ["Proveedor / vendedor",                v.proveedorNombre],
      ["NIT del proveedor",                   v.proveedorNit],
      ["Valor del bien antes de IVA",         v.valorBien],
      ["Valor del IVA pagado",                v.valorIva],
      ["Descripción del bien",                v.descripcionVehiculo],
    ]);
    gap(ctx, 6);

    drawNumbered(ctx, 5,
      `Que no he solicitado ni obtenido previamente devolución o compensación alguna por el IVA ` +
      `pagado en la adquisición del vehículo antes identificado.`);
    drawNumbered(ctx, 6,
      `Que el IVA solicitado en devolución no ha sido tratado como mayor valor del costo, ni como ` +
      `deducción en el impuesto sobre la renta, ni como impuesto descontable en IVA.`);
    drawNumbered(ctx, 7,
      `Que la presente declaración se realiza para efectos de dar cumplimiento a lo indicado en el ` +
      `CONCEPTO-000673-int-0063 del 16 de enero de 2026 UPME / DIAN, en relación con la solicitud ` +
      `de devolución del IVA pagado por la adquisición de vehículos eléctricos o híbridos ` +
      `certificados por la UPME.`);
    gap(ctx, 6);

    drawPara(ctx,
      `Declaro que la información aquí consignada es cierta y verificable, y que entiendo las ` +
      `consecuencias legales derivadas de faltar a la verdad en una declaración rendida bajo la ` +
      `gravedad de juramento.`);
    gap(ctx, 14);

    drawPara(ctx,
      `En constancia, se firma en **${v.ciudadDomicilio}**, a los **${v.firmaDia}** días del mes de ` +
      `**${v.firmaMes}** de **${v.firmaAnio}**.`);
    gap(ctx, 30);

    // Keep the signature line + identity block together on one page.
    ensureSpace(ctx, ctx.lineHeight * 7);
    drawText(ctx, "Firma: _______________________________");
    gap(ctx, 14);
    drawPara(ctx, `**${v.nombre}**`);
    drawPara(ctx, `**${v.tipoDocAbrev}** No. **${v.cedula}** de **${v.ciudadExpedicion}**`);
    drawPara(ctx, `Dirección: **${v.direccion}**`);
    drawPara(ctx, `Teléfono: **${v.telefono}**`);
    drawPara(ctx, `Correo electrónico: **${v.email}**`);

    return await pdfDoc.save();
  }

  // ---------------------------------------------------------- placeholders
  function resolvePlaceholders(s) {
    const dash = "—";
    const v = (k) => (s[k] == null || s[k] === "" ? dash : String(s[k]));
    const nombre = [s["9"], s["10"], s["7"], s["8"]].filter(Boolean).join(" ").trim() || dash;
    const facturaFecha = (s["58_1_dd"] && s["58_1_mm"] && s["58_1_yyyy"])
      ? `${s["58_1_dd"]}/${s["58_1_mm"]}/${s["58_1_yyyy"]}`
      : dash;
    // dj_fecha_firma is ISO YYYY-MM-DD; default to today.
    const isoFirma = s["dj_fecha_firma"] || todayIso();
    const [yF, mF, dF] = isoFirma.split("-");
    const firmaDia = stripLead(dF) || dash;
    const firmaMes = MESES[parseInt(mF, 10) - 1] || dash;
    const firmaAnio = yF || dash;
    // dj_upme_cert_fecha is ISO YYYY-MM-DD, display as DD/MM/YYYY.
    let upmeCertFecha = dash;
    if (s["dj_upme_cert_fecha"]) {
      const [y, m, d] = s["dj_upme_cert_fecha"].split("-");
      if (y && m && d) upmeCertFecha = `${d}/${m}/${y}`;
    }
    const tipoDocFull = s["dj_tipo_doc"] && s["dj_tipo_doc"].trim()
      ? s["dj_tipo_doc"] : "Cédula de ciudadanía";
    const tipoDocAbrev = TIPO_DOC_ABREV[tipoDocFull] || "Documento";
    // The ID number on the actual document can differ from the NIT (field 18).
    // Use dj_doc_num if entered, otherwise fall back to the NIT.
    const cedula = (s["dj_doc_num"] && s["dj_doc_num"].trim()) || s["18"] || dash;
    return {
      nombre,
      cedula,
      tipoDocFull, tipoDocAbrev,
      ciudadExpedicion: v("dj_ciudad_expedicion"),
      ciudadDomicilio:  v("28"),
      upmeCertNum:      v("dj_upme_cert_num"),
      upmeCertFecha,
      marca:            v("dj_marca"),
      modelo:           v("dj_modelo"),
      anio:             v("dj_anio"),
      vin:              v("dj_vin"),
      placa:            v("dj_placa"),
      facturaNum:       v("55_1"),
      facturaFecha,
      proveedorNombre:  v("63_1"),
      proveedorNit:     v("61_1"),
      valorBien:        formatCop(s["dj_valor_bien"]) || dash,
      valorIva:         formatCop(s["dj_valor_iva"]) || dash,
      descripcionVehiculo: v("dj_descripcion_vehiculo"),
      firmaDia, firmaMes, firmaAnio,
      direccion: v("24"),
      telefono:  v("25"),
      email:     v("14"),
    };
  }
  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function stripLead(s) { return s == null ? "" : String(s).replace(/^0+/, "") || "0"; }
  function formatCop(raw) {
    if (raw == null || raw === "") return "";
    const n = Number(String(raw).replace(/[^\d.\-]/g, ""));
    if (!Number.isFinite(n)) return String(raw);
    return "$" + n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---------------------------------------------------------- drawing ctx
  function newCtx(pdfDoc, font, bold, marginX, topY, maxW, pageW, pageH) {
    const ctx = {
      pdfDoc,
      page: pdfDoc.addPage([pageW, pageH]),
      font, bold,
      marginX, topY, maxW, pageW, pageH,
      y: topY,
      size: 11,
      lineHeight: 14,
    };
    return ctx;
  }
  function ensureSpace(ctx, needed) {
    const bottomMargin = 60;
    if (ctx.y - needed < bottomMargin) {
      ctx.page = ctx.pdfDoc.addPage([ctx.pageW, ctx.pageH]);
      ctx.y = ctx.topY;
    }
  }
  function gap(ctx, n) { ctx.y -= n; }

  function drawHeading(ctx, text) {
    ensureSpace(ctx, 18);
    const size = 13;
    const width = ctx.bold.widthOfTextAtSize(text, size);
    const x = ctx.marginX + (ctx.maxW - width) / 2;
    ctx.page.drawText(text, { x, y: ctx.y - size, size, font: ctx.bold });
    ctx.y -= size + 4;
  }
  function drawText(ctx, text, opts) {
    ensureSpace(ctx, ctx.lineHeight);
    const f = (opts && opts.font) || ctx.font;
    ctx.page.drawText(text, { x: ctx.marginX, y: ctx.y - ctx.size, size: ctx.size, font: f });
    ctx.y -= ctx.lineHeight;
  }
  function drawPara(ctx, text) {
    const tokens = tokenizeBold(text, ctx.font, ctx.bold);
    const lines = wrapTokens(tokens, ctx.size, ctx.maxW);
    for (const line of lines) {
      ensureSpace(ctx, ctx.lineHeight);
      drawLineTokens(ctx, ctx.marginX, line);
      ctx.y -= ctx.lineHeight;
    }
  }
  function drawNumbered(ctx, num, text) {
    const indent = 22;
    const numStr = `${num}.`;
    const tokens = tokenizeBold(text, ctx.font, ctx.bold);
    const lines = wrapTokens(tokens, ctx.size, ctx.maxW - indent);
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(ctx, ctx.lineHeight);
      if (i === 0) {
        ctx.page.drawText(numStr, { x: ctx.marginX, y: ctx.y - ctx.size, size: ctx.size, font: ctx.font });
      }
      drawLineTokens(ctx, ctx.marginX + indent, lines[i]);
      ctx.y -= ctx.lineHeight;
    }
  }
  // Parse "**bold**" markers into [{text, font}] tokens, then word-wrap.
  function tokenizeBold(text, regular, bold) {
    const out = [];
    const re = /\*\*([^*]+)\*\*/g;
    let lastIdx = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > lastIdx) splitWords(text.slice(lastIdx, m.index), regular, out);
      splitWords(m[1], bold, out);
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < text.length) splitWords(text.slice(lastIdx), regular, out);
    return out;
  }
  function splitWords(text, font, out) {
    // Keep whitespace as its own tokens so wrapping works.
    const parts = String(text).split(/(\s+)/);
    for (const p of parts) {
      if (p === "") continue;
      out.push({ text: p, font, isSpace: /^\s+$/.test(p) });
    }
  }
  function wrapTokens(tokens, size, maxW) {
    const lines = [[]];
    let lineWidth = 0;
    for (const tok of tokens) {
      const w = tok.font.widthOfTextAtSize(tok.text, size);
      if (!tok.isSpace && lineWidth + w > maxW && lines[lines.length - 1].length > 0) {
        lines.push([]);
        lineWidth = 0;
      }
      if (tok.isSpace && lineWidth === 0) continue;  // skip leading spaces
      lines[lines.length - 1].push(tok);
      lineWidth += w;
    }
    return lines.filter((l) => l.length > 0);
  }
  function drawLineTokens(ctx, x0, line) {
    let x = x0;
    for (const tok of line) {
      ctx.page.drawText(tok.text, { x, y: ctx.y - ctx.size, size: ctx.size, font: tok.font });
      x += tok.font.widthOfTextAtSize(tok.text, ctx.size);
    }
  }
  function drawTable(ctx, rows) {
    const indent = 22;
    const labelW = 220;
    const valueW = ctx.maxW - indent - labelW - 6;
    for (const [label, value] of rows) {
      // Form-filled values render in bold so they stand out from the static text.
      const valLines = wrap(ctx.bold, String(value), ctx.size, valueW);
      const rowH = ctx.lineHeight * Math.max(1, valLines.length);
      ensureSpace(ctx, rowH);
      ctx.page.drawText(label, {
        x: ctx.marginX + indent, y: ctx.y - ctx.size, size: ctx.size, font: ctx.font,
      });
      for (let i = 0; i < valLines.length; i++) {
        ctx.page.drawText(valLines[i], {
          x: ctx.marginX + indent + labelW + 6,
          y: ctx.y - ctx.size - i * ctx.lineHeight,
          size: ctx.size,
          font: ctx.bold,
        });
      }
      ctx.y -= rowH;
    }
  }
  function wrap(font, text, size, maxW) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const candidate = cur ? cur + " " + w : w;
      const width = font.widthOfTextAtSize(candidate, size);
      if (width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = candidate;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }

  window.buildDeclaracion = buildDeclaracion;
})();
