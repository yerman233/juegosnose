# Speed games

Sitio web estático con una portada y tres espacios independientes para juegos.

## Estructura

- `index.html`: portada y enlaces a los tres juegos.
- `styles.css`: estilos compartidos de la portada y las páginas de juego.
- `juegos/juego-1/`, `juegos/juego-2/`, `juegos/juego-3/`: una página `index.html`, estilos (`game.css`), lógica (`game.js`) y carpeta `assets/` para los recursos de cada juego.

El tercer espacio contiene **Lumo: La última carrera**, un arcade original de tres niveles. El menú permite personalizar el color de Lumo y quitarle el sombrero; el progreso desbloqueado se guarda en el navegador para continuar desde el último nivel abierto. El nivel 1 es un laberinto de 21×17 casillas: recoge todas las motas, evita a los espíritus y usa los túneles laterales. El nivel 2 es una carrera de plataformas con escaleras, un titán y una carga defensiva de 3 segundos. El nivel 3 es una persecución de 28 segundos: salta los obstáculos, que te ralentizan al golpearte, y evita chocar con tres seguidos para llegar al final. Hay cuatro vidas; tras tres pérdidas seguidas se activa un escudo de 30 segundos. En los laberintos, los espíritus salen de la caja central 2 segundos después del inicio y las motas grandes activan un pulso temporal de 10 segundos.

## Agregar un juego

El Juego 1 contiene **Lumbre del Valle**, un RPG original con guía inicial, controles de teclado, tres dificultades, combate automático, inventario, fabricación de equipo y mundos procedurales sin fin. Cada región mezcla dos biomas (bosques, catacumbas, desiertos, abismos marinos y ruinas), con criaturas humanoides acordes al entorno. Antes de empezar puedes elegir entre tres estilos de personaje y cambiar su color principal. Los ataques del personaje y los enemigos tienen animaciones; el botón de Ataque fuerte inflige 2.2 veces el daño normal y puede resonar con un arma rúnica con un 12% de probabilidad. A partir del tercer mundo aumentan la salud y el daño de los enemigos. El juego usa una paleta apagada de grises y azules; los enemigos dejan materiales y runas raras, y el progreso se guarda localmente. Su mundo, personajes, interfaz y código son propios; no está afiliado a otros juegos ni usa sus recursos.

En Lumbre, usa `Espacio` para iniciar o detener la expedición, el botón de Ataque fuerte para ejecutar un golpe especial (con 6 segundos de recarga), `H` para beber una poción, `W`/`A` para mejorar equipo, `I` para abrir el inventario y `1`–`3` para viajar a rutas desbloqueadas. Abre «Cómo jugar» dentro del juego para consultar las instrucciones y cambiar dificultad.

La pantalla de combate muestra al personaje, su armadura, los escenarios combinados y las barras de salud. La información del personaje, su nombre editable, el equipo y las rutas aparecen debajo.

Para modificar Lumbre, edita `juegos/juego-1/index.html`, `game.css` y `game.js`; guarda cualquier recurso original nuevo en su carpeta `assets/`. Para los Juegos 2 y 3, reemplaza el contenido de ejemplo en su `index.html` y personaliza sus archivos correspondientes.

Abre `index.html` en un navegador para usar el sitio; no se necesita instalar dependencias.
