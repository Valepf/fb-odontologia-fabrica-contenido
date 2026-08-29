/**
 * Detector de contenido repetido.
 *
 * La regla de oro del sistema es no repetir tema ni ángulo. Esa regla vivía
 * sólo en `INDICE.md`, o sea que dependía de que alguien la leyera. Esto la
 * convierte en una barrera de código: `npm run stage` no encola un carrusel
 * que se parezca demasiado a otro ya escrito.
 *
 * La fuente de verdad es `content-studio/content/`: los JSON quedan
 * versionados para siempre, así que alcanza con compararlos entre sí.
 *
 * Alcance honesto: esto detecta repetición **léxica** (mismas palabras). La
 * repetición **semántica** —la misma idea dicha distinta— no la agarra ningún
 * comparador de strings; para eso está el test del subtítulo de `INDICE.md`,
 * que lo aplica quien escribe.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { DIR_CONTENT } from "./config.mjs";

/** Umbral a partir del cual dos hooks se consideran el mismo. Bloquea. */
export const UMBRAL_ERROR = 0.72;
/** Umbral de sospecha. No bloquea, avisa. */
export const UMBRAL_AVISO = 0.5;

// Palabras que aparecen en todos lados y no distinguen un tema de otro.
const VACIAS = new Set(
  ("de la el que y a en un una es no se lo los las del al por con para tu tus su sus mas como " +
    "pero si ya te me vos nos le les este esta eso esa aunque cuando donde porque " +
    "sobre entre desde hasta sin sos son ser tiene tienen hay muy todo toda todos todas")
    .split(" "),
);

/** minúsculas, sin acentos, sin puntuación, sin palabras vacías. */
export function tokenizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 && !VACIAS.has(p));
}

/** Coeficiente de Dice sobre conjuntos de palabras: 0 = nada en común, 1 = iguales. */
export function similitud(a, b) {
  const A = new Set(tokenizar(a));
  const B = new Set(tokenizar(b));
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  for (const p of A) if (B.has(p)) comunes++;
  return (2 * comunes) / (A.size + B.size);
}

/** El hook de un carrusel: la portada es lo que decide si algo es repetido. */
function hookDe(post) {
  const portada = post.slides?.find((s) => s.tipo === "portada") ?? post.slides?.[0] ?? {};
  return `${portada.titulo ?? ""} ${portada.bajada ?? ""}`.replace(/\*/g, "").trim();
}

/** Todos los títulos del carrusel, para detectar placas calcadas. */
function titulosDe(post) {
  return (post.slides ?? [])
    .map((s) => s.titulo ?? s.texto ?? "")
    .filter(Boolean)
    .map((t) => t.replace(/\*/g, "").trim());
}

export async function leerCarruseles() {
  const archivos = (await fs.readdir(DIR_CONTENT)).filter((f) => f.endsWith(".json")).sort();
  const carruseles = [];
  for (const archivo of archivos) {
    const post = JSON.parse(await fs.readFile(path.join(DIR_CONTENT, archivo), "utf8"));
    const slug = post.slug ?? path.basename(archivo, ".json");
    carruseles.push({ slug, hook: hookDe(post), titulos: titulosDe(post), persona: post.persona });
  }
  return carruseles;
}

/**
 * Compara todos contra todos.
 * Devuelve { errores, avisos }: cada uno con { a, b, valor, motivo }.
 */
export function comparar(carruseles) {
  const errores = [];
  const avisos = [];

  for (let i = 0; i < carruseles.length; i++) {
    for (let j = i + 1; j < carruseles.length; j++) {
      const a = carruseles[i];
      const b = carruseles[j];

      const s = similitud(a.hook, b.hook);
      if (s >= UMBRAL_ERROR) {
        errores.push({
          a: a.slug,
          b: b.slug,
          valor: s,
          motivo: `hooks casi idénticos\n      "${a.hook}"\n      "${b.hook}"`,
        });
        continue;
      }
      if (s >= UMBRAL_AVISO) {
        avisos.push({
          a: a.slug,
          b: b.slug,
          valor: s,
          motivo: `hooks parecidos\n      "${a.hook}"\n      "${b.hook}"`,
        });
      }

      // Una placa calcada entre dos carruseles distintos también es repetir.
      for (const ta of a.titulos) {
        for (const tb of b.titulos) {
          if (similitud(ta, tb) >= 0.85 && tokenizar(ta).length >= 3) {
            avisos.push({
              a: a.slug,
              b: b.slug,
              valor: similitud(ta, tb),
              motivo: `placa repetida: "${ta}" / "${tb}"`,
            });
          }
        }
      }
    }
  }

  return { errores, avisos };
}

/** Los slugs que no se pueden encolar por estar repetidos. */
export function slugsBloqueados(errores) {
  // Se bloquea el segundo de cada par: el primero ya existía.
  return new Set(errores.map((e) => e.b));
}
