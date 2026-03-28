# Lumina

Lumina es una experiencia de estudio con estética de fantasía construida con Astro, Tailwind CSS v4 y islas de React para las partes interactivas. La propuesta actual funciona como un santuario social de estudio: una biblioteca central, una sala silenciosa privada, una biblioteca compartida, un jardín para descansos, un editor de personaje y crónicas que crecen a partir de sesiones reales de Pomodoro.

## Sitio web activo

La página web está actualmente activa en:

https://luminalibrary.duckdns.org/

## Características principales

- Biblioteca como portal hacia los distintos espacios del santuario
- Santuario silencioso con temporizador Pomodoro editable
- Biblioteca compartida y jardín con estado local del santuario
- Refinar con editor modular de avatar
- Crónicas e hitos impulsados por sesiones reales de Pomodoro guardadas en el navegador
- Rutas responsivas en Astro con islas de React solo donde hace falta estado

## Tecnologías

- Astro 5
- React 19
- TypeScript
- Tailwind CSS 4
- Lucide React

## Ejecutar en local

### Requisitos

- Node.js 18 o superior
- npm

### Instalación

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

3. Abre [http://localhost:3000](http://localhost:3000).

## Scripts disponibles

- `npm run dev` inicia el servidor de desarrollo de Astro en el puerto `3000`
- `npm run build` genera la versión de producción
- `npm run preview` sirve la versión de producción en local
- `npm run lint` ejecuta `astro check`
- `npm run clean` elimina el directorio `dist`

## Estructura del proyecto

```text
docs/         Notas de flujo de trabajo e integración del repositorio
references/   Referencias visuales locales que no deben convertirse en rutas de Astro
src/
  components/   Bloques de interfaz reutilizables en Astro
  data/         Contenido centralizado en español y referencias de assets
  islands/      Islas interactivas de React
  layouts/      Layouts compartidos
  pages/        Rutas de Astro
  lib/          Utilidades compartidas en tiempo de ejecución, como el mapeo de iconos
```
