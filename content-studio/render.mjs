#!/usr/bin/env node
/**
 * Render de carruseles.
 *
 *   node content-studio/render.mjs              → renderiza todos los JSON
 *   node content-studio/render.mjs 01-mi-slug   → renderiza uno
 *
 * Motor: puppeteer-core apuntando al Chrome que ya está instalado en la
 * máquina. No descarga un navegador ni paga una API de imágenes.
 * Costo por carrusel: $0.
 *
 * Salida: content-studio/output/<slug>/01.jpg … NN.jpg + caption.txt
 * JPEG y no PNG porque la Graph API de Instagram sólo acepta JPEG.
 */

import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

import {
  DIR_CONTENT,
  DIR_OUTPUT,
  DIR_FOTOS,
  DIR_TEMPLATE,
  encontrarChrome,
} from "../scripts/config.mjs";
import { documentoHTML, estiloPara, CATEGORIAS } from "./template/slides.mjs";

const ANCHO = 1080;
const ALTO = 1350;
const CALIDAD = 92;

/* --- Límites de copy ------------------------------------------------------
 * El auto-ajuste de fuente salva el layout, no la legibilidad en un celular.
 * Por eso los límites se respetan igual: acá se avisan, no se toleran.
 * ------------------------------------------------------------------------ */
const LIMITES = {
  portada: { titulo: 55, bajada: 120 },
  punto: { titulo: 45, texto: 190 },
  lista: { titulo: 45, items: 55 },
  frase: { texto: 70 },
  stat: { pie: 60, nota: 150 },
  foto: { titulo: 45, texto: 160 },
  cta: { titulo: 60, nota: 140 },
};

function revisarCopy(post) {
  const avisos = [];
  post.slides.forEach((s, i) => {
    const lim = LIMITES[s.tipo] ?? {};
    const n = String(i + 1).padStart(2, "0");
    for (const [campo, max] of Object.entries(lim)) {
      const valor = s[campo];
      if (typeof valor === "string" && valor.length > max) {
        avisos.push(`  slide ${n} (${s.tipo}) · ${campo}: ${valor.length}/${max} caracteres`);
      }
      if (campo === "items" && Array.isArray(valor)) {
        valor.forEach((it, j) => {
          if (String(it).length > max) {
            avisos.push(`  slide ${n} (lista) · item ${j + 1}: ${String(it).length}/${max}`);
          }
        });
      }
    }
    if (s.tipo === "lista" && (s.items?.length ?? 0) > 5) {
      avisos.push(`  slide ${n} (lista): ${s.items.length} ítems — el máximo son 5`);
    }
  });
  return avisos;
}

async function validar(post, slug) {
  const problemas = [];

  if (!Array.isArray(post.slides) || post.slides.length < 2) {
    problemas.push("Un carrusel necesita al menos 2 slides");
  }
  // Instagram no publica carruseles de más de 10 imágenes.
  if (post.slides?.length > 10) {
    problemas.push(`${post.slides.length} slides — Instagram acepta 10 como máximo`);
  }
  if (!CATEGORIAS.includes(post.categoria)) {
    problemas.push(`Categoría "${post.categoria}" — válidas: ${CATEGORIAS.join(", ")}`);
  }
  if (!post.caption?.trim()) {
    problemas.push("Falta el caption");
  }

  // El caption que se publica es caption + hashtags. Instagram corta en 2.200
  // caracteres y acepta 30 hashtags como máximo — y sin esta validación el
  // error aparece en el cron, a la hora de publicar, cuando nadie está mirando.
  const hashtags = post.hashtags ?? [];
  const captionFinal =
    `${(post.caption ?? "").trim()}${hashtags.length ? `\n\n${hashtags.join(" ")}` : ""}`;
  if (captionFinal.length > 2200) {
    problemas.push(
      `caption de ${captionFinal.length} caracteres (hashtags incluidos) — Instagram corta en 2200`,
    );
  }
  if (hashtags.length > 30) {
    problemas.push(`${hashtags.length} hashtags — Instagram acepta 30 como máximo`);
  }
  if (post.slides?.[0]?.tipo !== "portada") {
    problemas.push("El primer slide tiene que ser una portada");
  }
  if (post.estilo) {
    problemas.push("El JSON no lleva campo 'estilo': la rotación la decide el número del slug");
  }

  // Las fotos referenciadas tienen que existir antes de renderizar.
  for (const s of post.slides ?? []) {
    if (s.foto) {
      try {
        await fs.access(path.join(DIR_FOTOS, s.foto));
      } catch {
        problemas.push(`Falta la foto content-studio/fotos/${s.foto}`);
      }
    }
  }

  if (problemas.length) {
    throw new Error(`${slug} no es válido:\n  · ${problemas.join("\n  · ")}`);
  }
}

