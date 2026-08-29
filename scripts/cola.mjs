/**
 * La cola de publicación y los bloques horarios.
 *
 * ⚠️ Lección cara: un publicador que compara contra el reloj exacto pierde la
 * corrida si algo se demora un minuto, y ese día no se publica nada. Por eso
 * acá se decide por BLOQUE consumido, no por hora: "¿ya publiqué hoy?".
 * Una corrida perdida la recupera la siguiente, y invocarlo de más nunca
 * duplica un post.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { RAIZ, CFG } from "./config.mjs";

export const RUTA_COLA = path.join(RAIZ, "cola.json");
export const ZONA = CFG.zona;

/**
 * Los bloques del día. `desde` es el piso del bloque, no un horario exacto:
 * el cron corre cada dos horas y publica en la primera corrida que lo
 * encuentra abierto y sin usar.
 */
export const BLOQUES = CFG.bloques;

export async function leerCola() {
  try {
    return JSON.parse(await fs.readFile(RUTA_COLA, "utf8"));
  } catch {
    return { pendientes: [], publicados: [] };
  }
}

export async function escribirCola(cola) {
  await fs.writeFile(RUTA_COLA, `${JSON.stringify(cola, null, 2)}\n`, "utf8");
}

/** Fecha y hora locales de la marca, corra donde corra el proceso. */
export function ahoraLocal(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(fecha);

  const v = (t) => partes.find((p) => p.type === t).value;
  return { fecha: `${v("year")}-${v("month")}-${v("day")}`, hora: Number(v("hour")) };
}

/**
 * Bloques de hoy que ya empezaron y que todavía nadie publicó.
 * Del más tardío al más temprano: si se perdió el de la mañana y ya es de
 * noche, se publica igual en vez de saltear el día.
 */
export function bloquesPendientes(cola, fecha = new Date()) {
  const { fecha: hoy, hora } = ahoraLocal(fecha);
  const consumidos = new Set(
    (cola.publicados ?? []).filter((p) => p.fecha === hoy).map((p) => p.bloque),
  );

  return BLOQUES.filter((b) => hora >= b.desde && !consumidos.has(b.nombre))
    .map((b) => b.nombre)
    .reverse();
}

/** Cuántos días de contenido quedan en la cola. */
export function diasDeBuffer(cola) {
  return (cola.pendientes?.length ?? 0) / BLOQUES.length;
}
