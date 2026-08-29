# Fotos

**Dejá acá las imágenes.** Cualquier slide puede llevar foto — incluida la portada, que es lo
que se ve en la grilla del perfil:

```json
{ "tipo": "portada", "titulo": "…", "bajada": "…",
  "foto": "producto-escritorio.jpg", "posicion": "arriba", "encuadre": "abajo" }
```

| campo | valores | default |
|---|---|---|
| `posicion` | `arriba` — foto arriba, panel de color abajo<br>`completa` — foto a sangre, banda de color abajo<br>`fondo` — foto al 40% detrás del texto (el slide sale oscuro siempre) | `arriba` |
| `encuadre` | `centro` · `arriba` · `abajo` · `izquierda` · `derecha` | `centro` |

El texto **nunca** se apoya sobre la imagen: siempre sobre color plano. Por eso no hace falta
que la foto tenga zonas vacías para que se lea, y ninguna imagen puede romper la legibilidad.

> Los archivos que empiezan con **`placeholder-`** son temporales. `npm run stage` **rechaza**
> cualquier carrusel que los use. Sirven para validar un layout, no para publicar.

## Formato

- **JPG o PNG**, al menos **1080 px de ancho** (idealmente 1600–2000 px).
- El recorte es a sangre en un 4:5: **dejá aire alrededor del sujeto**.
- Nombres en minúscula, con guiones, descriptivos y sin acentos:
  `producto-escritorio.jpg`, `equipo-taller.jpg`.

Si el JSON referencia una foto que no está acá, el render falla con un error claro y no publica
nada roto.

## De dónde salen

Ver `references/imagenes.md` de la skill: fotos propias, stock (con su licencia anotada),
IA, capturas de producto y frames de video. Las reglas de curaduría de esta marca viven en
`contenido/fuentes/marca.md` §4.
