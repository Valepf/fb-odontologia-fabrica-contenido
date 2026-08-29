---
name: carrusel
description: Escribe, renderiza y encola UN carrusel de Instagram, verificado contra la fuente de verdad del producto. Usar cuando el pedido sea escribir un carrusel, un post, contenido para el feed, o tomar un candidato del backlog.
---

# Escribir un carrusel

Producís **un** carrusel completo: JSON → render → verificación visual → cola → memoria.
No publicás nada: publica el cron.

---

## Paso 1 — Leer la memoria (no se saltea)

En este orden:

1. `contenido/fuentes/personas.md` — **a quién le duele qué.** Es lo primero porque define de
   qué se habla. Elegí **una persona y un dolor concreto** antes de pensar en el producto.
2. `contenido/INDICE.md` — qué ya se dijo. **Nunca repetir tema ni ángulo.**
   *Test del subtítulo:* si tu hook podría ser el subtítulo de un carrusel viejo, es repetido.
   Mirá también la cobertura por persona: si vienen tres seguidos del mismo perfil, cambiá.
3. `contenido/backlog.md` — de dónde sale el tema. Tomá **el primer candidato** salvo que te
   pidan otro. Si está marcado `⚠️ OJO`, abrí primero el JSON del carrusel que lo consumió a
   medias y confirmá qué ángulo queda libre.
4. `contenido/fuentes/catalogo.md` — **qué es verdad y qué es publicable.** Leé completa la
   tabla de NO PUBLICABLES y la sección de errores ya cometidos.
5. `contenido/fuentes/marca.md` — cómo se dice y cómo se ve.

### La estructura del argumento

Un carrusel que arranca por la característica del producto ya perdió. El orden es:

```
DOLOR  →  TENSIÓN  →  MECANISMO  →  PRUEBA  →  QUÉ HACER
```

- **Dolor:** una escena que la persona reconoce como propia. No una categoría, una escena.
- **Tensión:** por qué lo que viene intentando no le funciona.
- **Mecanismo:** recién acá aparece el producto, como *explicación*, no como aviso.
- **Prueba:** el dato verificado de `catalogo.md`.
- **Qué hacer:** una acción concreta.

Anotá en el JSON el campo `"persona"` para que el índice pueda medir cobertura. No afecta el
render.

---

## Paso 2 — Escribir el JSON

En `content-studio/content/<NN>-<slug>.json`, donde `NN` es el siguiente número libre.

**Estructura:** 6–9 slides — 1 `portada` + 3–5 `punto` + opcional 1 `lista` o `frase` +
opcional 1 `stat`/`foto` + 1 `cta`.
Máximo **10 slides**: Instagram no publica carruseles más largos.

**Sin campo `estilo`.** La rotación la decide el número del slug.

### Tipos de slide

| tipo | campos | para qué |
|---|---|---|
| `portada` | `numero`, `titulo`, `bajada` | El hook. Una promesa o una pregunta incómoda, nunca genérica. |
| `punto` | `numero`, `titulo`, `texto` | Una sola idea. |
| `lista` | `titulo`, `items[]` | 4–5 ítems cortos. |
| `frase` | `texto`, `firma` | Remate memorable. |
| `stat` | `cifra`, `pie`, `nota` | Una cifra gigante y defendible. |
| `foto` | `foto`, `titulo`, `texto` | Slide dedicado a una imagen. |
| `cta` | `titulo`, `nota` | Cierre. El dominio lo pone el template. |

`*palabras entre asteriscos*` se pintan con el acento de la pieza: **1–3 por portada**, no más.

### Fotos

**Cualquier slide puede llevar foto**, no sólo los de tipo `foto`. Tres campos:

| campo | valores | default |
|---|---|---|
| `foto` | nombre de archivo en `content-studio/fotos/` | — |
| `posicion` | `arriba` · `completa` · `fondo` | `arriba` |
| `encuadre` | `centro` · `arriba` · `abajo` · `izquierda` · `derecha` | `centro` |

