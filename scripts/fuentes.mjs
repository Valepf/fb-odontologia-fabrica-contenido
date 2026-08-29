/**
 * Descarga de tipografías desde Google Fonts.
 *
 * Se embeben en el repo en vez de linkearlas porque el render tiene que ser
 * determinista: si Google no responde justo cuando se renderiza, el carrusel
 * sale con la tipografía del sistema y nadie se entera hasta que ya está
 * publicado.
 */

import fs from "node:fs/promises";
import path from "node:path";

// Con un User-Agent moderno Google devuelve woff2. Con uno viejo devuelve ttf.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export const slugFamilia = (familia) => familia.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * Baja una familia con sus pesos y devuelve el CSS listo para embeber.
 *
 * @param familia    nombre tal cual figura en Google Fonts ("Playfair Display")
 * @param pesos      "700;900"
 * @param destino    carpeta donde se guardan los .woff2
 * @param prefijoURL lo que se antepone al nombre del archivo en el url() del CSS
 * @returns { css, faltantes }  faltantes = pesos que Google no sirve para esa familia
 */
export async function bajarFamilia({ familia, pesos, destino, prefijoURL = "" }) {
  const url =
    `https://fonts.googleapis.com/css2?family=${familia.replace(/ /g, "+")}` +
    `:wght@${pesos}&display=swap`;

  const css = await fetch(url, { headers: { "User-Agent": UA } }).then((r) => {
    if (!r.ok) throw new Error(`Google Fonts respondió ${r.status} para ${familia}`);
    return r.text();
  });

  // Google no falla si un peso no existe: lo omite en silencio. Si nadie mira,
  // los titulares salen en 700 creyendo que son 900.
  const servidos = new Set([...css.matchAll(/font-weight:\s*(\d+);/g)].map((m) => m[1]));
  const faltantes = pesos.split(";").filter((p) => !servidos.has(p.trim()));

  await fs.mkdir(destino, { recursive: true });

  const bloques = css.split("@font-face").filter((b) => b.includes("url("));
  let salida = "";

  for (const bloque of bloques) {
    const remoto = bloque.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    if (!remoto) continue;

    // latin y latin-ext alcanzan para castellano; el resto es peso muerto.
    const rango = bloque.match(/unicode-range:\s*([^;]+);/)?.[1] ?? "";
    if (rango && !/U\+0000|U\+0100/.test(rango)) continue;

    const nombre = `${slugFamilia(familia)}-${path.basename(remoto)}`;
    const bytes = await fetch(remoto, { headers: { "User-Agent": UA } }).then((r) =>
      r.arrayBuffer(),
    );
    await fs.writeFile(path.join(destino, nombre), Buffer.from(bytes));

    salida += `@font-face${bloque.replace(remoto, `${prefijoURL}${nombre}`)}`;
  }

  return { css: salida, faltantes };
}
