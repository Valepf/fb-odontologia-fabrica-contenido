#!/usr/bin/env node
/**
 * Auditoría de repetición sobre todo el contenido escrito.
 *   npm run verificar
 *
 * Sale con código 1 si hay repetidos duros, así la rutina se entera.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { RAIZ } from "./config.mjs";
import { leerCola } from "./cola.mjs";
import { leerCarruseles, comparar, UMBRAL_ERROR, UMBRAL_AVISO } from "./repetidos.mjs";

const carruseles = await leerCarruseles();
const { errores, avisos } = comparar(carruseles);

const pct = (v) => `${Math.round(v * 100)}%`;

console.log(`Carruseles escritos: ${carruseles.length}`);

const porPersona = carruseles.reduce((acc, c) => {
  const k = c.persona ?? "—";
  acc[k] = (acc[k] ?? 0) + 1;
  return acc;
}, {});
console.log(
  "Cobertura por persona:",
  Object.entries(porPersona)
    .sort()
    .map(([k, n]) => `${k}:${n}`)
    .join(" · "),
);

/* La memoria de máquina (cola.json) y la humana (INDICE.md) se actualizan por
   separado, así que con el tiempo divergen — y un índice incompleto rompe en
   silencio la regla de no repetir. Es aviso y no error: entre `stage` y el
   paso de sincronizar el índice, la divergencia es normal por unos minutos. */
const cola = await leerCola();
const indice = await fs
  .readFile(path.join(RAIZ, "contenido", "INDICE.md"), "utf8")
  .catch(() => null);
if (indice !== null) {
  const sinFila = [...(cola.pendientes ?? []), ...(cola.publicados ?? [])]
    .map((p) => p.slug)
    .filter((s) => s && !indice.includes(s));
  if (sinFila.length) {
    console.log(`\n⚠ Pasaron por la cola pero no tienen fila en INDICE.md: ${sinFila.join(", ")}`);
    console.log("  La memoria quedó desincronizada: agregá la fila y la cobertura (skill carrusel, paso 4).");
  }
}

if (avisos.length) {
  console.log(`\n⚠ ${avisos.length} para mirar (≥${pct(UMBRAL_AVISO)}):`);
  for (const a of avisos) {
    console.log(`  ${a.a} ↔ ${a.b} · ${pct(a.valor)}\n      ${a.motivo}`);
  }
}

if (errores.length) {
  console.log(`\n✗ ${errores.length} REPETIDOS (≥${pct(UMBRAL_ERROR)}):`);
  for (const e of errores) {
    console.log(`  ${e.a} ↔ ${e.b} · ${pct(e.valor)}\n      ${e.motivo}`);
  }
  console.log("\nReescribí el hook del segundo o descartá el carrusel.");
  process.exit(1);
}

console.log(errores.length || avisos.length ? "" : "\n✓ Sin repeticiones.");