En `arriba` y `completa` el texto va sobre color plano, nunca sobre la imagen. En `fondo` la
imagen queda al 40% sobre el oscuro de la marca, así que el slide **siempre sale oscuro** —
es el registro más editorial de los tres, y funciona mejor en portadas y en `frase`.

**Regla de mezcla:** alterná portadas con y sin foto entre carruseles consecutivos. La grilla
del perfil son puras portadas: si todas llevan foto se vuelve un catálogo, y si ninguna lleva
se vuelve un muro de tipografía. Mirá `INDICE.md` para ver qué hizo el anterior.

**Nunca uses archivos que empiecen con `placeholder-`**: `npm run stage` los rechaza.

### Límites de copy

| Campo | Máx |
|---|---|
| portada · titulo | 55 |
| portada · bajada | 120 |
| punto · titulo | 45 |
| punto · texto | 190 |
| lista · items | 4–5 de ≤55 |
| frase · texto | 70 |
| cta · titulo | 60 |

El auto-ajuste del render salva el layout, **no la legibilidad en un celular**. Respetá los
límites igual.

### Tono

- El de `marca.md`, sin excepciones. Frases cortas, una idea por línea.
- Beneficio concreto antes que adjetivo abstracto.
- **Nunca de memoria.** Cada cosa que el copy afirma sobre el producto se verifica en
  `catalogo.md`. Si el detalle exacto no está ahí textual, **no se escribe**.
- **Cifras** sólo defendibles. Nada de estadísticas inventadas con falsa precisión.
- Respetá la sección de compliance de `marca.md` como si fuera código.

### El slide de la letra chica

En contenido de producto, incluí un slide honesto con lo que la marca **NO** hace. Es
contraintuitivo y es lo que más credibilidad genera: quien compra ya sabe que nada es perfecto,
y escucharlo de la marca es lo que la vuelve creíble.

### Caption

Gancho en la primera línea · 2–4 líneas con el detalle que **no entró** en las placas · una
pregunta abierta · CTA al sitio · 8 hashtags del nicho. El caption **no repite** las placas:
las completa.

---

## Paso 3 — Renderizar y mirar

```bash
npm run render 01-mi-slug
```

Después **abrí el JPG de la portada y miralo de verdad** (herramienta Read sobre
`content-studio/output/<slug>/01.jpg`). Este paso no se saltea.

Corregí y volvé a renderizar si:
- el render avisó que achicó un slide por debajo de 0.85 → el texto es largo, acortalo
- un texto quedó chico, desbordado o con viudas feas
- la portada no se entiende sola en dos segundos

Para ver cómo queda contra el resto del feed: `npm run grilla`.

---

## Paso 4 — Encolar y sincronizar la memoria

```bash
npm run stage 01-mi-slug
```

Y después, a mano:
1. Agregá la fila del carrusel a `contenido/INDICE.md` (hook, persona, categoría, estilo,
   portada, 🟡 en cola) y actualizá la cobertura.
2. Mové el candidato de "Candidatos" a "Usados" en `contenido/backlog.md`.
3. Si el tema quedó *medio* consumido, no lo borres: dejale una nota `⚠️ OJO` diciendo qué
   ángulos se gastaron y cuántos carruseles de distancia dejar antes de volver.
4. Commiteá `cola.json` — sin eso el publicador no ve el carrusel nuevo.

---

## Reglas duras

1. Nunca publicar a mano: publica el cron.
2. Nunca prometer una capacidad sin verificarla en `catalogo.md`.
3. Nunca contenido de la tabla NO PUBLICABLES, aunque lo pida el feedback.
4. Nunca repetir tema ni ángulo del índice (test del subtítulo).
5. Nunca cifras inventadas.
6. Nunca más de 10 slides.
7. Verificar visualmente la portada antes de encolar.
