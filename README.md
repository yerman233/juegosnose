# Speed games

Sitio web estático con una portada y cuatro espacios independientes para juegos.

## Estructura

- `index.html`: portada y enlaces a los cuatro juegos.
- `styles.css`: estilos compartidos de la portada y las páginas de juego.
- `juegos/juego-1/`, `juegos/juego-2/`, `juegos/juego-3/`: espacios de ejemplo para juegos.
- `juegos/ASTEROID/`: campaña Asteroid de 6 niveles, con enemigos desde el nivel 2, bombarderos, disparos rebotantes y un jefe final con refuerzos y escudo.

## Agregar un juego

Cada juego tiene su propio `index.html`, `game.css` y `game.js`. Para agregar un nuevo juego, crea una carpeta dentro de `juegos/` y agrega un enlace a la portada en el `index.html` principal.

Abre `index.html` en un navegador para usar el sitio; no se necesita instalar dependencias.
