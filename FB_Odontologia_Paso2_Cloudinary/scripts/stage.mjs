#!/usr/bin/env node
/**
 * Sube los JPG de un carrusel a Cloudinary y lo encola.
 *
 *   node scripts/stage.mjs                 → stagea todo lo renderizado que falte
 *   node scripts/stage.mjs 01-mi-slug      → stagea uno
 *
 * Instagram necesita descargar las imágenes desde URLs públicas. Cloudinary
 * entrega HTTPS públicas (`secure_url`) y queda como nuestra biblioteca de
 * medios para imágenes y, más adelante, reels/videos.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

import { CFG, DIR_OUTPUT, DIR_CONTENT } from "./config.mjs";
import { leerCola, escribirCola, diasDeBuffer, BLOQUES } from "./cola.mjs";
import { leerCarruseles, comparar, slugsBloqueados } from "./repetidos.mjs";

cloudinary.config({ secure: true });

async function revisarFotos(slug) {
  let post;
  try {
    post = JSON.parse(await fs.readFile(path.join(DIR_CONTENT, `${slug}.json`), "utf8"));
  } catch {
    return;
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
  const jpgs = (await fs.readdir(dir)).filter((f) => /^\d{2}\.jpg$/.test(f)).sort();

  if (jpgs.length < 2) {
    throw new Error(`${slug}: sólo ${jpgs.length} imagen(es). Un carrusel necesita al menos 2.`);
  }
  if (jpgs.length > 10) {
    throw new Error(`${slug}: ${jpgs.length} imágenes. Instagram acepta 10 como máximo.`);
  }

  const caption = (await fs.readFile(path.join(dir, "caption.txt"), "utf8")).trim();
  if (caption.length > 2200) {
    throw new Error(
      `${slug}: caption de ${caption.length} caracteres — Instagram corta en 2200. ` +
        `Acortalo en el JSON y re-renderizá.`,
    );
  }

  const imagenes = [];
  for (const jpg of jpgs) {
    const archivo = path.join(dir, jpg);
    const base = path.parse(jpg).name;
    const resultado = await cloudinary.uploader.upload(archivo, {
      resource_type: "image",
      folder: `${CFG.slug}/${slug}`,
      public_id: base,
      overwrite: true,
      unique_filename: false,
      use_filename: false,
    });
    if (!resultado.secure_url) {
      throw new Error(`${jpg}: Cloudinary no devolvió una URL segura.`);
    }
    imagenes.push(resultado.secure_url);
  }

  return { slug, imagenes, caption, stagedEn: new Date().toISOString() };
}

async function main() {
  if (!process.env.CLOUDINARY_URL) {
    console.error(
      "Falta CLOUDINARY_URL.\n\n" +
        "Abrí Cloudinary > Settings > API Keys, copiá la API Environment Variable\n" +
        "y ejecutá CONFIGURAR_CLOUDINARY_WINDOWS.bat.\n",
    );
    process.exit(1);
  }

  const pedido = process.argv[2];
  const cola = await leerCola();

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
      console.log(`✓ ${slug} · ${entrada.imagenes.length} imágenes subidas a Cloudinary`);
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

  if (fallaron) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
