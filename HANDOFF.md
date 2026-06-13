# HANDOFF — Argos Whisper V.0.1

> **PARA TODO AGENTE:** Leer este archivo + SPEC.md completo ANTES de cualquier cambio.
> Este documento refleja el estado real del proyecto en el último hito confirmado.

---

## Última actualización
2026-06-13 — Hito: Inicialización del proyecto (Scaffold + SDD)

## Estado general
🟡 **Fase 1: Scaffold** — En progreso

---

## Hitos completados
- [ ] Scaffold del proyecto (estructura + SPEC + HANDOFF + git)

## En progreso
- **Fase 1:** Inicialización (estructura de carpetas, SPEC.md, HANDOFF.md, git init + push)

## Próximos pasos (Fase 2)
1. Configurar Electron + Webpack 5 (configs main + renderer) + tsconfig estricto
2. Implementar `WindowManager` (frameless, always-on-top, draggable, 620×800)
3. Implementar `AudioCaptureService` (node-record-lpcm16, 16kHz mono, emite waveform data)
4. Implementar `WhisperService` (child_process Python faster-whisper, parsea stdout JSON)
5. Registrar IPC handlers base en `ipcHandlers.ts`
6. Renderer base: index.html + estilos dark-blue + layout estructural
7. Componente `WaveformVisualizer` (Canvas API, 60fps)
8. Componente `RecordButton` (toggle PTT circular, glow rojo/azul)
9. Componente `TranscriptDisplay` (texto en vivo)

---

## Decisiones pendientes de confirmar con el usuario
- [ ] ¿Tiene SoX instalado en PATH? (requerido por node-record-lpcm16)
- [ ] ¿Tiene Visual Studio Build Tools? (evaluar naudiodon como upgrade futuro — ADR-001)
- [ ] ¿Qué modelo Whisper tiene descargado? (base / small / medium / large-v3)
- [ ] ¿Qué modelos tiene cargados en LM Studio actualmente?
- [ ] ¿Python en PATH? ¿Versión? ¿faster-whisper instalado?

---

## Dependencias del entorno (prerequisitos para el usuario)
| Dependencia | Estado | Notas |
|-------------|--------|-------|
| Node.js 18+ | ❓ | Verificar con `node --version` |
| Python 3.10+ | ❓ | Verificar con `python --version` |
| `faster-whisper` (pip) | ❓ | `pip install faster-whisper` |
| SoX en PATH | ❓ | Requerido por node-record-lpcm16 |
| LM Studio | ❓ | Corriendo en localhost:1234 |
| Git | ❓ | Para commits y tags |

---

## Notas para retomar sesión
- La fuente de verdad es **SPEC.md** — nunca el código.
- El repo remoto es: https://github.com/absolem223/ArgosWhisperV0.1
- Para taggear hitos: `git tag v0.1-<nombre-hito> && git push origin v0.1-<nombre-hito>`
- Antes de cada sesión: leer SPEC.md + este HANDOFF.md.
- Si algo "funciona bien" y es confirmado por el usuario: mover a "Hitos completados" + commit + tag + push.

---

## Log de sesiones
| Fecha | Hito | Agente | Notas |
|-------|------|--------|-------|
| 2026-06-13 | Inicialización SDD | Antigravity | Scaffold + SPEC + HANDOFF + git |
