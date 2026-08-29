/**
 * Estructura de los slides.
 *
 * Este archivo define QUÉ puede decir un slide. `style.css` define CÓMO se ve.
 * Los JSON de contenido sólo aportan texto: no pueden inyectar estilos, clases
 * ni HTML. Por eso todos los carruseles del feed son idénticos en estética.
 *
 * Para agregar un tipo de slide nuevo: una función en CUERPOS acá, y su bloque
 * en style.css. Nunca al revés, y nunca desde el JSON.
 */

import { CFG } from "../../scripts/config.mjs";

/* ---------------------------------------------------------------------------
 * Rotación de estilos
 *
 * El estilo NO se elige a mano: se deriva del número del slug. El ciclo está
 * ordenado para que en la grilla de 3 columnas del perfil nunca queden dos
 * portadas oscuras pegadas — ese detalle es la diferencia entre un feed que
 * parece de agencia y uno que parece de plantilla.
 * ------------------------------------------------------------------------- */
export const CICLO = CFG.ciclo ?? ["claro", "primario", "claro", "oscuro", "duo", "primario"];

export function estiloPara(slug) {
  const n = parseInt(String(slug).slice(0, 2), 10);
  if (!Number.isFinite(n)) return CICLO[0];
  return CICLO[(n - 1 + CICLO.length) % CICLO.length];
}

/** Las categorías del sistema. Se pintan en el chip de cada slide. */
export const CATEGORIAS = CFG.categorias;

/* --- Utilidades de texto -------------------------------------------------- */

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** `*palabras*` → pintadas con el acento de la pieza. 1–3 por portada. */
function hl(s) {
  return esc(s).replace(/\*([^*]+)\*/g, '<em class="hl">$1</em>');
}

/* Sin paginador y sin pie a propósito: Instagram ya muestra el @usuario arriba
   de cada post y los puntos del carrusel abajo. Repetirlo en la placa es cromo
   que le come aire al texto. La marca la sostienen la paleta, la tipografía y
   el slide de cierre. */

/* --- Cuerpo por tipo de slide --------------------------------------------- */

const CUERPOS = {
  portada(s) {
    return `
      <div class="marca-agua">${esc(s.numero ?? "")}</div>
      <h1 class="titulo">${hl(s.titulo)}</h1>
      ${s.bajada ? `<p class="bajada">${hl(s.bajada)}</p>` : ""}`;
  },

  punto(s, i) {
    return `
      <div class="numero">${String(s.numero ?? i).padStart(2, "0")}</div>
      <h2 class="titulo-medio">${hl(s.titulo)}</h2>
      ${s.texto ? `<p class="parrafo">${hl(s.texto)}</p>` : ""}`;
  },

  lista(s) {
    const items = (s.items ?? []).map((t) => `<li>${hl(t)}</li>`).join("");
    return `
      <h2 class="titulo-medio">${hl(s.titulo)}</h2>
      <ul class="lista">${items}</ul>`;
  },

  frase(s) {
    return `
      <p class="frase">${hl(s.texto)}</p>
      ${s.firma ? `<div class="firma-frase">${esc(s.firma)}</div>` : ""}`;
  },

  stat(s) {
    return `
      <div class="cifra">${esc(s.cifra)}</div>
      <div class="cifra-pie">${hl(s.pie)}</div>
      ${s.nota ? `<p class="parrafo">${hl(s.nota)}</p>` : ""}`;
  },

  foto(s) {
    return `
      ${s.titulo ? `<h2 class="titulo-medio">${hl(s.titulo)}</h2>` : ""}
      ${s.texto ? `<p class="parrafo">${hl(s.texto)}</p>` : ""}`;
  },

  cta(s) {
    return `
      <h2 class="cta-titulo">${hl(s.titulo)}</h2>
      <div class="cta-dominio">${esc(CFG.dominio)}</div>
      ${s.nota ? `<p class="cta-nota">${hl(s.nota)}</p>` : ""}`;
  },
};

export const TIPOS = Object.keys(CUERPOS);

