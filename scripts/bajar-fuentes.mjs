#!/usr/bin/env node
/**
 * Baja las tipografías de la marca y las embebe en el template.
 *   npm run fuentes
 *
 * Las familias y los pesos salen de `marca.json`. Para ver opciones antes de
 * elegir: `npm run tipografias`.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { CFG, DIR_TEMPLATE } from "./config.mjs";
import { bajarFamilia } from "./fuentes.mjs";

const DIR = path.join(DIR_TEMPLATE, "fonts");

if (!CFG.fuentes?.display && !CFG.fuentes?.texto) {
  console.error('marca.json no define "fuentes". Nada que bajar.');
  process.exit(1);
}

let cssFinal = "";
const vars = [];

for (const [rol, f] of [
  ["display", CFG.fuentes?.display],
  ["texto", CFG.fuentes?.texto],
]) {
  if (!f) continue; // familia propia declarada a mano en marca.css: no se toca
  const { css, faltantes } = await bajarFamilia({
    familia: f.familia,
    pesos: f.pesos,
    destino: DIR,
  });
  cssFinal += css;
  // La variable se escribe acá y no en marca.css: el nombre de la familia vive
  // en un solo lado (marca.json) y no puede quedar desincronizado del archivo
  // que realmente se bajó.
  vars.push(`  --${rol}: "${f.familia}", "Helvetica Neue", Arial, sans-serif;`);
  console.log(`✓ ${f.familia} · pesos ${f.pesos}`);
  if (faltantes.length) {
    console.log(
      `  ⚠ Google no sirve el peso ${faltantes.join(", ")} para ${f.familia}: ` +
        `Chrome va a usar el más cercano.\n` +
        `    Los titulares del template piden 900 y los párrafos 300. Si la familia no` +
        ` los tiene,\n    elegí otra con \`npm run tipografias\`.`,
    );
  }
}

cssFinal += `\n:root {\n${vars.join("\n")}\n}\n`;

await fs.writeFile(path.join(DIR, "fuentes.css"), cssFinal, "utf8");
console.log(`\nTipografías embebidas en content-studio/template/fonts/.`);
console.log("El render ya no necesita internet para tipografía.");
