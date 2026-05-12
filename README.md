# DIAN 010 + Declaración Juramentada — generador local

Herramienta web 100% del lado del cliente para preparar la solicitud de
devolución del IVA pagado en la adquisición de vehículos eléctricos
certificados por la UPME. Genera, sin enviar datos a ningún servidor:

- **Formulario 010 lleno** (PDF) — listo para imprimir y firmar.
- **Declaración Juramentada** (PDF) — construida desde cero según el modelo
  CONCEPTO-000673-int-0063 de UPME / DIAN.

El sitio se publica como página estática vía **GitHub Pages**:
<https://cyoung.github.io/dian-010-upme/>

## Privacidad

Toda la lógica corre en el navegador. Los datos del formulario se guardan
únicamente en `localStorage` bajo la clave `dian-form-data`. No hay
peticiones de red en tiempo de uso (compruebe la pestaña Network del
navegador). El archivo distribuible `index.html` es autocontenido — puede
descargarse y abrirse sin conexión.

## Estructura

```
.
├── index.html                      <- distribuible generado (servido por GitHub Pages)
├── build.py                        <- empaqueta src/ + vendor/ + plantilla en index.html
├── 010-fillable.pdf                <- plantilla AcroForm del 010
├── declaracion_juramentada_*.docx  <- referencia de maquetación (no usado en runtime)
├── src/                            <- fuentes editables
│   ├── index.html                  <- esqueleto HTML con marcadores /*__…__*/
│   ├── styles.css
│   ├── app.js                      <- renderizado, estado, localStorage, validaciones
│   ├── fields-model.js             <- estructura del formulario
│   ├── upme-defaults.js            <- valores fijos para solicitudes UPME
│   ├── pdf-010.js                  <- llena el AcroForm del 010
│   └── pdf-declaracion.js          <- dibuja la Declaración Juramentada
└── vendor/
    └── pdf-lib.min.js              <- pdf-lib 1.17.1 (MIT)
```

## Build local

Requiere sólo Python 3 (no hay dependencias).

```bash
python3 build.py
# wrote index.html  (~1.2 MB)
```

Abra `index.html` en cualquier navegador moderno (doble clic funciona).

## Despliegue

GitHub Pages está configurado para servir desde la rama `main`, raíz `/`.
Cualquier push a `main` actualiza el sitio publicado en 1–2 minutos.

Al modificar `src/`:

1. Edite los archivos en `src/`.
2. Ejecute `python3 build.py` para regenerar `index.html`.
3. Commit + push de `src/` **y** del nuevo `index.html`.

### Habilitar GitHub Pages (una sola vez)

En GitHub: **Settings → Pages → Build and deployment**

- **Source:** Deploy from a branch
- **Branch:** `main` / `/` (root)
- Guardar. El sitio aparecerá en unos minutos en
  `https://cyoung.github.io/dian-010-upme/`.

## Licencia / créditos

Código original © 2026 Christopher Young. La plantilla del Formulario 010
es propiedad de la DIAN (Dirección de Impuestos y Aduanas Nacionales,
Colombia).
