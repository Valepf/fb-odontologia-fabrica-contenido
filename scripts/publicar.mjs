#!/usr/bin/env node
/**
 * El publicador. Lo invoca el cron varias veces por día.
 *
 *   node scripts/publicar.mjs              → publica si hay un bloque pendiente
 *   node scripts/publicar.mjs --simulacro  → muestra qué publicaría, sin publicar
 *
 * REGLA DURA: la publicación la hace SOLO el cron. Publicar a mano duplica
 * posts porque la cola queda desincronizada con lo que ya está en el feed.
 *
 * Decide por bloque consumido y no por reloj, así que se lo puede invocar de
 * más sin duplicar nada y una corrida perdida se recupera en la siguiente.
 */

import { leerCola, escribirCola, bloquesPendientes, ahoraLocal, diasDeBuffer } from "./cola.mjs";
import { publicarCarrusel, renovarToken, estaConfigurado } from "./instagram.mjs";

const simulacro = process.argv.includes("--simulacro");

function salir(datos, codigo = 0) {
  console.log(JSON.stringify(datos, null, 2));
  process.exit(codigo);
}

async function main() {
  // El token se refresca en TODAS las corridas, no sólo en las que publican.
  // Si sólo se refrescara al publicar, una cola vacía durante dos meses (un
  // cliente que pausa) mataría el token de Instagram Login (60 días) antes de
  // la próxima publicación. Para System User es un no-op, y los errores se
  // tragan adentro: nunca es motivo para abortar.
  await renovarToken();

  const cola = await leerCola();
  const { fecha, hora } = ahoraLocal();
  const pendientes = bloquesPendientes(cola);

  if (!pendientes.length) {
    salir({ accion: "nada", motivo: "No hay bloques pendientes en este momento", fecha, hora });
  }

  const bloque = pendientes[0];

  if (!cola.pendientes?.length) {
    salir({
      accion: "nada",
      motivo: "La cola está vacía — hay que producir contenido",
      fecha,
      bloque,
    });
  }

  const siguiente = cola.pendientes[0];

  if (simulacro) {
    salir({
      accion: "simulacro",
      fecha,
      bloque,
      slug: siguiente.slug,
      imagenes: siguiente.imagenes.length,
      caption: siguiente.caption.slice(0, 160),
      instagramConfigurado: estaConfigurado(),
    });
  }

  if (!estaConfigurado()) {
    // Sin credenciales el circuito corre igual: deja constancia de lo que
    // habría publicado, para poder probar todo antes de conectar Instagram.
    salir({
      accion: "simulado",
      motivo: "Faltan IG_USER_ID e IG_ACCESS_TOKEN",
      fecha,
      bloque,
      slug: siguiente.slug,
      imagenes: siguiente.imagenes.length,
    });
  }

  const resultado = await publicarCarrusel({
    imagenes: siguiente.imagenes,
    caption: siguiente.caption,
  });

  if (!resultado.ok) {
    // El bloque NO se marca consumido: la próxima corrida reintenta.
    salir({ accion: "error", fecha, bloque, slug: siguiente.slug, error: resultado.error }, 1);
  }

  cola.pendientes.shift();
  cola.publicados.push({
    slug: siguiente.slug,
    fecha,
    bloque,
    mediaId: resultado.mediaId,
    publicadoEn: new Date().toISOString(),
  });
  await escribirCola(cola);

  salir({
    accion: "publicado",
    fecha,
    bloque,
    slug: siguiente.slug,
    mediaId: resultado.mediaId,
    quedanEnCola: cola.pendientes.length,
    diasDeBuffer: Number(diasDeBuffer(cola).toFixed(1)),
  });
}

main().catch((error) => {
  console.error(JSON.stringify({ accion: "error", error: String(error) }, null, 2));
  process.exit(1);
});
