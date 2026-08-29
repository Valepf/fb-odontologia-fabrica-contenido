#!/usr/bin/env node
import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error("Faltan datos de Cloudinary en .env.local");
  console.error("Se necesitan:");
  console.error("CLOUDINARY_CLOUD_NAME");
  console.error("CLOUDINARY_API_KEY");
  console.error("CLOUDINARY_API_SECRET");
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

try {
  await cloudinary.api.ping();

  console.log("✓ Cloudinary conectado correctamente");
  console.log(`  Cloud name: ${cloudName}`);
  console.log("  API Key: detectada");
  console.log("  API Secret: guardado localmente (no se muestra)");
} catch (error) {
  console.error("✗ No se pudo conectar con Cloudinary");
  console.error("Mensaje:", error?.error?.message ?? error?.message ?? error);
  process.exit(1);
}