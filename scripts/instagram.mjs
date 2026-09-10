/**
 * Cliente de la Graph API de Instagram.
 *
 * Un carrusel se publica en tres pasos:
 *   1. un contenedor por imagen, con media_type=IMAGE e is_carousel_item=true
 *   2. un contenedor CAROUSEL que agrupa a los hijos y lleva el caption
 *   3. media_publish del contenedor padre
 */

const GRAPH = process.env.IG_GRAPH_BASE || "https://graph.instagram.com/v25.0";

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

async function esperarContenedor(id, intentos = 30, esperaMs = 3000) {
  for (let i = 0; i < intentos; i++) {
    const { status_code, status } = await graph(`/${id}`, {
      fields: "status_code,status",
    });
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR") {
      throw new Error(
        `Instagram no pudo procesar el contenedor ${id}: ${status ?? ""}`,
      );
    }
    await dormir(esperaMs);
  }
  throw new Error(`El contenedor ${id} tardÃ³ demasiado en procesarse`);
}

export async function publicarCarrusel({ imagenes, caption }) {
  if (!estaConfigurado()) {
    return { ok: false, error: "Faltan IG_USER_ID o IG_ACCESS_TOKEN" };
  }
  if (imagenes.length < MIN_IMAGENES || imagenes.length > MAX_IMAGENES) {
    return {
      ok: false,
      error: `Un carrusel necesita entre ${MIN_IMAGENES} y ${MAX_IMAGENES} imÃ¡genes (recibÃ­ ${imagenes.length})`,
    };
  }

  const usuario = process.env.IG_USER_ID;

  try {
    const hijos = [];
    for (const image_url of imagenes) {
      const hijo = await graph(
        `/${usuario}/media`,
        {
          image_url,
          media_type: "IMAGE",
          is_carousel_item: "true",
        },
        "POST",
      );
      hijos.push(hijo.id);
    }

    for (const id of hijos) await esperarContenedor(id);

    const padre = await graph(
      `/${usuario}/media`,
      { media_type: "CAROUSEL", children: hijos.join(","), caption },
      "POST",
    );
    await esperarContenedor(padre.id);

    const publicado = await graph(
      `/${usuario}/media_publish`,
      { creation_id: padre.id },
      "POST",
    );

    return { ok: true, mediaId: publicado.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

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
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function renovarToken() {
  if (!estaConfigurado()) return;
  if (!esInstagramLogin()) return;
  try {
    await graph("/refresh_access_token", { grant_type: "ig_refresh_token" });
  } catch {
    // No es motivo para abortar la publicaciÃ³n.
  }
}

export async function quienSoy() {
  if (!estaConfigurado()) return null;
  const cuenta = await graph(`/${process.env.IG_USER_ID}`, {
    fields: "username",
  });
  return cuenta.username ?? null;
}