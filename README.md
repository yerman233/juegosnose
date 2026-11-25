# Speed games

Sitio web estático con una portada y tres espacios independientes para juegos.

## Estructura

- `index.html`: portada y enlaces a los tres juegos.
- `styles.css`: estilos compartidos de la portada y las páginas de juego.
- `juegos/juego-1/`, `juegos/juego-2/`, `juegos/juego-3/`: una página `index.html`, estilos (`game.css`), lógica (`game.js`) y carpeta `assets/` para los recursos de cada juego.

El tercer espacio contiene **Lumo: La última carrera**, un arcade original de tres niveles. El menú permite personalizar el color de Lumo y quitarle el sombrero; el progreso desbloqueado se guarda en el navegador para continuar desde el último nivel abierto. El nivel 1 es un laberinto de 21×17 casillas: recoge todas las motas, evita a los espíritus y usa los túneles laterales. El nivel 2 es una carrera de plataformas con escaleras, un titán y una carga defensiva de 3 segundos. El nivel 3 es una persecución de 28 segundos: salta los obstáculos, que te ralentizan al golpearte, y evita chocar con tres seguidos para llegar al final. Hay cuatro vidas; tras tres pérdidas seguidas se activa un escudo de 30 segundos. En los laberintos, los espíritus salen de la caja central 2 segundos después del inicio y las motas grandes activan un pulso temporal de 10 segundos.

## Agregar un juego

Abre el `index.html` de la carpeta correspondiente y reemplaza el contenido de ejemplo dentro de `Área de juego`. Usa `game.css` y `game.js` para los estilos y la lógica, y guarda imágenes o sonidos en `assets/`. Para cambiar los nombres visibles, actualiza el título y el enlace correspondiente en el `index.html` principal.

Abre `index.html` en un navegador para usar el sitio; no se necesita instalar dependencias.
