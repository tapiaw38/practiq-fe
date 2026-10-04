# Practiq Android (Capacitor) — plan de implementación

Rama: `feat/capacitor-android`, worktree en `practiq-fe-capacitor/`, base `origin/develop` (`6b56f6c`).
Objetivo: empaquetar `practiq-fe` como app Android nativa con Capacitor, reusando ~95% del frontend web. No reescribir vistas.

## Por qué Capacitor y no React Native / Flutter

practiq-fe es Vue 3 + Vite + Pinia + PrimeVue. Capacitor envuelve el build (`dist/`) en un WebView nativo sin tocar una sola vista — el "puente" nativo (cámara, push, haptics) se agrega por composable cuando haga falta. React Native o Flutter implican reescribir todos los componentes y el enrutamiento desde cero.

## Hechos verificados del repo (no asumir, ya confirmado)

- **Auth es bearer token en `localStorage`**, no cookies (`src/api/request/server.ts`: `TOKEN_KEY`, `REFRESH_TOKEN_KEY` vía `localStorage`). Esto es BUENO para Capacitor — cookies cross-origin en WebView son un dolor de cabeza, bearer token no lo es.
- **CORS en `practiq-be`** (`cmd/api/main.go:79-80`) es una allowlist cerrada de orígenes: hoy incluye `https://app.practiq.com.ar`, `https://practiq.com.ar`, `localhost:5173/5174/4321`. **Hay que agregar `https://localhost` (origen por defecto de Capacitor en Android) y `capacitor://localhost` (iOS, para cuando llegue)**. `auth-api-be` ya tiene `AllowOrigins: []string{"*"}`, no necesita cambio.
- **Login con Google usa Google Identity Services (GIS) como script cargado en `index.html`**, no un SDK nativo (`src/components/auth/GoogleButton.vue`: `window.google.accounts.oauth2.initCodeClient({ ux_mode: 'popup', ... })`). **Este es el punto crítico que un plan genérico de Capacitor no cubre**: Google detecta el user-agent de un WebView embebido y rechaza el login con `disallowed_useragent` — no sirve "registrar un deep link" para esto, como dice un plan genérico. Hace falta el plugin nativo `@capacitor/google-auth` o abrir el flujo en el browser del sistema (`@capacitor/browser` + deep link de vuelta), no en el WebView de la app. Decidir cuál antes de tocar login (ver Fase 4).
- **Variables de entorno se inyectan en build time vía Docker `ARG`/`ENV`** (`Dockerfile`, `docker-compose.caddy.yml:136-138`): `VITE_AUTH_API_URL`, `VITE_PRACTIQ_API_URL`, `VITE_GOOGLE_CLIENT_ID`. Para Capacitor alcanza con un `.env.production` local con las URLs de prod (`https://api.practiq.com.ar`, `https://auth.practiq.com.ar`) — no hay `server.url` ni modo dev-remoto en producción.
- Sin PWA/service worker instalado, sin `base` custom en `vite.config.ts` — el build sirve desde raíz, compatible con `webDir: 'dist'` tal cual.
- Build real del repo: `npm run check:css-tokens && npm run check:fractions && vue-tsc -b && vite build`. Cualquier paso de este plan que toque `.vue`/`.ts` tiene que seguir pasando este comando completo, no solo `vite build`.

## Fases

### Fase 1 — Agregar Capacitor al repo, sin tocar nada funcional

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Practiq" "com.practiq.app" --web-dir=dist
```

Esto crea `capacitor.config.ts`. Confirmar que queda así (sin `server.url`, eso es solo para dev contra un servidor remoto, nunca en el build que se empaqueta):

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.practiq.app',
  appName: 'Practiq',
  webDir: 'dist',
};

export default config;
```

Agregar al `.gitignore` del repo: `/android/app/build/`, `/android/.gradle/`, `/android/local.properties` — el proyecto Android generado (`android/`) SÍ se trackea (es estándar en Capacitor, no es build output), solo sus artifacts de build.

Checklist de salida:
- [ ] `npm run build` sigue pasando igual que antes (cero cambios al código, esto es solo setup)
- [ ] `npx cap add android` corrido, carpeta `android/` existe y compila un APK vacío apuntando al `dist` actual

### Fase 2 — Primer build funcionando en emulador

```bash
npm run build
npx cap sync android
```

Abrir `android/` en Android Studio, correr en emulador. En este punto el login con Google va a fallar (ver Fase 4) — todo lo demás (rutas, Pinia, llamadas a la API si el backend ya permite el origen) debería andar.

Antes de este paso, `practiq-be` necesita el cambio de CORS (ver Fase 3) desplegado, si no todas las llamadas a `/api/*` van a fallar por CORS en el emulador.

