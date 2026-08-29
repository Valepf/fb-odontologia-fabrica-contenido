#!/usr/bin/env node
/**
 * Sube los JPG de un carrusel a Vercel Blob y lo encola.
 *
 *   node scripts/stage.mjs                 → stagea todo lo renderizado que falte
 *   node scripts/stage.mjs 01-mi-slug      → stagea uno
 *
 * Instagram descarga las imágenes por URL, así que tienen que estar en un
 * lugar público. Se stagea desde acá (local) y no desde el cron: así el
 * publicador no necesita más credenciales que las de Instagram, y la cola
 * viaja versionada en el repo.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

import { CFG, DIR_OUTPUT, DIR_CONTENT } from "./config.mjs";
import { leerCola, escribirCola, diasDeBuffer, BLOQUES } from "./cola.mjs";
import { leerCarruseles, comparar, slugsBloqueados } from "./repetidos.mjs";

/**
 * Barrera de compliance: las fotos que empiezan con `placeholder-` son
 * imágenes temporales que sirvieron para validar el layout. No pueden llegar
 * a Instagram por accidente.
 */
async function revisarFotos(slug) {
  let post;
  try {
    post = JSON.parse(await fs.readFile(path.join(DIR_CONTENT, `${slug}.json`), "utf8"));
  } catch {
    return; // Sin JSON no hay nada que revisar.
  }

  const placeholders = (post.slides ?? [])
    .map((s) => s.foto)
    .filter((f) => f?.startsWith("placeholder-"));

  if (placeholders.length) {
    throw new Error(
      `usa fotos placeholder (${[...new Set(placeholders)].join(", ")}). ` +
        `Reemplazalas por fotos definitivas en content-studio/fotos/ antes de encolar.`,
    );
  }
}

async function subirCarrusel(slug) {
  await revisarFotos(slug);
  const dir = path.join(DIR_OUTPUT, slug);

  // Patrón estricto NN.jpg y nada más. iCloud y Finder crean duplicados
  // tipo "03 2.jpg" al sincronizar el Escritorio, y un glob laxo los tomaría
  // como slides reales: el carrusel saldría publicado con placas repetidas
  // y en desorden, sin que nadie se entere.
  const jpgs = (await fs.readdir(dir)).filter((f) => /^\d{2}\.jpg$/.test(f)).sort();
  if (jpgs.length < 2) {
    throw new Error(`${slug}: sólo ${jpgs.length} imagen(es). Un carrusel necesita al menos 2.`);
  }
  if (jpgs.length > 10) {
    throw new Error(`${slug}: ${jpgs.length} imágenes. Instagram acepta 10 como máximo.`);
  }

  const caption = (await fs.readFile(path.join(dir, "caption.txt"), "utf8")).trim();
  // Red de seguridad por si caption.txt se editó a mano después del render.
  if (caption.length > 2200) {
    throw new Error(
      `${slug}: caption de ${caption.length} caracteres — Instagram corta en 2200. ` +
        `Acortalo en el JSON y re-renderizá.`,
    );
  }

  const imagenes = [];
  for (const jpg of jpgs) {
    const bytes = await fs.readFile(path.join(dir, jpg));
    const blob = await put(`${CFG.slug}/${slug}/${jpg}`, bytes, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
    });
    imagenes.push(blob.url);
  }

  return { slug, imagenes, caption, stagedEn: new Date().toISOString() };
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "Falta BLOB_READ_WRITE_TOKEN.\n\n" +
        "Creá un store de Vercel Blob y guardá el token en .env.local:\n" +
        `  vercel blob create-store ${CFG.slug}-contenido --access public\n` +
        "  vercel env pull .env.local\n\n" +
        "Cualquier otro hosting público de imágenes sirve: lo único que\n" +
        "Instagram necesita es una URL que pueda descargar.",
    );
    process.exit(1);
  }

  const pedido = process.argv[2];
  const cola = await leerCola();

  // Barrera anti-repetición: si un carrusel nuevo se parece demasiado a otro
  // ya escrito, no se encola. La regla de oro deja de depender de que alguien
  // lea el índice.
  const { errores } = comparar(await leerCarruseles());
  const repetidos = slugsBloqueados(errores);
  if (errores.length) {
    console.error("Contenido repetido — estos no se encolan:");
    for (const e of errores) {
      console.error(`  ✗ ${e.b} repite a ${e.a} (${Math.round(e.valor * 100)}%)`);
      console.error(`      ${e.motivo}`);
    }
    console.error("");
  }

  const yaEnCola = new Set([
    ...(cola.pendientes ?? []).map((p) => p.slug),
    ...(cola.publicados ?? []).map((p) => p.slug),
  ]);

  let slugs;
  try {
    slugs = (await fs.readdir(DIR_OUTPUT, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    console.error("No hay nada renderizado todavía. Corré: npm run render");
    process.exit(1);
  }

  if (pedido) {
    slugs = slugs.filter((s) => s === pedido);
    if (!slugs.length) {
      console.error(`No encontré content-studio/output/${pedido}/. ¿Lo renderizaste?`);
      process.exit(1);
    }
  } else {
    slugs = slugs.filter((s) => !yaEnCola.has(s));
  }

  if (!slugs.length) {
    console.log("No hay carruseles nuevos para stagear.");
    return;
  }

  let fallaron = 0;
  for (const slug of slugs) {
    if (yaEnCola.has(slug) && pedido) {
      console.log(`· ${slug} ya estaba en la cola, lo salteo`);
      continue;
    }
    if (repetidos.has(slug)) {
      fallaron++;
      console.error(`✗ ${slug}: repite contenido ya escrito. Reescribí el hook o descartalo.`);
      continue;
    }
    try {
      const entrada = await subirCarrusel(slug);
      cola.pendientes.push(entrada);
      console.log(`✓ ${slug} · ${entrada.imagenes.length} imágenes subidas`);
    } catch (error) {
      fallaron++;
      console.error(`✗ ${slug}: ${error.message}`);
    }
  }

  await escribirCola(cola);

  const dias = diasDeBuffer(cola);
  console.log(
    `\nCola: ${cola.pendientes.length} pendientes · ${dias.toFixed(1)} días de buffer ` +
      `(${BLOQUES.length} posts por día)`,
  );
  console.log("Acordate de commitear cola.json para que el publicador lo vea.");

  if (fallaron) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
