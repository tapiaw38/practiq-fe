# App Links — volver a la app sola tras el login de Google

## Por qué este cambio

El login con Google vía Custom Tabs + polling ya funciona: el backend completa el
login correctamente, confirmado en logs de producción. El problema es puramente de
retorno: la app nunca se trae sola a primer plano. El listener de `resume` que se
agregó antes NO resuelve esto — `resume` solo dispara DESPUÉS de que el usuario ya
volvió a mano a la app, así que solo acelera lo que pasa una vez que el usuario ya
hizo el trabajo manual. Confirmado con el usuario: el login sí se completa en el
fondo, pero hay que volver a la app a mano.

La única forma de que Android traiga la app a primer plano sin acción del usuario,
dado que ya se descartaron los esquemas de URI custom (prohibidos en Android) y el
SDK nativo de Google (`@capacitor/google-auth`, requeriría otro Client ID y cambiar
el contrato del backend), es **Android App Links**: una URL `https://` verificada
que el sistema operativo intercepta y entrega directo a la app, sin que Chrome
llegue a mostrar nada.

La URL de redirect ya existe y no cambia: `https://app.practiq.com.ar/auth/mobile-callback`.
Lo que se agrega es la verificación para que Android sepa que esa URL le
pertenece a la app `com.practiq.app`.

## Decisión de diseño: App Links como mejora, no como reemplazo

El polling que ya existe en `useNativeGoogleLogin.ts` **se mantiene intacto** como
red de seguridad. App Links es una mejora que, cuando la verificación del sistema
está activa, intercepta la URL de Google ANTES de que Chrome la muestre y se la
entrega a la app vía el evento `appUrlOpen` de `@capacitor/app` (ya instalado). Si
por algún motivo la verificación de Android no está lista en un dispositivo dado
(primera vez que se abre la app, o encadenamientos de Android variables), el
polling sigue ahí y el login se completa igual, solo que más lento, como ahora.

No tocar ni remover el polling, el listener de `resume`, ni el `finally` con
`Browser.close()` que ya existen — el `appUrlOpen` handler nuevo se suma al lado.

## Dato ya resuelto: SHA-256 del keystore de debug

```
6B:CD:1B:AD:16:17:25:B0:D1:AA:FF:A0:5C:4D:09:8A:E7:D3:D7:3C:1F:C0:9A:DE:77:2F:D7:44:D1:62:1E:CC
```

Extraído de `~/.android/debug.keystore` (el default de Android, sin config custom
en `build.gradle` — confirmado, no hay `signingConfigs.debug` definido ahí). Esto
firma únicamente builds de debug. **Cuando exista un keystore de release, va a
hacer falta agregar SU SHA-256 también al `assetlinks.json`** — dejar el archivo
preparado como una lista que admite más de un fingerprint, no uno solo.

## Repos y ramas

| Repo | Rama | Worktree |
|---|---|---|
| `practiq-fe-capacitor` | `feat/capacitor-android` (ya existe) | `../practiq-fe-capacitor` |
| `practiq-fe` | `feat/google-mobile-callback` (ya existe, ya tiene el callback page) | `../practiq-fe-mobile-callback` |

`auth-api-be` no se toca — el contrato de `/auth/google/mobile/callback` y
`/auth/google/mobile/poll/:state` no cambia en absoluto.

---

## Parte 1 — `practiq-fe` (worktree: `practiq-fe-mobile-callback`)

Hostear el archivo de verificación de Digital Asset Links. Es un JSON estático,
no necesita build-time injection ni lógica — Vite lo sirve tal cual desde `public/`.

