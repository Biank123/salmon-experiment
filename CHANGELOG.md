# Changelog

## [1.7.9] - 2026-11-03

### Changed - Animation
- **Archivos modificados**: `main.js`
- Al nadar, los flancos del vientre se mueven de forma antagónica (un lado entra y el otro sale) y el ancho deja de latir como un fluido.

## [1.7.8] - 2026-11-03

### Changed - Loading
- **Archivos modificados**: `index.html`
- Se restaura el intervalo de frases de carga a 1200 ms.

## [1.7.7] - 2026-11-03

### Fixed - Loading
- **Archivos modificados**: `index.html`, `main.js`
- La pantalla de carga anima frases y puntos con el reloj real y cede el hilo mientras se genera el pez, para no quedarse pegada en la primera frase.

### Changed - Hero
- **Archivos modificados**: `styles.css`
- En móvil el título vuelve al tamaño original; en desktop se agranda un poco respecto al ajuste anterior.

## [1.7.6] - 2026-11-03

### Changed - Hero
- **Archivos modificados**: `index.html`, `styles.css`
- El tamaño del título del hero se escala según la cantidad de letras: más texto, tipografía más chica.

## [1.7.5] - 2026-11-03

### Changed - Copy
- **Archivos modificados**: `index.html`, `styles.css`
- El título pasa a «Salmón Atlántico» en hero, header y pestaña del navegador.
- En móvil el hero baja un poco de tamaño para que quepan las dos palabras.

## [1.7.4] - 2026-11-03

### Changed - Loading
- **Archivos modificados**: `index.html`
- Las frases de carga rotan más rápido para alcanzar a leer tres.

## [1.7.3] - 2026-11-03

### Changed - Loading
- **Archivos modificados**: `index.html`
- En la carga solo flotan burbujas ambientales; el rastro del mouse vuelve a activarse con el pez.

## [1.7.2] - 2026-11-03

### Added - Loading
- **Archivos modificados**: `index.html`, `styles.css`
- En la pantalla de carga el mouse ya deja rastro de burbujas, sin esperar a three.js.

## [1.7.1] - 2026-11-03

### Changed - Loading
- **Archivos modificados**: `index.html`, `main.js`
- Las frases de carga rotan y los puntos suspensivos animan `.` → `..` → `...`.
- Se mantiene un tiempo mínimo de boot para que se lean varias frases.

## [1.7.0] - 2026-11-03

### Added - Loading
- **Archivos modificados**: `index.html`, `styles.css`, `main.js`
- Mientras carga, solo se ve el título arriba y mensajes centrados del tipo «Entrando a las profundidades del mar…».
- El resto de la UI aparece cuando el modelo 3D está listo.

## [1.6.2] - 2026-11-03

### Changed - Animation
- **Archivos modificados**: `main.js`
- Se elimina el parpadeo del pez.

## [1.6.1] - 2026-11-03

### Changed - Labels
- **Archivos modificados**: `main.js`
- Al ver un corte solo se muestra su etiqueta; las demás se ocultan (las piezas siguen clickeables).

### Added - Animation
- **Archivos modificados**: `main.js`
- El pez parpadea cada pocos segundos y también la primera vez que el mouse lo detecta.

## [1.6.0] - 2026-11-03

### Changed - Performance
- **Archivos modificados**: `main.js`
- Se reduce el tamaño de las texturas procedurales y el trabajo de pintado al cargar.
- Las sombras pasan a PCF suave (más ligeras que VSM) y el pixel ratio baja en móvil.
- La malla del pez usa menos segmentos en móvil para arrancar antes.

## [1.5.9] - 2026-11-03

### Fixed - Mobile
- **Archivos modificados**: `main.js`
- Inicio, disección y resumen comparten el mismo centro vertical del pez, sin extremos arriba/abajo.

## [1.5.8] - 2026-11-03

### Fixed - Mobile
- **Archivos modificados**: `main.js`
- Se corrige el sentido del encuadre móvil: en inicio el pez sube; en disección baja al centro superior.

## [1.5.7] - 2026-11-03

### Fixed - Mobile
- **Archivos modificados**: `main.js`
- En inicio el pez vuelve a subir en el encuadre.
- En disección el pez baja hacia el panel, con la misma cámara base que el resumen.

## [1.5.6] - 2026-11-03

### Changed - Mobile
- **Archivos modificados**: `styles.css`, `main.js`
- En disección el recuadro queda anclado abajo con el mismo margen que cortes y resumen.
- En inicio el pez sube un poco y el texto gana margen lateral y se acerca al modelo.

## [1.5.5] - 2026-11-03

### Changed - Hero
- **Archivos modificados**: `index.html`, `styles.css`, `main.js`
- Se añade una intro sobre el salmón atlántico (también en desktop) con tipografía un poco mayor.
- En móvil el pez completo se encuadra más lejos para no quedar sobredimensionado y deja sitio a la intro.

