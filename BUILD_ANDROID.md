# Compilar e instalar Practiq Android (debug)

Rama `feat/capacitor-android`, worktree `practiq-fe-capacitor/`. Ver `CAPACITOR_PLAN.md` para el plan completo — esto es solo el comando a comando de "tengo el repo, quiero un APK en mi celular".

## Estado de esta máquina (verificar en otra)

- SDK en `/home/tapia/Android/Sdk` (`cmdline-tools/latest`, `platform-tools`, `platforms/android-36`, `build-tools/36.0.0`)
- `android/local.properties` tiene `sdk.dir=/home/tapia/Android/Sdk` — no se trackea en git, recrearlo si falta
- Gradle necesita **JDK ≤ 23**. El sistema puede tener un JDK más nuevo por default (`java -version`) que Gradle 8.14.3 no soporta (`Unsupported class file major version 70`). Si hay un JDK 21 instalado, usar `export JAVA_HOME=/usr/lib/jvm/java-21-openjdk` antes de compilar — no hace falta cambiar el default del sistema.

## Primera vez en una máquina nueva

Si no existe `~/Android/Sdk`:

```bash
mkdir -p ~/Android/Sdk/cmdline-tools
curl -fL -o /tmp/cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
cd /tmp && python3 -c "import zipfile; zipfile.ZipFile('cmdline-tools.zip').extractall('$HOME/Android/Sdk/cmdline-tools')"
mv ~/Android/Sdk/cmdline-tools/cmdline-tools ~/Android/Sdk/cmdline-tools/latest
chmod +x ~/Android/Sdk/cmdline-tools/latest/bin/*

export ANDROID_HOME=~/Android/Sdk
SDKM=$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager
yes | "$SDKM" --licenses
"$SDKM" "platform-tools" "platforms;android-36" "build-tools;36.0.0"

echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

Si `curl` se corta a mitad de descarga (pasó una vez, Gradle quedó con un `.part` huérfano): borrar `~/.gradle/wrapper/dists/gradle-*/*/*.zip.part` y `*.lck`, descargar de nuevo con `curl -fL` (falla ruidoso en vez de quedar trunco en silencio), verificar con `python3 -c "import zipfile; print(zipfile.ZipFile('archivo.zip').testzip())"` (debe imprimir `None`), y recién ahí copiarlo a la carpeta que el wrapper espera.

## Compilar el APK debug

```bash
cd practiq-fe-capacitor
npm run build
npx cap sync android
cd android
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk   # solo si el default del sistema es incompatible
export ANDROID_HOME=~/Android/Sdk
./gradlew assembleDebug
```

APK queda en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Instalar en el celular

**Por cable (adb)** — requiere Depuración USB activada en el teléfono (Ajustes → Acerca del teléfono → tocar "Número de compilación" 7 veces → Opciones de desarrollador → activar "Depuración USB"; al conectar el cable aparece un popup de autorización, aceptarlo):

```bash
~/Android/Sdk/platform-tools/adb devices    # debe listar el dispositivo
~/Android/Sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Si `adb devices` devuelve vacío con el cable conectado, el teléfono probablemente sigue en modo MTP (transferencia de archivos) y no en modo depuración — revisar el toggle, no el cable.

**Sin cable**: copiar `app-debug.apk` al teléfono por cualquier medio (Bluetooth, Drive, etc.) y abrirlo — pide habilitar "Instalar apps desconocidas" para la app que lo abre, no requiere Depuración USB.

## Backend: CORS

`practiq-be` necesita permitir el origen que usa el WebView de Capacitor. Ya está resuelto en `develop` (commit `a331d23`): `https://localhost` está en el `AllowOrigins` de `cmd/api/main.go`.

**Ojo con esto si se toca de nuevo**: la librería `gin-contrib/cors` valida cada entrada de `AllowOrigins` y **panickea al arrancar** si alguna no empieza con `http://` o `https://`. `capacitor://localhost` (el esquema que usa iOS) **rompe el arranque del servidor** — se probó en producción y tiró el contenedor a crash loop. Para soportar iOS más adelante hace falta otro mecanismo (leer el header `Origin` a mano, o un allowlist por función en vez de la lista plana), no agregar el string a `AllowOrigins`.

## Login con Google — no andaba, está pendiente

El botón de Google queda "trabado" (carga infinita) dentro del WebView. Causa: `GoogleButton.vue` usa Google Identity Services como script web (`initCodeClient`, `ux_mode: 'popup'`), y Google bloquea ese flujo dentro de un WebView embebido (`disallowed_useragent`) — no es un problema de CORS ni de deep links. El callback nunca se dispara, así que `isLoading` se queda en `true` para siempre.

Login por usuario/contraseña sí funciona una vez resuelto el CORS de arriba.

Solución pendiente (Fase 4 de `CAPACITOR_PLAN.md`): plugin nativo `@capacitor/google-auth` o abrir el flujo en el browser del sistema vía `@capacitor/browser` + deep link de vuelta. Ninguna de las dos está implementada todavía.