**Archivo nuevo: `public/.well-known/assetlinks.json`**

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_web_data"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.practiq.app",
      "sha256_cert_fingerprints": [
        "6B:CD:1B:AD:16:17:25:B0:D1:AA:FF:A0:5C:4D:09:8A:E7:D3:D7:3C:1F:C0:9A:DE:77:2F:D7:44:D1:62:1E:CC"
      ]
    }
  }
]
```

Nada más en este repo. Confirmar que Vite copia archivos de `public/` tal cual a
la raíz del build (comportamiento estándar, no debería hacer falta configurar
nada) — verificar después del build que `dist/.well-known/assetlinks.json` existe
con ese contenido exacto.

### Checklist de salida — Parte 1

- [ ] `npm run build` pasa
- [ ] `dist/.well-known/assetlinks.json` existe y tiene el JSON de arriba

---

## Parte 2 — `practiq-fe-capacitor` (worktree existente, rama `feat/capacitor-android`)

### 2.1 — `AndroidManifest.xml`

La Activity principal ya tiene `android:launchMode="singleTask"` — correcto y
necesario para que `appUrlOpen` llegue a la instancia ya corriendo en vez de
crear una nueva. No tocar esa línea.

Agregar un intent-filter con `autoVerify="true"` a esa misma Activity, al lado
del `<intent-filter>` de `MAIN`/`LAUNCHER` que ya existe (como un segundo
`<intent-filter>`, no reemplazando el que ya está):

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="app.practiq.com.ar"
        android:pathPrefix="/auth/mobile-callback" />
</intent-filter>
```

### 2.2 — `src/platform/useNativeGoogleLogin.ts`

Agregar un listener de `appUrlOpen` que, cuando Android entrega la URL
interceptada, dispare el mismo POST que hoy hace la página web de callback (por
si la verificación de App Links ganó la carrera antes de que Chrome llegara a
cargar esa página — en ese caso nadie más hizo ese POST) y despierte el polling
ya existente para que lea el resultado en el próximo tick, en vez de esperar el
intervalo normal.

Reutilizar el mecanismo de `wakePoll` que ya existe (el mismo que usa el listener
de `resume`) — no inventar un segundo camino para resolver la promesa. El import
de `axios` o `fetch` para el POST debe seguir el mismo patrón que ya usa el resto
del archivo (ahora mismo usa `fetch` nativo, no axios — mantener esa elección).

Forma esperada (no copiar literal, es el contrato — nombres de variables y estilo
deben calzar con el resto del archivo ya revisado):

- Importar `URLOpenListenerEvent` desde `@capacitor/app` — confirmado que existe
  en la versión instalada (`node_modules/@capacitor/app/dist/esm/definitions.d.ts`).
- El listener de `appUrlOpen` se registra junto al de `resume` (mismo bloque,
  antes del `try`), y se remueve junto al de `resume` en el `finally` (mismo
  patrón de `.remove()`).
- Dentro del callback: parsear `code` y `state` de la URL recibida (usar
  `new URL(event.url).searchParams`, igual que ya hace la página web de
  callback). Si hay `code` y `state`, disparar
  `fetch(`${authBaseURL}/auth/google/mobile/callback`, { method: 'POST', ... })`
  con esos valores — no hace falta esperar su resultado de forma bloqueante más
  allá de iniciarlo, ya que el polling existente va a leer el resultado real
  igual. Después, llamar `wakePoll?.()`.

### Checklist de salida — Parte 2

- [ ] `npm run build` completo pasa
- [ ] `npx cap sync android` pasa
- [ ] Compilar el APK debug (ver `BUILD_ANDROID.md` para el setup de JDK/SDK de
  esta máquina) — avisar cuando el APK esté listo, no instalar/probar en el
  dispositivo (eso lo hace el usuario)

---

## Qué pasa después de desplegar

La verificación de Android App Links (el sistema operativo confirmando contra
`assetlinks.json` que la app puede manejar esa URL) puede tardar desde segundos
hasta un par de minutos tras instalar un APK nuevo — a veces requiere que el
usuario abra la app al menos una vez primero. Si después de instalar el nuevo
APK la primera prueba todavía no vuelve sola, no es necesariamente una falla del
código — puede ser que la verificación todavía no corrió. El polling existente
sigue garantizando que el login se complete igual mientras tanto.

## Qué NO hacer

- No tocar `auth-api-be` — nada de esto cambia su contrato.
- No remover el polling, el listener de `resume`, ni el `Browser.close()` en el
  `finally` de `useNativeGoogleLogin.ts` — App Links se suma, no reemplaza.
- No tocar el Client ID de Google ni las Authorized redirect URIs en Cloud
  Console — la URL de redirect sigue siendo exactamente la misma
  (`https://app.practiq.com.ar/auth/mobile-callback`), solo se agrega
  verificación de Android sobre esa misma URL.
- Sin comentarios en el código. Seguir el estilo ya establecido en cada archivo
  tocado (mirar el resto de `useNativeGoogleLogin.ts` y del
  `AndroidManifest.xml` antes de escribir).
