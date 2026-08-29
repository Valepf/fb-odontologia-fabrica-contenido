/**
 * Configuración de la marca. Todo lo que cambia entre un cliente y otro vive
 * en `marca.json` — los scripts y el template no se tocan.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const CFG = JSON.parse(await fs.readFile(path.join(RAIZ, "marca.json"), "utf8"));

export const DIR_CONTENT = path.join(RAIZ, "content-studio", "content");

/* Dónde puede estar Chrome. La búsqueda vive acá porque la usan el render,
   el probador de tipografías, la grilla y el doctor. */
const CHROMES = [
  process.env.CHROME_PATH,

  // Windows: Chrome, Edge y Brave en sus ubicaciones habituales.
  process.env.PROGRAMFILES
    ? path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe")
    : null,
  process.env["PROGRAMFILES(X86)"]
    ? path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe")
    : null,
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
    : null,
  process.env.PROGRAMFILES
    ? path.join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe")
    : null,
  process.env["PROGRAMFILES(X86)"]
    ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe")
    : null,
  process.env.PROGRAMFILES
    ? path.join(process.env.PROGRAMFILES, "BraveSoftware", "Brave-Browser", "Application", "brave.exe")
    : null,

  // macOS / Linux.
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

export async function encontrarChrome() {
  for (const ruta of CHROMES) {
    try {
      await fs.access(ruta);
      return ruta;
    } catch {}
  }
  return null;
}
export const DIR_OUTPUT = path.join(RAIZ, "content-studio", "output");
export const DIR_FOTOS = path.join(RAIZ, "content-studio", "fotos");
export const DIR_TEMPLATE = path.join(RAIZ, "content-studio", "template");
