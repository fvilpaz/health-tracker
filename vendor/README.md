# vendor/ — librerías de terceros, servidas desde aquí

No se cargan de un CDN: así ningún servidor ajeno puede cambiar el código que se ejecuta
con tus datos de salud, la app funciona sin conexión desde el primer uso y la CSP puede
permitir solo código de este sitio (`script-src 'self'`).

| Archivo | Versión | Licencia | Origen verificado |
|---|---|---|---|
| `chart.umd.js` | Chart.js 4.4.0 | MIT (`chart.LICENSE.md`) | paquete npm `chart.js@4.4.0`, sha512 = el `dist.integrity` del registro |
| `pdfjs/pdf.min.mjs`, `pdfjs/pdf.worker.min.mjs` | pdf.js 4.10.38 | Apache-2.0 (`pdfjs/LICENSE`) | paquete npm `pdfjs-dist@4.10.38`, sha512 = el `dist.integrity` del registro |
| `inter/inter-latin-wght-normal.woff2` | Inter variable (Fontsource 5.3.0), subconjunto latino | OFL-1.1 (`inter/LICENSE`) | paquete npm `@fontsource-variable/inter@5.3.0`, sha512 = el `dist.integrity` del registro |

Para actualizar una: bajar el `.tgz` del registro npm, comprobar su sha512 con el `dist.integrity`
de `https://registry.npmjs.org/<paquete>/<versión>`, y copiar el archivo. No editarlos a mano.
