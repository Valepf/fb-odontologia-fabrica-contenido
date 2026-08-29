#!/usr/bin/env node
/**
 * Conecta la cuenta de Instagram al sistema.
 *
 *   IG_TOKEN='EAAG...' npm run ig:setup
 *
 * Detecta solo cuál de los dos caminos tenés armado:
 *
 *   · Business Manager + System User  →  graph.facebook.com
 *     El token no vence. Es el mejor para un cron.
 *
 *   · Instagram API con Instagram Login  →  graph.instagram.com
 *     No necesita página de Facebook. El token dura 60 días.
 *
 * Averigua el ID de la cuenta, lo escribe en .env.local y carga los secrets
 * del repo, que es lo que usa el publicador. El token entra por variable de
 * entorno y nunca se imprime completo.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { RAIZ, CFG } from "./config.mjs";

const ejecutar = promisify(execFile);
const ENV_LOCAL = path.join(RAIZ, ".env.local");

// Dos formas de pasarlo: por variable de entorno, o pegándolo en .env.local
// como IG_ACCESS_TOKEN (el npm script carga ese archivo). La segunda evita
// que el token quede en el historial del shell.
const token = (process.env.IG_TOKEN ?? process.env.IG_ACCESS_TOKEN)?.trim();
const CUENTA_ESPERADA = CFG.cuenta;

// De más nueva a más vieja: se usa la primera que responda.
const VERSIONES_FB = ["v23.0", "v22.0", "v21.0", "v20.0"];
const VERSIONES_IG = ["v25.0", "v24.0", "v23.0", "v22.0"];

const enmascarar = (t) => `${t.slice(0, 6)}…${t.slice(-4)} (${t.length} caracteres)`;

if (!token) {
  console.error(`Falta el token. Hay dos formas de pasarlo:

  a) por variable de entorno, con comillas simples:
       IG_TOKEN='EAAG...' npm run ig:setup

  b) pegándolo en .env.local, así no queda en el historial del shell:
       IG_ACCESS_TOKEN=EAAG...
     y después: npm run ig:setup

Si usás Business Manager, es el token de tu System User.
Si no, generalo en: tu app → Instagram → API setup with Instagram login.`);
  process.exit(1);
}

async function pedir(base, ruta, params = {}) {
  const url = new URL(`${base}${ruta}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const r = await fetch(url);
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok, estado: r.status, json, error: json?.error?.message };
}

/* --- Camino 1: Business Manager + System User ------------------------- */

async function viaBusinessManager() {
  for (const v of VERSIONES_FB) {
    const base = `https://graph.facebook.com/${v}`;
    const r = await pedir(base, "/me/accounts", {
      fields: "name,instagram_business_account{id,username}",
      limit: "200",
    });

    // Versión inexistente: probar la siguiente.
    if (!r.ok && /version/i.test(r.error ?? "")) continue;

    if (!r.ok) return { base, fallo: r.error };

    const paginas = r.json.data ?? [];
    const conIg = paginas.filter((p) => p.instagram_business_account);
    return { base, paginas, conIg };
  }
  return { fallo: "ninguna versión de la Graph API respondió" };
}

/* --- Camino 2: Instagram API con Instagram Login ---------------------- */

async function viaInstagramLogin() {
  for (const v of VERSIONES_IG) {
    const base = `https://graph.instagram.com/${v}`;
    const r = await pedir(base, "/me", { fields: "user_id,username,account_type" });
    if (!r.ok && /version/i.test(r.error ?? "")) continue;
    if (!r.ok) return { base, fallo: r.error };
    return { base, cuenta: r.json };
  }
  return { fallo: "ninguna versión respondió" };
}

/* --- Detección --------------------------------------------------------- */

console.log(`Token: ${enmascarar(token)}`);
console.log("Probando Business Manager (graph.facebook.com)…");

let base;
let igUserId;
let usuario;
let camino;

const bm = await viaBusinessManager();

