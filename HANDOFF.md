# HANDOFF — Argos Whisper V.0.1

> **PARA TODO AGENTE:** Leer este archivo + SPEC.md completo ANTES de cualquier cambio.
> Este documento refleja el estado real del proyecto en el último hito confirmado.

---

## Última actualización
2026-06-14 — Hito: Logo oficial + ícono de app + loading screen de Whisper (v0.1-logo-loading)

## Estado general
🟢 **Fase 1 a Fase 5: Implementación & Build** — Completado (IPC y Build robustecidos)
🟡 **Manual Testing** — En progreso

---

## Hitos completados
- [x] Scaffold del proyecto (estructura de carpetas + SPEC + HANDOFF)
- [x] Inicialización del repositorio Git, conexión a origin y primer push a GitHub
- [x] Instalación de todas las dependencias de npm y configuración del bundler Webpack 5
- [x] Configuración del entorno Python (faster-whisper) y descarga local del modelo `tiny`
- [x] Resolución de errores de compilación de TypeScript (declaraciones de módulos y variables no usadas)
- [x] Adición de configuración y UI para la ruta ejecutable de Python (`pythonPath`)
- [x] Compilación exitosa sin errores de los bundles main y renderer (`npm run build`)
- [x] Confirmación de que el proyecto inicia con `npm start` (pendiente test manual de grabación)
- [x] Conexión robusta de handlers IPC: limpieza de listeners de audio, recreación de WhisperService en caliente ante cambios de settings, y finalización de subproceso Python en `will-quit` de la aplicación
- [x] Corrección de bugs bloqueantes: degradación de `dictionary-en` a v3 para compatibilidad CommonJS/Webpack (resolviendo `ERR_REQUIRE_ESM`), y restricción de apertura de DevTools en producción en `WindowManager.ts`
- [x] Corrección de CSP EvalError en desarrollo configurando `source-map` en `webpack.renderer.config.js` y agregando soporte de compilación de producción dinámico
- [x] Corrección de pipeline de grabación: `WhisperService.ts` detecta cierre prematuro del proceso Python y rechaza la Promise inmediatamente (en lugar de esperar 60 segundos de timeout)
- [x] Corrección de sincronización de UI en `RecordButton.ts`: debouncing con `isActionPending` para evitar clicks superpuestos, y reset completo del estado visual (statusDot, statusDotSm, statusBarLabel, recordingIndicator) al recibir un error de transcripción
- [x] Configuración automática del path de Python 3.11 (`C:\Users\Nahuel\AppData\Local\Programs\Python\Python311\python.exe`) en el archivo de settings persistido
- [x] Implementación de 4 mejoras de UX/UI: texto de transcripción editable al detener grabación con sincronización al estado global, unificación de indicadores de estado en barra inferior, retry LLM cada 15 segundos y modelo Whisper predeterminado 'small'
- [x] Transcripción en vivo acumulada y editable — FUNCIONANDO
- [x] Selector de modelos Whisper (tiny/small/medium) cargando localmente desde models/ — FUNCIONANDO
- [x] Logo oficial guardado en `assets/logo.png` (fuente maestra, ojo con espiral dorado sobre fondo azul profundo)
- [x] Íconos generados: `assets/icon.ico` (multi-res: 256/64/48/32/16), `assets/icon-512.png`, `assets/favicon.png` via `scripts/generate-icons.js` (sharp + to-ico)
- [x] Ícono de ventana Electron configurado en `WindowManager.ts` (`icon: assets/icon.ico`)
- [x] Loading screen fullscreen mientras carga Whisper: logo animado (pulse + glow dorado `#C9A84C`), texto "Cargando modelo Whisper...", dots bounce
- [x] Flujo IPC completo: `whisper:ready` emitido desde `ipcHandlers.ts` → expuesto en `preload.ts` → escuchado en `renderer.ts` → fade-out del overlay

