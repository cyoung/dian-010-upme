"""
Inline src/, vendor/pdf-lib.min.js, and the 010-fillable.pdf template into a
single distributable HTML file (index.html) that runs entirely offline and
is served at the root URL by GitHub Pages.

Usage:
    python3 build.py
"""
from __future__ import annotations

import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
VENDOR = ROOT / "vendor"
# Name `index.html` so GitHub Pages serves it at the repo's Pages root URL.
OUT = ROOT / "index.html"

TEMPLATE_PDF = ROOT / "010-fillable.pdf"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def embedded_010_js() -> str:
    """JS that defines window.EMBEDDED_010_BYTES from a base64 literal."""
    b64 = base64.b64encode(TEMPLATE_PDF.read_bytes()).decode("ascii")
    return (
        "(function () {\n"
        "  const b64 = \"" + b64 + "\";\n"
        "  const bin = atob(b64);\n"
        "  const bytes = new Uint8Array(bin.length);\n"
        "  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);\n"
        "  window.EMBEDDED_010_BYTES = bytes;\n"
        "})();\n"
    )


def main() -> None:
    for required in [
        SRC / "index.html",
        SRC / "styles.css",
        SRC / "app.js",
        SRC / "fields-model.js",
        SRC / "upme-defaults.js",
        SRC / "pdf-010.js",
        SRC / "pdf-declaracion.js",
        VENDOR / "pdf-lib.min.js",
        TEMPLATE_PDF,
    ]:
        if not required.exists():
            raise SystemExit(f"missing required input: {required}")

    html = read(SRC / "index.html")

    replacements = {
        "/*__STYLES__*/":          read(SRC / "styles.css"),
        "/*__PDFLIB__*/":          read(VENDOR / "pdf-lib.min.js"),
        "/*__EMBEDDED_010__*/":    embedded_010_js(),
        "/*__FIELDS_MODEL__*/":    read(SRC / "fields-model.js"),
        "/*__UPME_DEFAULTS__*/":   read(SRC / "upme-defaults.js"),
        "/*__PDF_010__*/":         read(SRC / "pdf-010.js"),
        "/*__PDF_DECLARACION__*/": read(SRC / "pdf-declaracion.js"),
        "/*__APP__*/":             read(SRC / "app.js"),
    }
    for marker, content in replacements.items():
        if marker not in html:
            raise SystemExit(f"placeholder {marker!r} not found in index.html")
        html = html.replace(marker, content)

    OUT.write_bytes(html.encode("utf-8"))
    size_kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT.relative_to(ROOT)}  ({size_kb:,.1f} KB)")


if __name__ == "__main__":
    main()
