// Signature pad widget. Wraps the vendored signature_pad library, keeps the
// canvas crisp on HiDPI screens, restores a saved signature, and exports a
// tightly-cropped transparent PNG (data URL) for embedding into the PDFs.
(function () {
  "use strict";

  // Pixels of transparent padding kept around the cropped signature.
  const TRIM_PAD = 6;
  // Alpha threshold (0-255) above which a pixel counts as "ink".
  const INK_ALPHA = 8;

  function createSignatureField(opts) {
    opts = opts || {};
    const onChange = typeof opts.onChange === "function" ? opts.onChange : function () {};

    const root = document.createElement("div");
    root.className = "signature-widget";

    const canvas = document.createElement("canvas");
    canvas.className = "signature-canvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Área para dibujar la firma");
    root.appendChild(canvas);

    const actions = document.createElement("div");
    actions.className = "signature-actions";
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "ghost";
    clearBtn.textContent = "Borrar firma";
    const hint = document.createElement("span");
    hint.className = "signature-hint";
    hint.textContent = "Dibuje su firma con el ratón, el dedo o un lápiz táctil.";
    actions.appendChild(clearBtn);
    actions.appendChild(hint);
    root.appendChild(actions);

    const SignaturePad = window.SignaturePad;
    if (typeof SignaturePad !== "function") {
      hint.textContent = "El componente de firma no está disponible en este navegador.";
      clearBtn.disabled = true;
      return root;
    }

    const pad = new SignaturePad(canvas, {
      penColor: "#101828",
      minWidth: 0.7,
      maxWidth: 2.2,
      // Transparent so the exported PNG overlays the form artwork cleanly.
      backgroundColor: "rgba(0,0,0,0)",
    });

    // Last saved (trimmed) PNG data URL. Source of truth for redraws.
    let current = opts.initialDataUrl || "";

    // Match the canvas bitmap to its CSS box × devicePixelRatio so strokes are
    // sharp. Setting width/height resets the bitmap and its transform, so the
    // saved signature is redrawn afterwards.
    function fitCanvas() {
      const cssW = canvas.offsetWidth, cssH = canvas.offsetHeight;
      if (!cssW || !cssH) return;  // not laid out yet (detached or hidden)
      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").scale(dpr, dpr);
      pad.clear();
      redraw();
    }

    // Draw `current` centred in the canvas, at its original on-screen size
    // when it fits, otherwise scaled down to fit. Coordinates are CSS px.
    function redraw() {
      if (!current) return;
      const cssW = canvas.offsetWidth, cssH = canvas.offsetHeight;
      if (!cssW || !cssH) return;
      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      const img = new Image();
      img.onload = function () {
        const m = 8;  // inset so the signature never touches the border
        const s = Math.min((cssW - 2 * m) / img.width, (cssH - 2 * m) / img.height, 1 / dpr);
        const w = img.width * s, h = img.height * s;
        pad.fromDataURL(current, {
          width: w, height: h,
          xOffset: (cssW - w) / 2, yOffset: (cssH - h) / 2,
        }).catch(function (e) { console.warn("signature: no se pudo restaurar", e); });
      };
      img.src = current;
    }

    pad.addEventListener("endStroke", function () {
      current = trimToPng(canvas);
      onChange(current);
    });
    clearBtn.addEventListener("click", function () {
      pad.clear();
      current = "";
      onChange("");
    });

    // The widget is built detached from the DOM; size it once it has a layout
    // box and again whenever that box changes (viewport resize, tab switch).
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(function () { fitCanvas(); }).observe(canvas);
    } else {
      window.addEventListener("resize", fitCanvas);
      requestAnimationFrame(fitCanvas);
    }

    return root;
  }

  // Crop the canvas to the bounding box of its opaque pixels (plus padding)
  // and return a PNG data URL. Returns "" when nothing has been drawn.
  function trimToPng(canvas) {
    const w = canvas.width, h = canvas.height;
    if (!w || !h) return "";
    const data = canvas.getContext("2d").getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        if (data[row + x * 4 + 3] > INK_ALPHA) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return "";
    minX = Math.max(0, minX - TRIM_PAD);
    minY = Math.max(0, minY - TRIM_PAD);
    maxX = Math.min(w - 1, maxX + TRIM_PAD);
    maxY = Math.min(h - 1, maxY + TRIM_PAD);
    const out = document.createElement("canvas");
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext("2d").drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  }

  window.createSignatureField = createSignatureField;
})();
