# Salmón — Anatomía de un corte

Experimento interactivo en three.js: un salmón 3D que se disecciona con el scroll y muestra los mejores cortes y cómo cocinar cada uno.

## Qué hace

- **Inicio:** el salmón completo flota en escena. Se gira arrastrando con el mouse (en celular, deslizando en horizontal).
- **Disección:** al hacer scroll se separa en 6 cortes: cabeza, collar (kama), lomo, ventresca, medallones y cola.
- **Fichas:** un capítulo por corte. La cámara viaja a la pieza, el resto se atenúa y aparece la ficha con nivel de grasa, preparaciones y un tip de cocina.
- **Tooltips 3D:** pines anclados a cada pieza. Al hacer clic en un pin o en la pieza, la página baja a su ficha.
- **Resumen:** vista final con todos los cortes y una guía rápida.

## Cómo correrlo

No requiere instalación ni build. Three.js y las fuentes se cargan por CDN.

```bash
python -m http.server 5173
# abrir http://localhost:5173
```

También funciona con cualquier servidor estático (por ejemplo, Live Server de VS Code).

## Estructura

| Archivo      | Contenido |
|--------------|-----------|
| `index.html` | Estructura, textos de cada corte e import map de three.js (CDN) |
| `styles.css` | Diseño editorial, capítulos, pines y versión mobile |
| `main.js`    | Escena, modelo procedural del salmón, keyframes de scroll e interacción |

## Cómo está hecho

- **Modelo 100% procedural**, sin assets externos. El cuerpo se genera desde perfiles dorsal, ventral y de ancho basados en *Salmo salar*. Cada corte es una pieza con piel, tapas de carne y, en lomo y ventresca, una cara longitudinal.
- **Texturas generadas en canvas:** la piel (gradiente lomo/flancos/vientre, manchas en X, línea lateral, opérculo y boca), el relieve de escamas, la rugosidad/metalicidad y la carne (miosepta, línea de sangre, vértebra y grasa subcutánea). Las aletas llevan radios en abanico.
- **Materiales:** `MeshPhysicalMaterial` con clearcoat (efecto húmedo), iridiscencia en la piel y sheen en la carne. Se usa tone mapping neutro y sombras VSM.
- **Scroll:** cada `<section data-kf>` es un keyframe (cámara, nivel de disección, corte enfocado y desplazamiento en pantalla) que se interpola con suavizado.

Para editar textos o agregar cortes: los textos están en `index.html`, y los cortes y cámaras en los arrays `CUTS` y `KFDEF` de `main.js`.
