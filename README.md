# Fabián Beltrán Odontología · Fábrica de contenido

Versión base adaptada para **Windows** y para la identidad visual de **F.B. Odontología**.

El flujo final será:

```text
contenido → JSON → HTML/CSS → JPG 1080×1350 → cola → Instagram
```

En esta primera etapa sólo usamos la parte segura del flujo: **contenido → render local**. No hay credenciales de Instagram y nada puede publicarse accidentalmente.

## Inicio rápido en Windows

1. Leé `INICIO_WINDOWS.md`.
2. Ejecutá `INSTALAR_WINDOWS.bat`.
3. Ejecutá `RENDER_PRUEBA_WINDOWS.bat`.
4. Revisá las imágenes en `content-studio/output/01-bienvenida-fb/`.

## Identidad ya configurada

- Azul institucional: `#0E123B`.
- Logo oficial azul y blanco.
- Cuenta: `@f.b.odontologia`.
- Consultorio: Sixto Laspiur 2677, Bahía Blanca.
- Turnos: 291 444 0020.
- Tipografías del pipeline: Figtree + Source Serif 4, hasta contar con una licencia/archivo web autorizado de Peridot LT.

## Seguridad editorial

El archivo `contenido/fuentes/catalogo.md` es la fuente de verdad. Los tratamientos específicos están bloqueados hasta que Fabián confirme cuáles quiere comunicar.

## Estructura

```
marca.json                     ← todo lo que cambia entre una marca y otra
contenido/                     ← la memoria, en markdown
├── INDICE.md                    todo lo publicado y en cola · regla de oro: no repetir
├── backlog.md                   candidatos curados, en orden
└── fuentes/
    ├── marca.md                 cómo se dice y cómo se ve
    ├── catalogo.md              QUÉ ES VERDAD · el documento más importante
    ├── personas.md              a quién le duele qué
    ├── feedback.md              preguntas reales de clientes
    ├── mercado.md               reseñas, búsquedas y comunidades del nicho
    └── calendario.md            la estacionalidad real del negocio

content-studio/
├── content/*.json             ← el contenido (lo único que cambia por post)
├── fotos/                     ← acá van las imágenes
├── template/                  ← la estética, congelada
│   ├── marca.css                los 3 colores y las 2 tipografías
│   ├── style.css                el motor visual: 4 estilos, 7 tipos de slide
│   ├── slides.mjs               qué puede decir cada slide
│   └── fonts/                   tipografías embebidas (sin red al renderizar)
├── render.mjs                 ← Chrome headless → JPG 1080×1350
└── output/<slug>/             ← 01.jpg … NN.jpg + caption.txt

scripts/
├── cola.mjs                     bloques horarios y estado de la cola
├── repetidos.mjs                detector de contenido repetido
├── verificar.mjs                auditoría de repeticiones y cobertura
├── stage.mjs                    sube los JPG y encola
├── publicar.mjs                 el publicador (lo invoca el cron)
└── instagram.mjs                Graph API

cola.json                      ← la cola, versionada en git
.github/workflows/             ← el cron que publica
```

---

## Cómo se ve

Formato **1080×1350 (4:5)**, el que más pantalla ocupa en el feed.

**4 estilos rotativos** que comparten identidad y cambian el color. El estilo lo decide el
número del slug, nunca la persona que escribe:

```
01 claro · 02 primario · 03 claro · 04 oscuro · 05 duo · 06 primario · 07 claro · …
```

El ciclo está ordenado para que **en la grilla del perfil nunca queden dos portadas oscuras
pegadas**. Ese detalle es la diferencia entre un feed que parece de agencia y uno que parece de
plantilla.

**7 tipos de slide:** `portada` `punto` `lista` `frase` `stat` `foto` `cta`. Cualquiera puede
llevar foto, con tres tratamientos: `arriba`, `completa` y `fondo`. El texto **nunca** se apoya
sobre la imagen: siempre sobre color plano.

**Sin paginador y sin pie.** Instagram ya muestra el @usuario arriba del post y los puntos del
carrusel abajo. Repetirlo es cromo que le come aire al texto.

---

## Por qué publica por bloques y no por reloj

El publicador no pregunta "¿son las 15?" sino **"¿ya publiqué hoy?"**.

Es una lección cara: un deploy que se demora un minuto se come la corrida y ese día no sale
nada. Decidiendo por bloque consumido, se lo puede invocar de más sin duplicar posts, una
corrida perdida la recupera la siguiente, y si falla la API el bloque no se marca consumido y se
reintenta solo.

---

## Cómo se garantiza que no se repita

1. **No se publica dos veces el mismo carrusel** — el bloque del día queda consumido.
2. **No se encola dos veces el mismo slug** — `stage.mjs` conoce toda la cola.
3. **No se encola un carrusel parecido a otro ya escrito** — `repetidos.mjs` compara hooks
   (Dice sobre palabras). Arriba de 72% bloquea; entre 50% y 72% avisa.
4. **No se repite tema ni ángulo** — esta no la puede garantizar el código. Para eso está el
   **test del subtítulo** de `INDICE.md`: si el hook nuevo podría ser el subtítulo del carrusel
   viejo, es repetido.

La fuente de verdad de las capas 3 y 4 es `content-studio/content/`. **Nunca borres JSON
viejos**: son la memoria que impide repetir.

---

## Reglas duras

1. **Nunca publicar a mano.** Publica el cron.
2. **Nunca prometer una capacidad sin verificarla** en `catalogo.md`.
3. **Nunca contenido de la tabla NO PUBLICABLES**, aunque lo pida el feedback.
4. **Nunca repetir tema ni ángulo** de `INDICE.md`.
5. **Nunca cifras inventadas** ni falsa precisión.
6. **Máximo 10 slides** y **5 carruseles por corrida**.
7. **Verificar visualmente la portada** renderizada antes de encolar.
8. Si un carrusel falla, seguir con los demás y reportarlo al final.

---

*Fábrica de contenido desarrollada por **Genera Impacto** —
[@generaimpacto](https://instagram.com/generaimpacto)— adaptada para **Fabián Beltrán Odontología**.*
