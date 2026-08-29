---
name: producir-contenido
description: Rutina de contenido. Mide la cola de Instagram, produce sólo los carruseles que faltan para mantener el buffer, los encola y rellena el backlog cuando baja. Usar cuando el pedido sea la rutina de contenido, llenar la cola, producir contenido, o cuando la dispare una tarea programada.
---

# Rutina de contenido

Mantiene la cola de Instagram llena sola. Produce **sólo lo que falta**, no lo que sobra.

---

## 1. Medir

```bash
npm run ig:check
```

Calculá cuántos carruseles generar:

```
N = buffer objetivo (marca.json) − pendientes en cola      (por cada post diario)
```

acotado entre **0 y `maxPorCorrida`** (5 por defecto).

- **N = 0** → la cola está llena. **No generes nada.** Reportá en una línea y terminá.
  La cola llena es el resultado correcto, no un problema.
- **El tope por corrida no se sube.** Más que eso degrada la calidad del copy — está
  verificado a fuerza de producir de más.

Si `ig:check` falla porque faltan credenciales o configuración, **no generes a ciegas**:
reportá exactamente qué falta y terminá.

---

## 2. Generar N carruseles

Seguí la skill `carrusel` **al pie de la letra**, uno por uno, tomando siempre el primer
candidato del backlog.

Si uno falla, **seguí con los demás** y reportalo al final.

Cuidá **dos** mezclas, mirando el pie de `INDICE.md` antes de elegir:

- **Por categoría:** la proporción que fija `marca.md`.
- **Por persona:** la mezcla de `personas.md` §5. Tres carruseles seguidos del mismo perfil
  aburren al resto del feed.

Cada 3 carruseles, volvé a leer `INDICE.md` completo: los que acabás de escribir ya cuentan
para la regla de no repetir.

---

## 3. Verificar, stagear y sincronizar

```bash
npm run verificar    # ¿algo quedó repetido? ¿el índice quedó desincronizado?
npm run stage        # sube y encola (rechaza repetidos y placeholders)
npm run grilla       # la grilla del perfil como va a quedar
```

Si `verificar` marca un repetido, **reescribí el hook de la pieza nueva** — no bajes el umbral.

Abrí `content-studio/output/_grilla.jpg` y mirala (herramienta Read): el ciclo de colores ya
viene ordenado, pero **la alternancia de portadas con y sin foto es tuya**. Tres tipográficas
seguidas o tres con foto seguidas = monotonía — ajustá la portada de la próxima pieza.

Actualizá `INDICE.md` y `backlog.md` por cada carrusel. Después commiteá y pusheá: **sin push
el publicador no ve la cola nueva.**

```bash
git add -A && git commit -m "contenido: N carruseles nuevos" && git push
```

---

## 4. Rellenar el backlog si bajó de 10 candidatos

Lanzá **subagentes en paralelo, cada uno con una lente distinta**. Todos leen `INDICE.md`
primero para saber qué NO repetir, y proponen 5–7 candidatos con tema / hook / ángulo /
categoría / fuente / por qué.

**Las 4 lentes base, siempre:**

| Lente | De dónde saca |
|---|---|
| **Personas** | `fuentes/personas.md`: dolores, objeciones y momentos de la verdad sin cubrir. **Es la lente principal** — cada candidato nace de un dolor. |
| **Ángulos** | Los ángulos de `personas.md` §6, cruzados con las personas que todavía no los recibieron. |
| **Feedback** | `fuentes/feedback.md`: preguntas y objeciones reales. Si tres personas preguntaron lo mismo, hay un carrusel ahí. |
| **Catálogo** | Filas sin contenido asociado en `catalogo.md`. Es la lente **de apoyo**, no la principal: aporta la prueba, no el tema. |

**Más 2 lentes de refuerzo, distintas de las de la corrida anterior** (anotá cuáles usaste al
pie del backlog). Con las 4 base solas el contenido se agota a los dos meses:

| Lente | De dónde saca |
|---|---|
| **Reseñas** | `fuentes/mercado.md`: las propias de 3 estrellas —elogian y se quejan en la misma frase— y el patrón de quejas de la competencia |
| **Búsquedas** | `fuentes/mercado.md`: cómo nombra la gente el problema, y qué pregunta sin respuesta |
| **Comentarios** | lo que preguntaron en los últimos posts publicados: si algo se repite, se merece su propia placa |
| **Estacionalidad** | `fuentes/calendario.md`: qué se pregunta en este momento del año y qué conviene anticipar |
| **Detrás de escena** | cómo se hace, cómo se elige, por qué cuesta lo que cuesta. Llena la categoría de confianza, que es la más difícil |
| **Pendientes** | `catalogo.md` §6: los huecos que el cliente ya respondió desde la última corrida |

El catálogo completo de fuentes, con la trampa de cada una, está en `references/temas.md` de la
skill que montó este sistema.

Después:
1. Deduplicá contra `INDICE.md`, contra "Usados" **y entre sí**.
2. Descartá cualquier cosa que caiga en NO PUBLICABLES o en "Bloqueados hasta verificar".
3. Pasá los cuatro filtros: nace de un dolor · se puede verificar · el ángulo está libre ·
   **vale por sí solo** (si el lector lo aplica y nunca compra, ¿igual se llevó algo?).
4. Agregá los mejores **10–14** al backlog respetando la mezcla de categorías.

---

## 5. Reporte final

Cerrá siempre con:

- cuántos carruseles se generaron y sus slugs
- **días de contenido en cola** después de la corrida
- tamaño del backlog
- errores, si hubo
- **huecos de verificación que bloquearon ideas** — es la lista de preguntas para el cliente,
  y cada una destrabada vale un carrusel

Sé breve. Si no hubo nada que hacer, una línea alcanza.

---

## Reglas duras

1. Si N = 0, no se genera nada. La cola manda.
2. Nunca más carruseles que `maxPorCorrida`.
3. Nunca publicar a mano: publica el cron.
4. Si un carrusel falla, seguir con los demás y reportarlo.
5. Todo lo que se afirma se verifica en `catalogo.md`.
