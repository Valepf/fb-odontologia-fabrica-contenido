# F.B. Odontología · Inicio en Windows

Esta versión está preparada para comprobar primero el **render local**. Todavía no conecta Instagram ni publica nada.

## Paso 1 · Extraer la carpeta

Descomprimí el ZIP en una carpeta simple, por ejemplo:

`C:\Users\Valeria\OneDrive\Desktop\FB_Contenido`

Evitá trabajar directamente dentro del ZIP.

## Paso 2 · Comprobar Node.js

El proyecto está preparado para **Node.js 22**.

Abrí PowerShell dentro de la carpeta y ejecutá:

```powershell
node --version
npm --version
```

Si `node` no existe, instalamos Node.js antes de seguir.

## Paso 3 · Instalación automática

Hacé doble clic en:

`INSTALAR_WINDOWS.bat`

El archivo:

1. comprueba Node;
2. crea `.env.local` sin credenciales;
3. ejecuta `npm install`;
4. descarga las tipografías web de la marca.

## Paso 4 · Primer carrusel

Hacé doble clic en:

`RENDER_PRUEBA_WINDOWS.bat`

Si todo está correcto se crea:

`content-studio\output\01-bienvenida-fb\`

con cinco JPG de 1080 × 1350 y `caption.txt`.

## Paso 5 · No conectar Instagram todavía

Primero aprobamos la estética del carrusel. Después avanzamos con GitHub, Vercel Blob y Meta/Instagram.

## Si aparece un error

No cambies archivos al azar. Copiá el texto completo de la ventana o mandá una captura para corregir exactamente ese punto.
