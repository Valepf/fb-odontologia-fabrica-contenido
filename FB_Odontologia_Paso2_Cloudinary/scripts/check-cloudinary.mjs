#!/usr/bin/env node
import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_URL) {
  console.error("Falta CLOUDINARY_URL en .env.local");
  process.exit(1);
}

cloudinary.config({ secure: true });

try {
  const config = cloudinary.config();
  await cloudinary.api.ping();
  console.log("✓ Cloudinary conectado correctamente");
  console.log(`  Cloud name: ${config.cloud_name}`);
  console.log("  API Secret: guardado localmente (no se muestra)");
} catch (error) {
  console.error("✗ No se pudo conectar con Cloudinary.");
  console.error(error?.message ?? String(error));
  process.exit(1);
}
