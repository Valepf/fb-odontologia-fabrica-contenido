#!/usr/bin/env node
/**
 * Probador de tipografías.
 *
 *   npm run tipografias              → prueba las 16 duplas del catálogo
 *   npm run tipografias premium      → sólo una
 *
 * Renderiza la misma portada con cada dupla, usando los colores reales de la
 * marca, y arma una galería para elegir de un vistazo.
 *
 * La tipografía se elige mirando, no leyendo una descripción. Es la misma
 * regla que el resto del sistema: antes de encolar, se mira la placa.
 *
 * Salida: content-studio/output/_tipografias/
 */

import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

import { CFG, DIR_OUTPUT, DIR_TEMPLATE, encontrarChrome } from "./config.mjs";
import { bajarFamilia, slugFamilia } from "./fuentes.mjs";
import { PARES, PESOS_DISPLAY, PESOS_TEXTO } from "./pares-tipograficos.mjs";
import { documentoHTML } from "../content-studio/template/slides.mjs";

const DIR_PRUEBAS = path.join(DIR_TEMPLATE, "fonts", "pruebas");
const SALIDA = path.join(DIR_OUTPUT, "_tipografias");

/** La misma placa para todas: lo único que cambia es la tipografía. */
const MUESTRA = {
  slug: "01-muestra",
  categoria: CFG.categorias[0],
  slides: [
    {
      tipo: "portada",
      numero: "01",
      titulo: `Así se lee *${CFG.marca}*`,
      bajada:
        "Este es el cuerpo de texto en la segunda tipografía. Mirá cómo respira " +
        "el párrafo y si el titular pega con la marca.",
    },
  ],
  caption: "muestra",
};

const pedido = process.argv[2];
const pares = pedido ? PARES.filter((p) => p.slug === pedido) : PARES;

if (!pares.length) {
  console.error(`No conozco la dupla "${pedido}". Disponibles: ${PARES.map((p) => p.slug).join(", ")}`);
  process.exit(1);
}

const chrome = await encontrarChrome();
if (!chrome) {
  console.error("No encontré Chrome. Pasá la ruta con CHROME_PATH=…");
  process.exit(1);
}

await fs.mkdir(SALIDA, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--allow-file-access-from-files", "--font-render-hinting=none"],
});

const cache = new Map();

/** Una familia se baja una sola vez aunque aparezca en varias duplas. */
async function css(familia, pesos) {
  const clave = `${familia}:${pesos}`;
  if (cache.has(clave)) return cache.get(clave);
  const carpeta = slugFamilia(familia);
  const { css: texto, faltantes } = await bajarFamilia({
    familia,
    pesos,
    destino: path.join(DIR_PRUEBAS, carpeta),
    prefijoURL: `fonts/pruebas/${carpeta}/`,
  });
  cache.set(clave, texto);
  if (faltantes.length) console.log(`  ⚠ ${familia}: sin peso ${faltantes.join(", ")}`);
  return texto;
}

const hechas = [];
const html = documentoHTML(MUESTRA);

for (const par of pares) {
  process.stdout.write(`· ${par.slug.padEnd(15)} ${par.display} + ${par.texto}\n`);

  const fuentes =
    (await css(par.display, PESOS_DISPLAY)) +
    (par.texto === par.display ? "" : await css(par.texto, PESOS_TEXTO));

  const override =
    `<style>${fuentes}\n:root{--display:"${par.display}",sans-serif;` +
    `--texto:"${par.texto}",sans-serif}</style>`;

  const doc = html.replace("</head>", `${override}</head>`);
  const archivo = path.join(DIR_TEMPLATE, ".preview-tipografias.html");
  await fs.writeFile(archivo, doc, "utf8");

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
  await page.goto(`file://${archivo}`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");

  const slide = await page.$(".slide");
  const jpg = path.join(SALIDA, `${par.slug}.jpg`);
  await slide.screenshot({ path: jpg, type: "jpeg", quality: 88 });
  await page.close();

  hechas.push({ ...par, jpg });
}

/* --- La galería: todas juntas, para comparar de un vistazo ---------------- */

const tarjetas = hechas
  .map(
    (p) => `
  <figure>
    <img src="file://${p.jpg}">
    <figcaption>
      <b>${p.slug}</b>
      <span>${p.display} + ${p.texto}</span>
      <em>${p.caracter}</em>
      <small>${p.para}</small>
    </figcaption>
  </figure>`,
  )
  .join("");

const galeria = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#eef0f3;font:14px/1.4 -apple-system,system-ui,sans-serif;padding:40px;
       display:grid;grid-template-columns:repeat(3,1fr);gap:36px;width:1400px}
  figure{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  img{width:100%;display:block}
  figcaption{padding:16px 18px 20px}
  b{font-size:17px;display:block;text-transform:uppercase;letter-spacing:.08em}
  span{display:block;color:#111;margin:4px 0 8px;font-weight:600}
  em{display:block;color:#4a5058;font-style:normal;margin-bottom:6px}
  small{color:#8a9099}
</style></head><body>${tarjetas}</body></html>`;

const archivoGaleria = path.join(SALIDA, "_galeria.html");
await fs.writeFile(archivoGaleria, galeria, "utf8");

const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1200, deviceScaleFactor: 1 });
await page.goto(`file://${archivoGaleria}`, { waitUntil: "networkidle0" });
await page.screenshot({
  path: path.join(SALIDA, "_galeria.jpg"),
  type: "jpeg",
  quality: 86,
  fullPage: true,
});
await page.close();
await browser.close();

console.log(`\n${hechas.length} duplas en content-studio/output/_tipografias/`);
console.log(`Mirá _galeria.jpg y elegí. Después, en marca.json:\n`);
console.log(`  "fuentes": {`);
console.log(`    "display": { "familia": "Montserrat", "pesos": "${PESOS_DISPLAY}" },`);
console.log(`    "texto":   { "familia": "Source Sans 3", "pesos": "${PESOS_TEXTO}" }`);
console.log(`  }\n`);
console.log(`y corré: npm run fuentes`);
