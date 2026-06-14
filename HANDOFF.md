# HANDOFF — Argos Whisper V.0.1

> **PARA TODO AGENTE:** Leer este archivo + SPEC.md completo ANTES de cualquier cambio.
> Este documento refleja el estado real del proyecto en el último hito confirmado.

---

## Última actualización
2026-06-14 — Hito: Conexión de Handlers IPC Reales y Robustez de Procesos (V.0.1-ipc-ok)

## Estado general
🟢 **Fase 1 a Fase 5: Implementación & Build** — Completado (IPC robustecido)
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
