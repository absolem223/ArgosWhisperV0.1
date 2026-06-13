# Argos Whisper V.0.1

> Aplicación de escritorio Electron — transcripción de voz en tiempo real con Whisper local + transformación de texto vía LLM local.

---

## ¿Qué es Argos Whisper?

**Argos Whisper** es una ventana flotante always-on-top que:

1. **Transcribe** voz en streaming continuo usando Whisper (corriendo 100% local, sin internet)
2. **Muestra** el texto en vivo con un visualizador de waveform animado
3. **Transforma** el texto con un LLM local (LM Studio): cambiar estilo, resumir, traducir
4. **Corrige** ortografía localmente sin IA (nspell + diccionarios hunspell)
5. **Guarda** ejemplos few-shot de estilo para personalizar las transformaciones

---

## Requisitos del Sistema

| Requisito | Versión | Instalación |
|-----------|---------|-------------|
| Node.js | 18+ | https://nodejs.org |
| Python | 3.10+ | https://python.org |
| SoX | any | `choco install sox -y` (o manual) |
| LM Studio | latest | https://lmstudio.ai |
| Git | any | https://git-scm.com |

### Python: instalar faster-whisper

```bash
pip install faster-whisper numpy
```

### SoX (requerido para captura de audio)

```powershell
# Con Chocolatey (recomendado):
choco install sox -y

# O manual: descargar desde http://sox.sourceforge.net/
# Asegurarse que sox.exe esté en el PATH del sistema
```

---

## Setup del Proyecto

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/absolem223/ArgosWhisperV0.1.git
cd ArgosWhisperV0.1
npm install
```

### 2. Descargar modelo Whisper

```bash
# Descarga automática del modelo (small recomendado para balancear velocidad/calidad):
python scripts/setup-whisper.py --model small

# Opciones de modelo:
# tiny    → más rápido, menor calidad (39M params)
# base    → rápido, calidad básica (74M params)  
# small   → equilibrio recomendado (244M params)  ← DEFAULT
# medium  → mejor calidad (769M params)
# large-v3 → máxima calidad (1.5B params)
```

### 3. Configurar LM Studio

1. Descargar e instalar LM Studio desde https://lmstudio.ai
2. Cargar un modelo (recomendados: Qwen3 2B, Gemma 3 4B, Llama 3.2 3B)
3. Ir a **Local Server** y habilitar el servidor en el puerto `1234`
4. Verificar que el servidor está corriendo: `http://localhost:1234/v1/models`

### 4. Iniciar la app

```bash
npm start
```

---

## Estructura del Proyecto

```
Argos Whisper V.0.1/
├── src/
│   ├── main/           # Proceso main de Electron (audio, Whisper, LLM, IPC)
│   ├── renderer/       # UI (HTML, CSS, TypeScript)
│   ├── shared/         # Tipos e IPC channels compartidos
│   └── config/         # Presets y temas extensibles
├── data/
│   ├── fewshot/        # Ejemplos few-shot guardados por el usuario
│   └── history/        # Historial de transformaciones (undo/redo)
├── models/             # Modelos Whisper descargados (gitignored)
├── scripts/
│   ├── setup-whisper.py  # Helper de instalación
│   └── whisper_server.py # Servidor Python de transcripción
├── SPEC.md             # ← Fuente de verdad del proyecto (leer antes de modificar)
└── HANDOFF.md          # Estado actual y próximos pasos
```

---

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm start` | Build + lanzar app |
| `npm run build` | Build completo (main + renderer) |
| `npm run build:main` | Solo proceso main |
| `npm run build:renderer` | Solo renderer |
| `npm run dev` | Modo watch + hot reload |
| `npm run typecheck` | Verificar tipos TypeScript |

---

## Uso de la App

### Transcribir voz
1. Presionar el botón central **REC** (circular) — se ilumina en rojo
2. Hablar cerca del micrófono
3. El texto aparece en tiempo real en el panel superior
4. Presionar REC de nuevo para detener

### Transformar texto
1. Con texto transcripto, abrir el panel **Editar** (botón lápiz)
2. Expandir la sección deseada:
   - **Ortografía** → corrección sin IA, instantánea
   - **Cambiar estilo** → seleccionar estilo + Aplicar
   - **Resumir** → acorta el texto
   - **Traducir** → seleccionar idioma + Traducir
3. El resultado aparece en **"texto modificado"**
4. Usar **copiar** para copiar al portapapeles

### Ejemplos few-shot (s/l)
1. Generar un resultado de transformación que te guste
2. Abrir **s/l** → escribir nombre → **Guardar actual**
3. La próxima vez, abrir **s/l** → seleccionar el ejemplo (✓) para usarlo como referencia en "Cambiar estilo"

### Seleccionar modelo LLM
- Botón **llm** → aparece la lista de modelos cargados en LM Studio → click para seleccionar

---

## Metodología: SDD (Spec-Driven Development)

Este proyecto sigue SDD. **SPEC.md** es la fuente de verdad.

Antes de modificar cualquier cosa, leer:
1. [`SPEC.md`](SPEC.md) — arquitectura, contratos, decisiones
2. [`HANDOFF.md`](HANDOFF.md) — estado actual, próximos pasos

---

## Troubleshooting

### "SoX not found" al grabar
→ Instalar SoX: `choco install sox -y` y reiniciar la terminal/app

### "Python not found" / Whisper no inicia
→ Verificar que Python esté en el PATH: `python --version`
→ Instalar faster-whisper: `pip install faster-whisper`

### "LLM desconectado" en el status
→ Verificar que LM Studio esté corriendo con el servidor habilitado en puerto 1234
→ En Ajustes, verificar la URL del runtime

### La app no arranca
→ Verificar Node.js 18+: `node --version`
→ `npm install` en la raíz del proyecto

---

## Contribuir

Ver SPEC.md antes de hacer cualquier cambio. Registrar decisiones de arquitectura en `.specify/decisions/`.

---

*Argos Whisper V.0.1 — Proyecto Antigravity*
