# MiRoster — Frontend

App PWA para ver la programación de vuelos de Aerolíneas Argentinas.

## 🚀 Deploy en Vercel (recomendado)

### Opción A — Deploy directo desde GitHub (más fácil)

1. Subí esta carpeta a un repo de GitHub
2. Entrá a [vercel.com](https://vercel.com) → New Project
3. Conectá tu repo
4. Vercel detecta Vite automáticamente → **Deploy**
5. Listo, te da una URL `https://miroster-xxx.vercel.app`

### Opción B — Deploy con CLI

```bash
npm install -g vercel
npm install
vercel
```

## 💻 Desarrollo local

```bash
npm install
npm run dev
```

## 📦 Lo que se agregó vs el original

### Caché del roster (`App.jsx`)
- Al hacer SYNC, el roster se guarda en `localStorage` con `guardarRosterCache()`
- Al abrir la app, carga el roster guardado → **funciona offline sin hacer SYNC**
- Muestra cuándo fue la última sincronización ("Hace 2h 30m")
- Si no hay conexión, muestra un banner avisando que está mostrando datos guardados

### Service Worker (`public/sw.js`)
- Cachea los archivos de la app (HTML, JS, CSS)
- Estrategia: Network first → fallback a caché
- Las llamadas al backend de Railway van siempre a la red

### PWA (`public/manifest.json` + `index.html`)
- La app se puede instalar en el celular como app nativa
- En iOS: Safari → Compartir → "Agregar a pantalla de inicio"
- En Android: Chrome → menú → "Instalar app"

## 🔑 Variables de entorno

El backend está hardcodeado en `App.jsx`:
```
https://miroster-production.up.railway.app/roster
```
Si cambia la URL del backend de Railway, actualizarlo ahí.