if (bm.conIg?.length) {
  camino = "Business Manager · System User";
  base = bm.base;

  const elegida =
    bm.conIg.find((p) => p.instagram_business_account.username === CUENTA_ESPERADA) ??
    (bm.conIg.length === 1 ? bm.conIg[0] : null);

  if (!elegida) {
    console.error(`\n✗ Tu token ve varias cuentas de Instagram y ninguna es @${CUENTA_ESPERADA}:`);
    for (const p of bm.conIg) {
      console.error(`    @${p.instagram_business_account.username}  (página "${p.name}")`);
    }
    console.error(`\nCorregí "cuenta" en marca.json, o fijá IG_USER_ID a mano en .env.local.`);
    process.exit(1);
  }

  igUserId = elegida.instagram_business_account.id;
  usuario = elegida.instagram_business_account.username;
  console.log(`\n✓ Encontrada por la página "${elegida.name}"`);
} else {
  const detalle = bm.fallo
    ? `la API respondió: ${bm.fallo}`
    : `el token no ve ninguna página con cuenta de Instagram vinculada`;
  console.log(`  · Sin resultados por Business Manager (${detalle})`);
  console.log("Probando Instagram Login (graph.instagram.com)…");

  const ig = await viaInstagramLogin();
  if (ig.fallo || !ig.cuenta) {
    console.error(`\n✗ El token no sirve por ninguno de los dos caminos.`);
    console.error(`   Business Manager: ${bm.fallo ?? "sin páginas con Instagram vinculado"}`);
    console.error(`   Instagram Login:  ${ig.fallo ?? "sin cuenta"}`);
    console.error(`
Si usás Business Manager, revisá que el System User tenga acceso de activo a:
  · la página de Facebook vinculada a @${CUENTA_ESPERADA}
  · la cuenta de Instagram
y que el token se haya generado con los permisos:
  instagram_basic · instagram_content_publish · pages_show_list · pages_read_engagement`);
    process.exit(1);
  }

  camino = "Instagram API con Instagram Login";
  base = ig.base;
  igUserId = ig.cuenta.user_id ?? ig.cuenta.id;
  usuario = ig.cuenta.username;
}

console.log(`\n✓ Camino: ${camino}`);
console.log(`  API:         ${base}`);
console.log(`  cuenta:      @${usuario}`);
console.log(`  IG_USER_ID:  ${igUserId}`);

if (usuario !== CUENTA_ESPERADA) {
  console.log(`\n  ⚠ Ojo: la cuenta esperada era @${CUENTA_ESPERADA}.`);
}

/* --- Confirmar que se puede publicar ----------------------------------- */

const prueba = await pedir(base, `/${igUserId}/media`, { limit: "1" });
if (!prueba.ok) {
  console.log(`\n  ⚠ Puedo leer la cuenta pero no su feed: ${prueba.error}`);
  console.log(`    Suele faltar el permiso instagram_content_publish en el token.`);
} else {
  console.log(`  publicación: ✓ el token accede al feed de la cuenta`);
}

/* --- Guardar ----------------------------------------------------------- */

let env = "";
try {
  env = await fs.readFile(ENV_LOCAL, "utf8");
} catch {}

function fijar(texto, clave, valor) {
  const linea = `${clave}=${valor}`;
  const patron = new RegExp(`^${clave}=.*$`, "m");
  return patron.test(texto) ? texto.replace(patron, linea) : `${texto.trimEnd()}\n${linea}\n`;
}

env = fijar(env, "IG_GRAPH_BASE", base);
env = fijar(env, "IG_USER_ID", igUserId);
env = fijar(env, "IG_ACCESS_TOKEN", token);
await fs.writeFile(ENV_LOCAL, env.trimStart(), "utf8");
console.log(`\n✓ Guardado en .env.local (ignorado por git)`);

console.log("\nCargando los secrets del repo para que pueda publicar el cron…");
try {
  for (const [clave, valor] of [
    ["IG_GRAPH_BASE", base],
    ["IG_USER_ID", String(igUserId)],
    ["IG_ACCESS_TOKEN", token],
  ]) {
    await ejecutar("gh", ["secret", "set", clave, "--body", valor], { cwd: RAIZ });
    console.log(`  ✓ ${clave}`);
  }
  console.log("\nListo. Probalo sin publicar nada:  npm run publicar:simulacro");
} catch (error) {
  console.log(`\n  ⚠ No pude cargar los secrets con gh: ${error.message.split("\n")[0]}`);
  console.log(`  Cargalos a mano en GitHub → Settings → Secrets and variables → Actions:`);
  console.log(`     IG_GRAPH_BASE   = ${base}`);
  console.log(`     IG_USER_ID      = ${igUserId}`);
  console.log(`     IG_ACCESS_TOKEN = (el mismo token)`);
}

if (base.includes("graph.instagram.com")) {
  console.log(
    `\nEl token dura 60 días, pero el publicador lo renueva en cada corrida que\n` +
      `publica. Publicando todos los días, no vence nunca.`,
  );
} else {
  console.log(`\nEl token de System User no vence: no hay que renovarlo nunca.`);
}