/**
 * Reduce --escala del slide hasta que el cuerpo entre. Es la red de seguridad,
 * no la solución: si un slide baja de 0.85 el copy es demasiado largo y hay
 * que acortarlo.
 */
async function ajustar(page) {
  return page.evaluate(() => {
    const ajustes = [];
    document.querySelectorAll(".slide").forEach((slide, i) => {
      const cuerpo = slide.querySelector(".cuerpo");
      if (!cuerpo) return;
      let escala = 1;
      while (cuerpo.scrollHeight > cuerpo.clientHeight + 1 && escala > 0.7) {
        escala = Math.round((escala - 0.02) * 100) / 100;
        slide.style.setProperty("--escala", String(escala));
      }
      if (escala < 1) ajustes.push({ slide: i + 1, escala });
    });
    return ajustes;
  });
}

async function renderizar(browser, archivo) {
  const slug = path.basename(archivo, ".json");
  const post = JSON.parse(await fs.readFile(path.join(DIR_CONTENT, archivo), "utf8"));
  post.slug ??= slug;

  await validar(post, slug);

  const avisos = revisarCopy(post);

  // El HTML se escribe dentro de template/ para que `style.css`, las fuentes
  // y `../fotos/` resuelvan por ruta relativa. Queda como preview abrible.
  const html = documentoHTML(post);
  const preview = path.join(DIR_TEMPLATE, ".preview.html");
  await fs.writeFile(preview, html, "utf8");

  const page = await browser.newPage();
  await page.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: 1 });
  await page.goto(`file://${preview}`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");

  const ajustes = await ajustar(page);

  const destino = path.join(DIR_OUTPUT, slug);
  await fs.rm(destino, { recursive: true, force: true });
  await fs.mkdir(destino, { recursive: true });

  const slides = await page.$$(".slide");
  for (const [i, slide] of slides.entries()) {
    await slide.screenshot({
      path: path.join(destino, `${String(i + 1).padStart(2, "0")}.jpg`),
      type: "jpeg",
      quality: CALIDAD,
    });
  }

  const hashtags = (post.hashtags ?? []).join(" ");
  await fs.writeFile(
    path.join(destino, "caption.txt"),
    `${post.caption.trim()}${hashtags ? `\n\n${hashtags}` : ""}\n`,
    "utf8",
  );

  await page.close();

  return { slug, slides: slides.length, estilo: estiloPara(post.slug), avisos, ajustes };
}

async function main() {
  const pedido = process.argv[2];

  let archivos = (await fs.readdir(DIR_CONTENT)).filter((f) => f.endsWith(".json")).sort();

  if (pedido) {
    const buscado = pedido.replace(/\.json$/, "");
    archivos = archivos.filter((f) => path.basename(f, ".json") === buscado);
    if (!archivos.length) {
      console.error(`No encontré content-studio/content/${buscado}.json`);
      process.exit(1);
    }
  }

  if (!archivos.length) {
    console.log("No hay JSON en content-studio/content/ todavía.");
    return;
  }

  const chrome = await encontrarChrome();
  if (!chrome) {
    console.error(
      `No encontré Chrome en ninguna ruta conocida.\n` +
        `Instalalo o pasá la ruta con CHROME_PATH=... npm run render`,
    );
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    args: ["--no-sandbox", "--allow-file-access-from-files", "--font-render-hinting=none"],
  });

  let fallaron = 0;

  // Si un carrusel falla se sigue con los demás y se reporta al final.
  for (const archivo of archivos) {
    try {
      const r = await renderizar(browser, archivo);
      console.log(`✓ ${r.slug} · ${r.slides} slides · estilo ${r.estilo}`);
      if (r.avisos.length) {
        console.log(`  ⚠ copy fuera de límite:\n${r.avisos.join("\n")}`);
      }
      for (const a of r.ajustes) {
        const nota = a.escala < 0.85 ? " ← acortá el texto" : "";
        console.log(`  ⚠ slide ${a.slide} achicado a ${a.escala}${nota}`);
      }
    } catch (error) {
      fallaron++;
      console.error(`✗ ${path.basename(archivo, ".json")}: ${error.message}`);
    }
  }

  await browser.close();

  console.log(`\n${archivos.length - fallaron}/${archivos.length} carruseles renderizados.`);
  if (fallaron) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
