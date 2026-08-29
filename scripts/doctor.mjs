#!/usr/bin/env node
/**
 * El médico del sistema.
 *   npm run doctor
 *
 * Chequea la máquina, la configuración, el repo, las credenciales y la cola,
 * y por cada problema imprime EL ARREGLO EXACTO. Se corre en tres momentos:
 * recién montado el proyecto, después de conectar Instagram, y cada vez que
 * algo no anda — antes de leer cualquier documentación.
 *
 * ✗ = bloquea alguna parte del sistema.  ⚠ = todavía falta, pero no rompe.
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { estaConfigurado, quienSoy, esInstagramLogin } from "./instagram.mjs";

const ejecutar = promisify(execFile);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let problemas = 0;
let avisos = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const mal = (m, fix) => {
  problemas++;
  console.log(`  ✗ ${m}`);
  if (fix) console.log(`      → ${fix}`);
};
const ojo = (m, fix) => {
  avisos++;
  console.log(`  ⚠ ${m}`);
  if (fix) console.log(`      → ${fix}`);
};
const seccion = (t) => console.log(`\n${t}`);

/* --- La máquina --------------------------------------------------------- */
seccion("La máquina");

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor >= 22) ok(`Node ${process.versions.node}`);
else mal(`Node ${process.versions.node} — se necesita 22 o más nuevo`, "instalalo de nodejs.org");

if (existsSync(path.join(RAIZ, "node_modules"))) ok("dependencias instaladas");
else mal("falta node_modules", "npm install");

/* marca.json es la base de todo: si no parsea, el resto no se puede chequear. */
let CFG, encontrarChrome;
try {
  ({ CFG, encontrarChrome } = await import("./config.mjs"));
} catch (e) {
  mal(`marca.json no se puede leer: ${e.message.split("\n")[0]}`, "corregí el JSON y volvé a correr el doctor");
  console.log(`\n✗ ${problemas} problema(s) — sin marca.json no se puede chequear el resto.`);
  process.exit(1);
}

const chrome = await encontrarChrome();
if (chrome) ok(`Chrome en ${chrome}`);
else mal("no encontré Chrome (lo usa el render)", "instalalo, o CHROME_PATH=/ruta/al/binario en .env.local");

/* --- La marca ------------------------------------------------------------ */
seccion("La marca (marca.json)");

const placeholders = [
  ["marca", "NOMBRE DE LA MARCA"],
  ["slug", "nombre-corto"],
  ["cuenta", "usuario_de_instagram_sin_arroba"],
  ["dominio", "sitio.com"],
].filter(([campo, valor]) => CFG[campo] === valor);

if (placeholders.length) {
  mal(
    `campos sin completar: ${placeholders.map(([c]) => c).join(", ")}`,
    "completá marca.json con los datos del brief (bloque 5)",
  );
} else {
  ok(`${CFG.marca} · @${CFG.cuenta} · ${CFG.dominio}`);
}

try {
  new Intl.DateTimeFormat("en-CA", { timeZone: CFG.zona });
  ok(`zona horaria ${CFG.zona}`);
} catch {
  mal(`zona horaria inválida: "${CFG.zona}"`, 'usá un nombre IANA, ej. "America/Argentina/Buenos_Aires" o "America/Mexico_City"');
}

if (
  Array.isArray(CFG.bloques) &&
  CFG.bloques.length &&
  CFG.bloques.every((b) => b.nombre && Number.isFinite(b.desde))
) {
  ok(`${CFG.bloques.length} bloque(s) de publicación: ${CFG.bloques.map((b) => `${b.nombre}≥${b.desde}h`).join(" · ")}`);
} else {
  mal("bloques mal definidos", 'cada bloque necesita nombre y hora: [{ "nombre": "diario", "desde": 15 }]');
}

if (Array.isArray(CFG.categorias) && CFG.categorias.length) ok(`categorías: ${CFG.categorias.join(" · ")}`);
else mal("faltan las categorías", 'definí 3–4 en marca.json, ej. ["producto", "uso", "confianza", "marca"]');

for (const archivo of ["README.md", "CLAUDE.md"]) {
  try {
    const texto = await fs.readFile(path.join(RAIZ, archivo), "utf8");
    if (/<MARCA>|<cuenta>|<dominio>/.test(texto)) {
      ojo(`${archivo} todavía tiene marcadores <MARCA>/<cuenta>/<dominio>`, "reemplazalos: es lo que lee cualquier sesión de Claude en este repo");
    }
  } catch {}
}

/* --- El template ---------------------------------------------------------- */
seccion("El template");

if (existsSync(path.join(RAIZ, "content-studio", "template", "fonts", "fuentes.css"))) {
  ok("tipografías embebidas");
} else {
  mal("tipografías sin bajar (el render saldría con la fuente del sistema)", "npm run fuentes  ·  para elegirlas antes: npm run tipografias");
}

if (CFG.logo === "imagen") {
  const faltan = ["logo-para-fondo-claro.png", "logo-para-fondo-oscuro.png"].filter(
    (f) => !existsSync(path.join(RAIZ, "content-studio", "template", f)),
  );
  if (faltan.length) mal(`logo: falta ${faltan.join(" y ")}`, 'agregá los PNG con alpha en content-studio/template/, o poné "logo": "texto" en marca.json');
  else ok("logo en imagen, las dos versiones");
} else {
  ok("logo tipográfico (el nombre en la display)");
}

