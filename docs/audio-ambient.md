# Audios ambientales

El mezclador intenta usar archivos reales desde `public/audio/ambient` antes de caer al sonido procedural de respaldo.

## Nombres recomendados

- `public/audio/ambient/lluvia.mp3`
- `public/audio/ambient/brasas.mp3`
- `public/audio/ambient/sala-biblioteca.mp3`
- `public/audio/ambient/viento.mp3`

Tambien acepta algunos alias:

- `rain.mp3`
- `fire.mp3`
- `library.mp3`
- `wind.mp3`

Y las mismas rutas en `.ogg`.

## Comportamiento

- Si el archivo existe, la web usa ese audio real en el mezclador.
- Si falta, Lumina sigue funcionando y usa el ambiente procedural actual como fallback.
- Los archivos se sirven tal cual desde la VPS al estar dentro de `public/`.