/* --- Fotos ----------------------------------------------------------------
 * Cualquier slide puede llevar foto, no sólo los de tipo `foto`. Es lo que
 * evita que el feed se vea monótono: la portada con foto es la que aparece
 * en la grilla del perfil.
 * ------------------------------------------------------------------------ */

export const POSICIONES = ["arriba", "completa", "fondo"];

const ENCUADRES = {
  centro: "center",
  arriba: "top",
  abajo: "bottom",
  izquierda: "left",
  derecha: "right",
};

export function encuadreCSS(encuadre) {
  if (!encuadre) return ENCUADRES.centro;
  const valor = ENCUADRES[encuadre];
  if (!valor) {
    throw new Error(
      `Encuadre desconocido: "${encuadre}". Válidos: ${Object.keys(ENCUADRES).join(", ")}`,
    );
  }
  return valor;
}

/* --- Slide completo -------------------------------------------------------- */

export function slideHTML(s, i, total, categoria, estilo) {
  const cuerpo = CUERPOS[s.tipo];
  if (!cuerpo) {
    throw new Error(
      `Tipo de slide desconocido: "${s.tipo}". Válidos: ${Object.keys(CUERPOS).join(", ")}`,
    );
  }
  if (s.tipo === "foto" && !s.foto) {
    throw new Error("Un slide de tipo 'foto' necesita el campo 'foto'");
  }

  const cabecera = `
    <header class="cabecera">
      <span class="chip">${esc(categoria)}</span>
    </header>`;

  const posicion = s.posicion ?? "arriba";

  /* El logo va en la portada y en el cierre, que son las placas con aire de
     sobra y las que más circulan sueltas. Se saltea en los layouts con panel
     de color (`arriba` y `completa`): ahí el texto vive en una franja acotada
     y el logo lo empujaría a achicarse. */
  const llevaLogo =
    (s.tipo === "portada" || s.tipo === "cta") && (!s.foto || posicion === "fondo");
  const logo = llevaLogo
    ? CFG.logo === "imagen"
      ? '\n    <span class="logo"></span>'
      : `\n    <span class="logo-texto">${esc(CFG.marca)}</span>`
    : "";
  const claseLogo = llevaLogo ? " con-logo" : "";

  // Sin foto: el chasis simple.
  if (!s.foto) {
    return `
  <section class="slide tipo-${s.tipo} estilo-${estilo}${claseLogo}">
    ${cabecera}
    <div class="cuerpo">${cuerpo(s, i)}</div>${logo}
  </section>`;
  }

  if (!POSICIONES.includes(posicion)) {
    throw new Error(
      `Posición de foto desconocida: "${posicion}". Válidas: ${POSICIONES.join(", ")}`,
    );
  }

  // Foto de fondo: el chasis normal, con la imagen a baja opacidad detrás.
  // La opacidad la fija el template según el estilo, no el contenido.
  if (posicion === "fondo") {
    return `
  <section class="slide tipo-${s.tipo} estilo-${estilo} con-fondo${claseLogo}"
           style="--encuadre:${encuadreCSS(s.encuadre)}">
    <div class="marco"><img src="../fotos/${esc(s.foto)}" alt=""></div>
    ${cabecera}
    <div class="cuerpo">${cuerpo(s, i)}</div>${logo}
  </section>`;
  }

  // Foto en un bloque: la cabecera va sobre la imagen y el texto dentro del
  // panel de color, para que nada quede apoyado sobre la foto.
  return `
  <section class="slide tipo-${s.tipo} estilo-${estilo} con-foto pos-${posicion}"
           style="--encuadre:${encuadreCSS(s.encuadre)}">
    <div class="marco"><img src="../fotos/${esc(s.foto)}" alt=""></div>
    ${cabecera}
    <div class="panel">
      <div class="cuerpo">${cuerpo(s, i)}</div>
    </div>
  </section>`;
}

/** Documento completo con todos los slides del carrusel. */
export function documentoHTML(post) {
  const estilo = estiloPara(post.slug);
  const total = post.slides.length;
  const etiqueta = post.etiqueta ?? post.categoria;
  const secciones = post.slides
    .map((s, i) => slideHTML(s, i, total, etiqueta, estilo))
    .join("\n");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${esc(post.slug)}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
${secciones}
</body>
</html>`;
}