## Próximos pasos
1. Instalar SoX en Windows (requerido para capturar audio vía node-record-lpcm16).
2. Levantar LM Studio localmente en el puerto 1234 con un modelo compatible.
3. Ejecutar la aplicación usando `npm start`.
4. Probar la grabación de voz y verificar que la transcripción en vivo funcione en pantalla.
5. Probar el panel de edición (corrección ortográfica Hunspell, presets LLM como cambiar estilo, resumir, traducir).
6. Verificar el guardado de ejemplos few-shot (s/l) en formato JSON en `data/fewshot/`.

---

## Estado del entorno local
| Dependencia | Estado | Notas |
|-------------|--------|-------|
| Node.js | Instalado | v18+ verificado |
| Python | Instalado | v3.11.9 (System Python recomendado en Ajustes) |
| `faster-whisper` (pip) | Instalado | Disponible en el Python del sistema |
| SoX en PATH | ❓ | Requerido por node-record-lpcm16 |
| LM Studio | ❓ | Corriendo en localhost:1234 |
| Git | Instalado | Origin conectado y actualizado |

---

## Log de sesiones
| Fecha | Hito | Agente | Notas |
|-------|------|--------|-------|
| 2026-06-13 | Inicialización SDD | Antigravity | Scaffold + SPEC + HANDOFF + git |
| 2026-06-13 | Config & Build OK | Antigravity | Build exitoso, pythonPath configurable, push a GitHub |
| 2026-06-14 | Conexión IPC & Robustez | Antigravity | Evitada duplicación de listeners, invalidación de WhisperService al cambiar ajustes, y cierre limpio de subprocess Python |
| 2026-06-14 | Fix de Bloqueantes | Antigravity | Solucionado ERR_REQUIRE_ESM degradando dictionary-en a v3, y bloqueada apertura de DevTools en produccion |
| 2026-06-14 | Fix de CSP EvalError | Antigravity | Configurado devtool a 'source-map' en webpack.renderer.config.js para respetar la CSP de la app |
| 2026-06-14 | Fix de pipeline de grabación | Antigravity | WhisperService detecta crash prematuro de Python y rechaza Promise inmediatamente; RecordButton con debouncing y reset completo de UI en errores |
| 2026-06-14 | Mejoras de UX & UI | Antigravity | Transcripción editable con sync de estado en tiempo real, barra de estado inferior consolidada, retry automático LLM de 15s y modelo por defecto 'small' |
| 2026-06-14 | Fix de acumulación de texto & robustez | Antigravity | Corregida la acumulación de texto entre segmentos usando sessionText; prevenida caídas del proceso main capturando errores de stream EPIPE en subprocesses y registrando global exception logs |
| 2026-06-14 | Selector de modelos Whisper local | Antigravity | Configurado download_root en whisper_server.py para leer modelos locales y verificado el soporte funcional en Ajustes |
| 2026-06-14 | Logo oficial + ícono + loading screen | Antigravity | assets/logo.png + icon.ico + icon-512.png + favicon.png generados con scripts/generate-icons.js (sharp + to-ico); ícono en WindowManager; loading screen IPC completo (whisper:ready); build OK; tag v0.1-logo-loading pushed |
| 2026-06-15 | Fix: loading screen trabada | Antigravity | `whisper:ready` ahora se emite al arrancar la app (pre-carga en background en `registerIpcHandlers`), no al presionar REC. `WhisperService.clearCallbacks()` agregado para evitar duplicados. Si la pre-carga falla, la loading screen se oculta igual. |
| 2026-06-15 | Fix: visibilidad y colores de transcripción | Antigravity | Agregado `console.log` de diagnóstico para `#transcript-text`. Estilos de color aplicados dinámicamente: `#a0aec0` para texto parcial, `#e2e8f0` para texto final confirmado, `#ffffff` al detener grabación. Estilos de font-size, centrado y line-height forzados dinámicamente. |