/* --- Git y el cron -------------------------------------------------------- */
seccion("Git y el cron");

if (existsSync(path.join(RAIZ, ".git"))) ok("repositorio git");
else mal("esto no es un repo git", "git init && git add -A && git commit -m 'inicio'");

let hayRemote = false;
try {
  const { stdout } = await ejecutar("git", ["remote", "get-url", "origin"], { cwd: RAIZ });
  hayRemote = true;
  ok(`remote: ${stdout.trim()}`);
} catch {
  mal("sin remote de GitHub (el cron que publica vive ahí)", "creá un repo en github.com y: git remote add origin <url> && git push -u origin main");
}

if (existsSync(path.join(RAIZ, ".github", "workflows", "publicar-instagram.yml"))) ok("workflow del publicador presente");
else mal("falta .github/workflows/publicar-instagram.yml", "recopialo de la plantilla de la skill");

let ghOk = false;
try {
  await ejecutar("gh", ["auth", "status"], { cwd: RAIZ });
  ghOk = true;
  ok("gh CLI autenticado");
} catch {
  ojo("gh CLI sin autenticar", "brew install gh && gh auth login — sin esto, ig:setup no puede cargar los secrets solo (se pueden cargar a mano)");
}

if (ghOk && hayRemote) {
  try {
    const { stdout } = await ejecutar("gh", ["secret", "list"], { cwd: RAIZ });
    const faltan = ["IG_GRAPH_BASE", "IG_USER_ID", "IG_ACCESS_TOKEN"].filter((s) => !stdout.includes(s));
    if (!faltan.length) ok("secrets del cron cargados");
    else ojo(`faltan secrets: ${faltan.join(", ")}`, "IG_TOKEN='EAAG…' npm run ig:setup los carga solo");
  } catch {
    ojo("no pude listar los secrets del repo", "verificá con: gh secret list");
  }
}

/* --- Instagram y el hosting ------------------------------------------------ */
seccion("Instagram y el hosting de imágenes");

if (process.env.BLOB_READ_WRITE_TOKEN) ok("token de Vercel Blob en .env.local");
else ojo("sin BLOB_READ_WRITE_TOKEN (npm run stage no va a poder subir)", `vercel blob store add ${CFG.slug}-contenido && vercel env pull .env.local`);

if (!estaConfigurado()) {
  ojo("Instagram sin conectar — el sistema corre en modo simulacro", "guía en references/meta.md de la skill, después: IG_TOKEN='EAAG…' npm run ig:setup");
} else {
  try {
    const usuario = await quienSoy();
    const camino = esInstagramLogin() ? "Instagram Login (60 días, se renueva solo)" : "System User (no vence)";
    ok(`conectado como @${usuario} · ${camino}`);
    if (usuario && usuario !== CFG.cuenta) ojo(`la cuenta conectada (@${usuario}) no es la de marca.json (@${CFG.cuenta})`, "corregí la que esté mal");
  } catch (e) {
    mal(`el token no responde: ${e.message}`, "generá un token nuevo (references/meta.md) y corré npm run ig:setup");
  }
}

/* --- El contenido y la cola ------------------------------------------------ */
seccion("El contenido y la cola");

let jsons = [];
try {
  jsons = (await fs.readdir(path.join(RAIZ, "content-studio", "content"))).filter((f) => f.endsWith(".json"));
} catch {}

if (!jsons.length) {
  ojo("no hay ningún carrusel escrito", "escribí el primero con /carrusel en Claude Code");
} else if (jsons.length === 1 && jsons[0] === "00-ejemplo.json") {
  ok("sólo el carrusel de ejemplo — escribí el primero real con /carrusel");
} else {
  ok(`${jsons.length} carruseles escritos`);
  if (jsons.includes("00-ejemplo.json")) ojo("00-ejemplo.json sigue ahí", "borralo: era la pieza de prueba del esqueleto");
}

try {
  const { leerCola, diasDeBuffer } = await import("./cola.mjs");
  const cola = await leerCola();
  const dias = diasDeBuffer(cola);
  if (cola.pendientes.length) ok(`cola: ${cola.pendientes.length} pendientes · ${dias.toFixed(1)} días de buffer · ${cola.publicados.length} publicados`);
  else if (cola.publicados.length) ojo(`cola vacía (${cola.publicados.length} ya publicados) — mañana no sale nada`, "corré /producir-contenido en Claude Code");
  else ojo("cola vacía — todavía no se encoló nada", "npm run stage cuando haya un carrusel renderizado");
} catch (e) {
  mal(`cola.json no se puede leer: ${e.message.split("\n")[0]}`, "corregí el JSON (o restauralo de git: git checkout cola.json)");
}

/* --- Resumen ---------------------------------------------------------------- */
console.log("");
if (!problemas && !avisos) console.log("✓ Todo en orden.");
else console.log(`${problemas ? `✗ ${problemas} problema(s)` : "✓ Sin problemas"} · ⚠ ${avisos} aviso(s)`);
if (problemas) console.log("Arreglá los ✗ en orden: cada uno trae su comando.");
process.exit(problemas ? 1 : 0);
