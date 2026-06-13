# ADR-001: Audio Capture — node-record-lpcm16 vs naudiodon

**Fecha:** 2026-06-13  
**Estado:** Aceptado  
**Autor:** Antigravity (inicialización SDD)

## Contexto

Para capturar audio del micrófono del sistema en Electron (proceso main), existen dos principales alternativas en el ecosistema Node.js:

1. **naudiodon** (`@cwavesoftware/naudiodon`) — Binding nativo de PortAudio para Node.js
2. **node-record-lpcm16** — Grabador basado en SoX como proceso externo

## Decisión

**Usar `node-record-lpcm16`** como implementación de audio capture en V.0.1.

## Razones

1. **Compilación nativa:** `naudiodon` requiere Visual Studio Build Tools (MSVC) + Python 2/3 para `node-gyp`. Esto añade ~2-4GB de dependencias de desarrollo y fricción significativa en el setup del proyecto.

2. **Portabilidad en Windows:** `node-record-lpcm16` usa SoX como proceso externo. SoX es ampliamente disponible en Windows vía Chocolatey (`choco install sox -y`) o instalador standalone, sin necesitar compilación nativa.

3. **Suficiencia para Whisper:** Whisper procesa audio a 16kHz mono. `node-record-lpcm16` puede configurarse para exactamente este formato. La latencia adicional por usar un proceso externo (~50ms) es aceptable para transcripción.

4. **Simplicidad de debug:** Si hay problemas de audio, SoX es fácil de probar independientemente desde la terminal.

## Consecuencias

- **Positivo:** Setup más simple, sin dependencias de MSVC.
- **Negativo:** Requiere SoX instalado y en el PATH del sistema.
- **Negativo:** Menor control sobre el pipeline de audio a bajo nivel.
- **Riesgo:** Si el usuario no tiene SoX instalado, el error es claro y documentado.

## Alternativa futura (ADR update candidato)

Migrar a `naudiodon` si:
- El usuario confirma que tiene Visual Studio Build Tools instalados
- Se requiere menor latencia de audio (real-time streaming con <20ms)
- Se necesita procesamiento de audio a nivel de muestra (VAD personalizado, etc.)

Para migrar: reemplazar `AudioCaptureService.ts` con implementación naudiodon manteniendo la misma interfaz EventEmitter.

## Prerequisito de usuario

```bash
# Windows con Chocolatey:
choco install sox -y

# Verificar instalación:
sox --version
```
