/**
 * Cliente de la Graph API de Instagram.
 *
 * Un carrusel se publica en tres pasos:
 *   1. un contenedor por imagen, con is_carousel_item=true
 *   2. un contenedor CAROUSEL que agrupa a los hijos y lleva el caption
 *   3. media_publish del contenedor padre
 *
 * Instagram acepta entre 2 y 10 imágenes, en JPEG, servidas desde una URL
 * pública que él mismo descarga.
 *
 * Hay dos caminos para publicar y el sistema soporta los dos. La diferencia
 * la marca IG_GRAPH_BASE, que deja configurado `npm run ig:setup`:
 *
 *   · graph.facebook.com   — Graph API vía Business Manager. Es el camino de
 *     un System User: el token NO vence, que para un cron es lo mejor.
 *
 *   · graph.instagram.com  — Instagram API con Instagram Login. No necesita
 *     página de Facebook. El token dura 60 días y hay que renovarlo.
 *
 * Los endpoints de publicación son idénticos en ambos; lo que cambia es cómo
 * se averigua el ID de la cuenta y si el token hay que renovarlo.
 */

// `||` y no `??`: si el secret no existe, GitHub Actions lo pasa como string
// vacío, y `??` sólo cae al default con null o undefined.
const GRAPH = process.env.IG_GRAPH_BASE || "https://graph.instagram.com/v25.0";

/** true si estamos en el camino de Instagram Login (token con vencimiento). */
export function esInstagramLogin() {
  return GRAPH.includes("graph.instagram.com");
}

export const MAX_IMAGENES = 10;
export const MIN_IMAGENES = 2;

export function estaConfigurado() {
  return Boolean(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN);
}

async function graph(ruta, params, metodo = "GET") {
  const token = process.env.IG_ACCESS_TOKEN;
  const cuerpo = new URLSearchParams({ ...params, access_token: token });
  const url = `${GRAPH}${ruta}`;

  const respuesta =
    metodo === "GET"
      ? await fetch(`${url}?${cuerpo}`)
      : await fetch(url, { method: "POST", body: cuerpo });

  const json = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const mensaje = json?.error?.message ?? respuesta.statusText;
    throw new Error(`Graph API ${respuesta.status}: ${mensaje}`);
  }
  return json;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Instagram tarda unos segundos en bajar y procesar cada imagen. */
async function esperarContenedor(id, intentos = 30, esperaMs = 3000) {
  for (let i = 0; i < intentos; i++) {
    const { status_code, status } = await graph(`/${id}`, { fields: "status_code,status" });
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR") {
      throw new Error(`Instagram no pudo procesar el contenedor ${id}: ${status ?? ""}`);
    }
    await dormir(esperaMs);
  }
  throw new Error(`El contenedor ${id} tardó demasiado en procesarse`);
}

/**
 * Publica un carrusel. Devuelve { ok, mediaId } o { ok:false, error }.
 */
export async function publicarCarrusel({ imagenes, caption }) {
  if (!estaConfigurado()) {
    return { ok: false, error: "Faltan IG_USER_ID o IG_ACCESS_TOKEN" };
  }
  if (imagenes.length < MIN_IMAGENES || imagenes.length > MAX_IMAGENES) {
    return {
      ok: false,
      error: `Un carrusel necesita entre ${MIN_IMAGENES} y ${MAX_IMAGENES} imágenes (recibí ${imagenes.length})`,
    };
  }

  const usuario = process.env.IG_USER_ID;

  try {
    // 1. Un contenedor por imagen. En serie: en paralelo la API rate-limitea.
    const hijos = [];
    for (const image_url of imagenes) {
      const hijo = await graph(
        `/${usuario}/media`,
        { image_url, is_carousel_item: "true" },
        "POST",
      );
      hijos.push(hijo.id);
    }

    for (const id of hijos) await esperarContenedor(id);

    // 2. El contenedor del carrusel, que es el que lleva el caption.
    const padre = await graph(
      `/${usuario}/media`,
      { media_type: "CAROUSEL", children: hijos.join(","), caption },
      "POST",
    );
    await esperarContenedor(padre.id);

    // 3. Publicar.
    const publicado = await graph(`/${usuario}/media_publish`, { creation_id: padre.id }, "POST");

    return { ok: true, mediaId: publicado.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Publica un Reel (video vertical). Mismo circuito que el carrusel pero con
 * un solo contenedor: media_type=REELS + video_url público.
 *
 * ⚠️ Este camino NO está tan probado como el de carruseles: el sistema nació
 * para placas. Antes de encolar video en serie, publicá UNO y miralo en el
 * teléfono. Requisitos de Meta: MP4/MOV, códec H.264 + AAC, 3 s a 15 min,
 * 9:16 recomendado (1080×1920), menos de 1 GB.
 *
 * El procesamiento de video tarda mucho más que el de una imagen: por eso la
 * espera es más larga.
 */
export async function publicarReel({ video, caption, portada }) {
  if (!estaConfigurado()) {
    return { ok: false, error: "Faltan IG_USER_ID o IG_ACCESS_TOKEN" };
  }

  const usuario = process.env.IG_USER_ID;

  try {
    const params = {
      media_type: "REELS",
      video_url: video,
      caption,
      share_to_feed: "true",
    };
    // Miniatura propia: si no se pasa, Instagram elige un cuadro solo.
    if (portada) params.cover_url = portada;

    const contenedor = await graph(`/${usuario}/media`, params, "POST");
    await esperarContenedor(contenedor.id, 60, 5000);

    const publicado = await graph(
      `/${usuario}/media_publish`,
      { creation_id: contenedor.id },
      "POST",
    );
    return { ok: true, mediaId: publicado.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * El token de larga duración dura 60 días. El publicador lo refresca en cada
 * corrida —aunque no publique nada— así que no vence ni con la cola pausada.
 * Sólo se puede refrescar si tiene más de 24 horas de vida; que falle antes de
 * eso es inofensivo.
 */
export async function renovarToken() {
  if (!estaConfigurado()) return;
  // Los tokens de System User no vencen: no hay nada que renovar, y el
  // endpoint ni siquiera existe en graph.facebook.com.
  if (!esInstagramLogin()) return;
  try {
    await graph("/refresh_access_token", { grant_type: "ig_refresh_token" });
  } catch {
    // No es motivo para abortar nada.
  }
}

/**
 * Devuelve el @usuario de la cuenta que se va a publicar. Sirve para validar
 * credenciales sin publicar nada.
 *
 * Se consulta por ID y no por /me a propósito: con un token de System User,
 * /me devuelve el usuario del sistema, no la cuenta de Instagram.
 */
export async function quienSoy() {
  if (!estaConfigurado()) return null;
  const cuenta = await graph(`/${process.env.IG_USER_ID}`, { fields: "username" });
  return cuenta.username ?? null;
}