### Changed - Mobile
- **Archivos modificados**: `styles.css`, `main.js`
- En disección el recuadro de texto sube al centro de la pantalla en lugar de quedar pegado al borde inferior.
- El encuadre móvil pasa a ser por slide (inicio / disección / cortes / resumen) para no mezclar tamaños.

## [1.5.4] - 2026-11-03

### Fixed - Mobile
- **Archivos modificados**: `main.js`, `styles.css`
- Se elimina el hueco blanco arriba y abajo del pez subiendo los textos y bajando el encuadre.
- El modelo vuelve a un tamaño mayor para ocupar mejor el espacio sin salirse del ancho.

## [1.4.5] - 2026-11-03

### Changed - Animation
- **Archivos modificados**: `main.js`
- Al acelerar salen menos burbujas y alrededor de las aletas (no encima); también aportan un poco dorsal, pectorales, pélvicas y anal.

## [1.4.4] - 2026-11-03

### Changed - Animation
- **Archivos modificados**: `main.js`
- Al nadar rápido las burbujas salen alrededor de la aleta caudal como estela, no desde el pedúnculo.

## [1.4.3] - 2026-11-03

### Changed - Animation
- **Archivos modificados**: `main.js`
- Las burbujas son más claras, con borde más fino.
- Al acelerar solo se apresura el cuerpo; las aletas mantienen el mismo aleteo y ya no se despegan.
- La aleta anal aletea de lado a lado.
- El mouse genera burbujas en toda la experiencia, no solo en el inicio.

## [1.4.2] - 2026-11-03

### Changed - Animation
- **Archivos modificados**: `main.js`
- La aleta caudal se mueve más suave al acelerar, sin separarse tanto del cuerpo.
- Las burbujas son más celestes, con borde oscuro y más brillo; algunas salen más grandes.
- Al acelerar también salen burbujas de la cola, y en el inicio unas pocas siguen el mouse.

## [1.4.0] - 2026-11-03

### Added - Animation
- **Archivos modificados**: `main.js`
- Al pasar el mouse o tocar el pez salen burbujas desde la punta del hocico.

### Changed - Animation
- **Archivos modificados**: `main.js`
- Se eliminó la animación de abrir la boca.
- El nado al hover/toque se acelera de forma mucho más notoria.

## [1.3.1] - 2026-11-03

### Fixed - Animation
- **Archivos modificados**: `main.js`
- Se quitó la deformación que rompía la cabeza; la boca ahora es una mandíbula aparte que solo aparece al abrir.

## [1.3.0] - 2026-11-03

### Added - Animation
- **Archivos modificados**: `main.js`
- Al pasar el mouse o mantener el clic sobre el pez, abre la boca.

### Changed - Mobile
- **Archivos modificados**: `main.js`, `styles.css`
- El salmón se ve más grande en móvil y ocupa mejor el espacio entre el encabezado y el texto de abajo.

## [1.2.4] - 2026-11-03

### Changed - Mobile
- **Archivos modificados**: `main.js`, `styles.css`
- En el inicio el pez queda más cerca del título «Salmón», con menos hueco vacío abajo.

### Fixed - Animation
- **Archivos modificados**: `main.js`
- La aleta dorsal aletea de lado a lado en lugar de meterse hacia el cuerpo.

## [1.2.3] - 2026-11-03

### Fixed - Animation
- **Archivos modificados**: `main.js`
- Al pasar el mouse por el pez (sin arrastrar) el nado se acelera de forma clara.

## [1.2.2] - 2026-11-03

### Fixed - Animation
- **Archivos modificados**: `main.js`
- El nado deforma el cuerpo como un pez entero, sin abrir los cortes ni mostrar la carne naranja antes de la disección.

## [1.2.1] - 2026-11-03

### Changed - Animation
- **Archivos modificados**: `main.js`
- El nado ahora dobla el cuerpo de la cabeza a la cola, y el hover solo acelera un poco ese mismo ritmo sin temblores.

## [1.2.0] - 2026-11-03

### Added - Animation
- **Archivos modificados**: `main.js`
- Antes de la disección el salmón nada con un aleteo suave; al pasar el cursor o tocarlo hace un aleteo breve más rápido.

## [1.1.1] - 2026-11-03

### Fixed - Navigation
- **Archivos modificados**: `main.js`
- El menú de rallitas del costado vuelve a llevar a cada sección, incluido Inicio.

## [1.1.0] - 2026-11-03

### Changed - Scroll
- **Archivos modificados**: `main.js`, `styles.css`
- El desplazamiento termina en la visualización completa siguiente, o vuelve a la actual si el gesto es corto, para no quedar a medio camino.

### Fixed - Mobile
- **Archivos modificados**: `styles.css`, `main.js`
- El encabezado, los títulos, la pista del inicio y el resumen dejan de superponerse en pantallas chicas.
- Las etiquetas de los cortes son más pequeñas, van en una sola línea y se separan entre sí y del texto de la ficha.
