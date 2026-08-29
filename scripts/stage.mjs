#!/usr/bin/env node
/**
 * Sube los JPG de un carrusel a Cloudinary y lo encola.
 *
 *   node scripts/stage.mjs                 → stagea todo lo renderizado que falte
 *   node scripts/stage.mjs 01-mi-slug      → stagea uno
 *
 * Instagram necesita descargar las imágenes desde URLs públicas.
 * Cloudinary entrega HTTPS públicas (`secure_url`) y funciona como
 * biblioteca de medios para imágenes y, más adelante, reels/videos.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

import { CFG, DIR_OUTPUT, DIR_CONTENT } from "./config.mjs";
import { leerCola, escribirCola, diasDeBuffer, BLOQUES } from "./cola.mjs";
import { leerCarruseles, comparar, slugsBloqueados } from "./repetidos.mjs";


function configurarCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error(
      "Faltan las credenciales de Cloudinary en .env.local.\n\n" +
      "El archivo debe contener:\n" +
      "CLOUDINARY_CLOUD_NAME=...\n" +
      "CLOUDINARY_API_KEY=...\n" +
      "CLOUDINARY_API_SECRET=...\n",
    );

    process.exit(1);
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}


async function revisarFotos(slug) {
  let post;

  try {
    post = JSON.parse(
      await fs.readFile(
        path.join(DIR_CONTENT, `${slug}.json`),
        "utf8",
      ),
    );
  } catch {
    return;
  }

  const placeholders = (post.slides ?? [])
    .map((slide) => slide.foto)
    .filter((foto) => foto?.startsWith("placeholder-"));

  if (placeholders.length) {
    throw new Error(
      `usa fotos placeholder (${[...new Set(placeholders)].join(", ")}). ` +
      "Reemplazalas por fotos definitivas en content-studio/fotos/ antes de encolar.",
    );
  }
}


async function subirCarrusel(slug) {
  await revisarFotos(slug);

  const dir = path.join(DIR_OUTPUT, slug);

  const jpgs = (await fs.readdir(dir))
    .filter((archivo) => /^\d{2}\.jpg$/.test(archivo))
    .sort();

  if (jpgs.length < 2) {
    throw new Error(
      `${slug}: sólo ${jpgs.length} imagen(es). ` +
      "Un carrusel necesita al menos 2.",
    );
  }

  if (jpgs.length > 10) {
    throw new Error(
      `${slug}: ${jpgs.length} imágenes. ` +
      "Instagram acepta 10 como máximo.",
    );
  }

  const captionPath = path.join(dir, "caption.txt");

  const caption = (
    await fs.readFile(captionPath, "utf8")
  ).trim();

  if (caption.length > 2200) {
    throw new Error(
      `${slug}: caption de ${caption.length} caracteres. ` +
      "Instagram acepta hasta 2200. Acortalo en el JSON y volvé a renderizar.",
    );
  }

  const imagenes = [];

  for (const jpg of jpgs) {
    const archivo = path.join(dir, jpg);
    const base = path.parse(jpg).name;

    console.log(`  Subiendo ${jpg}...`);

    const resultado = await cloudinary.uploader.upload(
      archivo,
      {
        resource_type: "image",
        folder: `${CFG.slug}/${slug}`,
        public_id: base,
        overwrite: true,
        unique_filename: false,
        use_filename: false,
      },
    );

    if (!resultado.secure_url) {
      throw new Error(
        `${jpg}: Cloudinary no devolvió una URL segura.`,
      );
    }

    imagenes.push(resultado.secure_url);
  }

  return {
    slug,
    imagenes,
    caption,
    stagedEn: new Date().toISOString(),
  };
}


async function main() {
  configurarCloudinary();

  const pedido = process.argv[2];
  const cola = await leerCola();

  const { errores } = comparar(
    await leerCarruseles(),
  );

  const repetidos = slugsBloqueados(errores);

  if (errores.length) {
    console.error(
      "Contenido repetido — estos carruseles no se encolarán:",
    );

    for (const error of errores) {
      console.error(
        `  ✗ ${error.b} repite a ${error.a} ` +
        `(${Math.round(error.valor * 100)}%)`,
      );

      console.error(
        `      ${error.motivo}`,
      );
    }

    console.error("");
  }

  const yaEnCola = new Set([
    ...(cola.pendientes ?? []).map(
      (post) => post.slug,
    ),
    ...(cola.publicados ?? []).map(
      (post) => post.slug,
    ),
  ]);

  let slugs;

  try {
    slugs = (
      await fs.readdir(
        DIR_OUTPUT,
        { withFileTypes: true },
      )
    )
      .filter(
        (entrada) => entrada.isDirectory(),
      )
      .map(
        (entrada) => entrada.name,
      )
      .sort();
  } catch {
    console.error(
      "No hay contenido renderizado todavía.",
    );

    console.error(
      "Ejecutá primero: npm run render",
    );

    process.exit(1);
  }

  if (pedido) {
    slugs = slugs.filter(
      (slug) => slug === pedido,
    );

    if (!slugs.length) {
      console.error(
        `No encontré content-studio/output/${pedido}/`,
      );

      console.error(
        "Verificá que el carrusel esté renderizado.",
      );

      process.exit(1);
    }
  } else {
    slugs = slugs.filter(
      (slug) => !yaEnCola.has(slug),
    );
  }

  if (!slugs.length) {
    console.log(
      "No hay carruseles nuevos para subir.",
    );

    return;
  }

  let fallaron = 0;

  for (const slug of slugs) {
    if (yaEnCola.has(slug) && pedido) {
      console.log(
        `· ${slug} ya estaba en la cola. Se omite.`,
      );

      continue;
    }

    if (repetidos.has(slug)) {
      fallaron++;

      console.error(
        `✗ ${slug}: repite contenido ya escrito. ` +
        "Reescribí el hook o descartalo.",
      );

      continue;
    }

    try {
      console.log(`\nProcesando ${slug}...`);

      const entrada = await subirCarrusel(slug);

      cola.pendientes.push(entrada);

      console.log(
        `✓ ${slug}: ${entrada.imagenes.length} ` +
        "imágenes subidas correctamente a Cloudinary.",
      );
    } catch (error) {
      fallaron++;

      console.error(
        `✗ ${slug}: ${error?.message ?? error}`,
      );
    }
  }

  await escribirCola(cola);

  const dias = diasDeBuffer(cola);

  console.log(
    `\nCola: ${cola.pendientes.length} pendientes · ` +
    `${dias.toFixed(1)} días de buffer ` +
    `(${BLOQUES.length} posts por día)`,
  );

  if (fallaron) {
    process.exitCode = 1;
  }
}


main().catch((error) => {
  console.error(
    "Error inesperado:",
    error?.message ?? error,
  );

  process.exit(1);
});