#!/usr/bin/env node
/**
 * La grilla del perfil, antes de publicarla.
 *   npm run grilla
 *
 * Compone las portadas en la grilla de 3 columnas de Instagram, en el orden en
 * que van a quedar cuando se publique todo lo que está en cola: lo más nuevo
 * arriba a la izquierda.
 *
 * Para qué existe: hay reglas del feed que sólo se ven mirando la grilla
 * entera. El ciclo de estilos ya garantiza que no queden dos portadas oscuras
 * pegadas, pero la alternancia de portadas con y sin foto es responsabilidad
 * de quien escribe — y acá se ve de un vistazo, sin abrir Instagram. También
 * es la imagen que se le manda al cliente cuando quiere aprobar antes de que
 * salga.
 *
 * Salida: content-studio/output/_grilla.jpg (no se versiona)
 */

import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

import { DIR_OUTPUT, DIR_CONTENT, DIR_TEMPLATE, encontrarChrome } from "./config.mjs";
import { leerCola } from "./cola.mjs";
import { estiloPara } from "../content-studio/template/slides.mjs";

const cola = await leerCola();
const publicados = (cola.publicados ?? []).map((p) => p.slug);
const pendientes = (cola.pendientes ?? []).map((p) => p.slug);

let renderizados = [];
try {
  renderizados = (await fs.readdir(DIR_OUTPUT, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();
} catch {}

const enCola = new Set([...publicados, ...pendientes]);
// Borradores: renderizados que todavía no pasaron por la cola. Se encolan al
// final, así que en la grilla futura quedan arriba de todo.
const borradores = renderizados.filter((s) => !enCola.has(s));

// Del más nuevo al más viejo, que es como los muestra el perfil.
const orden = [
  ...borradores.slice().reverse().map((slug) => ({ slug, estado: "borrador" })),
  ...pendientes.slice().reverse().map((slug) => ({ slug, estado: "en cola" })),
  ...publicados.slice().reverse().map((slug) => ({ slug, estado: "publicado" })),
];

if (!orden.length) {
  console.log("No hay nada renderizado ni en cola todavía. Corré: npm run render");
  process.exit(0);
}

/** ¿La portada de este carrusel lleva foto? Para el chequeo de alternancia. */
async function tipoDePortada(slug) {
  try {
    const post = JSON.parse(await fs.readFile(path.join(DIR_CONTENT, `${slug}.json`), "utf8"));
    return post.slides?.[0]?.foto ? "con foto" : "tipográfica";
  } catch {
    return "?";
  }
}

const celdas = [];
console.log(`Grilla futura, de arriba a la izquierda hacia abajo:\n`);
for (const [i, { slug, estado }] of orden.entries()) {
  const portada = path.join(DIR_OUTPUT, slug, "01.jpg");
  let existe = true;
  try {
    await fs.access(portada);
  } catch {
    existe = false;
  }
  const tipo = await tipoDePortada(slug);
  console.log(
    `  ${String(i + 1).padStart(2)}. ${slug.padEnd(38)} ${estiloPara(slug).padEnd(9)} ` +
      `${tipo.padEnd(11)} ${estado}${existe ? "" : "  (sin render: celda gris)"}`,
  );
  celdas.push(
    existe
      ? `<div class="celda"><img src="file://${portada}"></div>`
      : `<div class="celda vacia"><span>${slug}</span></div>`,
  );
}

/* La grilla actual de Instagram muestra las miniaturas en 3:4, un pelo más
   angostas que nuestras placas 4:5: el recorte de acá imita ese encuadre. */
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1170px; background: #fff; }
  .grilla { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; }
  .celda { aspect-ratio: 3 / 4; overflow: hidden; background: #e9ebee; position: relative; }
  .celda img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .vacia span { position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; font: 13px/1.4 -apple-system, sans-serif; color: #8a9099;
    padding: 12px; text-align: center; word-break: break-all; }
</style></head><body><div class="grilla">${celdas.join("")}</div></body></html>`;

const chrome = await encontrarChrome();
if (!chrome) {
  console.error("\nNo encontré Chrome. Pasá la ruta con CHROME_PATH=…");
  process.exit(1);
}

const archivo = path.join(DIR_TEMPLATE, ".preview-grilla.html");
await fs.writeFile(archivo, html, "utf8");

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--allow-file-access-from-files"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1170, height: 1200, deviceScaleFactor: 1 });
await page.goto(`file://${archivo}`, { waitUntil: "networkidle0" });
const salida = path.join(DIR_OUTPUT, "_grilla.jpg");
await page.screenshot({ path: salida, type: "jpeg", quality: 86, fullPage: true });
await browser.close();
await fs.rm(archivo, { force: true });

console.log(`\n✓ content-studio/output/_grilla.jpg — abrila y mirala de verdad.`);
console.log(
  "  Tres portadas tipográficas seguidas o tres con foto seguidas = monotonía:\n" +
    "  ajustá la portada de la próxima pieza (el ciclo de colores ya viene ordenado).",
);
