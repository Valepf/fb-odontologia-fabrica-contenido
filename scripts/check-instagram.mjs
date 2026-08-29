#!/usr/bin/env node
/**
 * Verifica las credenciales de Instagram sin publicar nada.
 *   npm run ig:check
 */

import { CFG } from "./config.mjs";
import { quienSoy, estaConfigurado } from "./instagram.mjs";
import { leerCola, bloquesPendientes, ahoraLocal, diasDeBuffer, BLOQUES } from "./cola.mjs";

const cola = await leerCola();
const { fecha, hora } = ahoraLocal();

console.log(`Hora local (${CFG.zona}): ${fecha} ${String(hora).padStart(2, "0")}h`);
console.log(`Bloques del día: ${BLOQUES.map((b) => `${b.nombre}≥${b.desde}h`).join(" · ")}`);
console.log(`Bloques pendientes ahora: ${bloquesPendientes(cola).join(", ") || "ninguno"}`);
console.log(
  `Cola: ${cola.pendientes.length} pendientes · ${diasDeBuffer(cola).toFixed(1)} días de buffer · ` +
    `${cola.publicados.length} publicados`,
);

if (!estaConfigurado()) {
  console.log("\n✗ Faltan IG_USER_ID y/o IG_ACCESS_TOKEN.");
  console.log("  El sistema corre igual en modo simulacro, pero no publica.");
  process.exit(1);
}

try {
  const usuario = await quienSoy();
  console.log(`\n✓ Conectado como @${usuario}`);
  if (usuario && usuario !== CFG.cuenta) {
    console.log(`  ⚠ Ojo: la cuenta esperada es @${CFG.cuenta}`);
  }
} catch (error) {
  console.log(`\n✗ El token no funciona: ${error.message}`);
  process.exit(1);
}