### Fase 3 — Backend: habilitar el origen de Capacitor

En `practiq-be/cmd/api/main.go`, línea 80, agregar a `AllowOrigins`:

```go
AllowOrigins: []string{
    cfg.ServerConfig.FrontendURL,
    "https://app.practiq.com.ar",
    "https://practiq.com.ar",
    "https://www.practiq.com.ar",
    "https://practiq-landing.onrender.com",
    "http://localhost:5174",
    "http://localhost:5173",
    "http://localhost:4321",
    "http://127.0.0.1:4321",
    "https://localhost",   // Capacitor Android — origen por defecto del WebView
    "capacitor://localhost", // Capacitor iOS, cuando se agregue
},
```

Esto es un cambio en `practiq-be`, repo separado — commitear y desplegar ahí, no en esta rama de frontend. Avisar antes de tocar ese repo.

### Fase 4 — Login con Google dentro del WebView

Dos caminos, elegir uno antes de escribir código:

**Opción A — `@capacitor/google-auth`** (recomendado, UX nativa):
```bash
npm install @codetrix-studio/capacitor-google-auth
```
Requiere un Client ID de tipo "Android" además del "Web" que ya existe en `VITE_GOOGLE_CLIENT_ID` (crear en Google Cloud Console, con el SHA-1 del keystore de debug/release). El composable nuevo (Fase 5) decide en runtime cuál flujo usar.

**Opción B — `@capacitor/browser` + deep link**: abre el popup de Google en el browser del sistema (Chrome Custom Tabs), vuelve a la app por un deep link custom (`practiq://auth/callback`). Menos trabajo de configuración en Google Cloud, pero la vuelta a la app es menos fluida.

Elegir A si hay tiempo para configurar el Client ID Android; B si se quiere shippear rápido. Documentar la decisión en el PR.

### Fase 5 — Capa de plataforma nativa

Crear `src/platform/` con un composable por capacidad, cada uno con fallback no-nativo vía `Capacitor.isNativePlatform()`:

```
src/platform/
  useNativeAuth.ts       (Fase 4: Google login nativo vs. GIS web)
  useNativeCamera.ts      (adjuntar fotos de prácticas — @capacitor/camera)
  useNativePush.ts        (@capacitor/push-notifications)
  useNativeHaptics.ts     (feedback al acertar / sumar XP — @capacitor/haptics)
  useDeepLinks.ts         (abrir curso/práctica desde notificación — @capacitor/app)
```

No instalar estos plugins todos de una — cada uno entra en su propio commit cuando la feature que lo necesita se implementa. `@capacitor/preferences` solo si hace falta persistir algo que no sea crítico fuera de `localStorage` (probablemente no hace falta, `localStorage` funciona normal en el WebView).

### Fase 6 — Deep links

Para abrir `/student/courses/:id` o `/student/practice/:id` desde una notificación push, seguir la guía de Vue Router + Capacitor App plugin (`@capacitor/app`, evento `appUrlOpen`). El router de Vue ya tiene esas rutas — el deep link solo necesita parsear la URL entrante y llamar `router.push`.

### Fase 7 — Assets: ícono, splash, permisos

Antes de cualquier intento de publicación en Play Store:
- Ícono adaptativo Android (`android/app/src/main/res/mipmap-*`)
- Splash screen vía `@capacitor/splash-screen`
- Revisar `AndroidManifest.xml` generado: permisos de cámara/notificaciones solo si Fase 5 los usa

## Qué NO hacer

- No reescribir componentes Vue existentes para "verse más nativos". La UI responsive actual (ya tiene vistas mobile dedicadas, ver el trabajo reciente en `PracticeView.vue`, `StudentLayout.vue`) es el punto de partida, no algo a reemplazar.
- No usar `server.url` de Capacitor en el build de producción — eso apunta el WebView a un servidor remoto en vivo, es solo para desarrollo con live-reload.
- No tocar `practiq-be` sin avisar — Fase 3 es un repo distinto.
- No instalar plugins nativos "por si acaso" — cada uno entra cuando la feature que lo necesita se implementa (regla de Fase 5).

## Orden de ejecución sugerido para Codex

1. Fase 1 completa, commit.
2. Fase 2 (build + sync + probar en emulador), aunque el login falle — confirma que el resto de la app carga.
3. Avisar que Fase 3 necesita tocar `practiq-be` y esperar luz verde antes de ese repo.
4. Fase 4 — decidir A o B, implementar, probar login end-to-end en emulador.
5. Fase 5 en adelante, incremental, un plugin por commit, solo si se pide explícitamente seguir.

Reportar al final de cada fase: qué comando se corrió, si `npm run build` sigue pasando, y qué se ve en el emulador (screenshot si es posible).
