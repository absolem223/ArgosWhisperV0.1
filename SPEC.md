# SPEC.md — Argos Whisper V.0.1
> **FUENTE DE VERDAD DEL PROYECTO**
> Todo agente (Antigravity, Codex, Copilot, Claude) DEBE leer este archivo completo ANTES de realizar cualquier cambio. Si un cambio contradice esta spec, proponer actualización de SPEC.md primero.

---

## 1. Objetivo del proyecto

**Argos Whisper** es una aplicación de escritorio Electron, ventana flotante frameless always-on-top, que:

1. Transcribe voz en streaming continuo con Whisper corriendo localmente (Python subprocess).
2. Muestra el texto transcripto en vivo con visualizador de waveform animado.
3. Permite editar/transformar ese texto mediante un panel central "Editar" (corrección ortográfica local sin LLM, cambio de estilo, resumen, traducción — todo vía LLM excepto ortografía).
4. Usa modelos de lenguaje corriendo localmente (LM Studio u otro runtime configurable) con selección rápida de modelo y soporte de ejemplos few-shot guardables.
5. Muestra el resultado transformado con acciones de copiar, regenerar y feedback profesional.

**Versión:** V.0.1  
**Ruta raíz:** `E:\ARGOS RESONANCE\ARGOS WHISPER\Argos Whisper V.0.1`  
**Repositorio:** https://github.com/absolem223/ArgosWhisperV0.1  
**Idioma UI:** Español  

---

## 2. Diseño Visual

### Paleta de colores
| Variable CSS | Valor | Uso |
|---|---|---|
| `--bg-primary` | `#0a0d1a` | Fondo principal |
| `--bg-secondary` | `#0d1633` | Fondo paneles |
| `--bg-panel` | `#111827` | Fondo tarjetas/glassmorphism |
| `--accent-blue` | `#00aaff` | Acentos principales, waveform, glow azul |
| `--accent-violet` | `#7c3aed` | Acentos secundarios, bordes activos |
| `--accent-red` | `#ef4444` | Botón REC activo, dot grabando |
| `--border-default` | `#1e2a4a` | Bordes de paneles |
| `--text-primary` | `#f0f4ff` | Texto principal |
| `--text-secondary` | `#8899bb` | Texto secundario |
| `--text-accent` | `#00aaff` | Labels destacados ("texto modificado") |
| `--success` | `#22c55e` | Dot "Conectado" |
| `--glass-bg` | `rgba(13,22,51,0.7)` | Glassmorphism backgrounds |
| `--glass-border` | `rgba(0,170,255,0.15)` | Bordes glassmorphism |

### Tipografía
- **Fuente:** Inter (Google Fonts)
- `argos` en `font-weight: 700`
- `whisper` en `font-weight: 300`
- Texto transcripto: 18px, line-height 1.6
- UI labels: 12px uppercase tracking

### Efectos visuales
- **Glassmorphism:** `backdrop-filter: blur(12px)` en paneles sobre el header
- **Glow azul:** `box-shadow: 0 0 20px rgba(0,170,255,0.3)` en elementos activos
- **Glow rojo:** `box-shadow: 0 0 30px rgba(239,68,68,0.6)` en botón REC grabando
- **Waveform:** Canvas animado, barras verticales que responden a amplitud de audio en tiempo real, 60fps
- **Transiciones:** paneles colapsables con `transition: max-height 0.3s ease, opacity 0.2s`

### Ventana
- **Tamaño inicial:** 620×800px
- **Mínimo:** 400×500px
- **Frameless:** sí (sin chrome del OS)
- **Always on top:** sí
- **Draggable:** sí (via `-webkit-app-region: drag` en header)
- **Transparent:** background con `backgroundColor: '#0a0d1a'`

---

## 3. Arquitectura de Carpetas

```
E:\ARGOS RESONANCE\ARGOS WHISPER\Argos Whisper V.0.1\
├── src/
│   ├── main/
│   │   ├── index.ts                     # Entry point proceso main Electron
│   │   ├── audio/
│   │   │   └── AudioCaptureService.ts   # Captura mic vía node-record-lpcm16
│   │   ├── transcription/
│   │   │   └── WhisperService.ts        # Wrapper Python faster-whisper (child_process)
│   │   ├── llm/
│   │   │   ├── runtime/
│   │   │   │   ├── ILLMRuntime.ts       # Interfaz común ILLMRuntime
│   │   │   │   └── LMStudioRuntime.ts   # Implementación LM Studio API
│   │   │   ├── presets/
│   │   │   │   └── presets.ts           # Definición de transformaciones
│   │   │   └── fewshot/
│   │   │       └── FewShotManager.ts    # Save/load JSON en data/fewshot/
│   │   ├── spellcheck/
│   │   │   └── SpellCheckService.ts     # nspell con diccionarios ES/EN
│   │   ├── window/
│   │   │   └── WindowManager.ts         # Config ventana flotante
│   │   └── ipc/
│   │       └── ipcHandlers.ts           # Registro de todos los handlers IPC
│   ├── renderer/
│   │   ├── index.html
│   │   ├── renderer.ts                  # Entry point renderer
│   │   ├── components/
│   │   │   ├── TranscriptDisplay/       # Texto en vivo
│   │   │   ├── WaveformVisualizer/      # Canvas waveform animado
│   │   │   ├── RecordButton/            # Toggle PTT circular con glow
│   │   │   ├── EditPanel/               # Panel colapsable 4 sub-secciones
│   │   │   ├── SaveLoadPanel/           # "s/l" few-shot management
│   │   │   ├── ModelSwitcher/           # "llm" dropdown selector
│   │   │   ├── SettingsPanel/           # "Ajustes" runtime + modelos
│   │   │   ├── ThemeSwitcher/           # "TH" cambio de tema
│   │   │   ├── ResultPanel/             # "texto modificado" + acciones
│   │   │   └── ToolbarStatus/           # Barra inferior estado
│   │   └── styles/
│   │       ├── global.css               # Reset + variables CSS
│   │       ├── theme-dark-blue.css      # Tema por defecto
│   │       └── animations.css           # Waveform, glow, transiciones
│   ├── shared/
│   │   ├── ipc.ts                       # Channel names tipados
│   │   └── types.ts                     # Interfaces compartidas
│   └── config/
│       ├── presets.ts                   # Array de ITransformPreset
│       └── themes.ts                    # Array de temas disponibles
├── data/
│   ├── fewshot/                         # Ejemplos guardados (JSON)
│   └── history/                         # Undo/redo stack (JSON)
├── models/                              # Modelos Whisper (gitignored)
├── scripts/
│   └── setup-whisper.py                 # Helper setup Python/Whisper
├── .specify/
│   └── decisions/                       # Log de decisiones de arquitectura
├── SPEC.md                              # ← Este archivo
├── HANDOFF.md                           # Estado actual del proyecto
├── package.json
├── tsconfig.json
├── webpack.main.config.js
├── webpack.renderer.config.js
├── .gitignore
└── README.md
```

---

## 4. Contratos / Interfaces Clave

Definidas en `src/shared/types.ts`:

```typescript
// Runtime LLM — interfaz común para cualquier backend
export interface ILLMRuntime {
  listModels(): Promise<LLMModel[]>;
  loadModel(id: string): Promise<void>;
  isReady(): Promise<boolean>;
  chatCompletion(messages: ChatMessage[], model: string): Promise<string>;
}

export interface LLMModel {
  id: string;
  name: string;
  status: 'loaded' | 'unloaded' | 'loading';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Preset de transformación de texto
export interface ITransformPreset {
  id: string;
  label: string;
  systemPrompt: string;
  requiresFewShot: boolean;
  preferredModelId?: string;  // Modelo preferido por preset (opcional)
}

// Ejemplo few-shot de estilo de escritura
export interface IFewShotExample {
  id: string;
  name: string;
  conversationSample: string;  // JSON serializado de ChatMessage[]
  createdAt: string;           // ISO 8601
}

// Motor de transcripción
export interface ITranscriptionEngine {
  start(): Promise<void>;
  stop(): Promise<void>;
  onPartialResult(cb: (text: string) => void): void;
  onFinalResult(cb: (text: string) => void): void;
}

// Configuración persistida de la app
export interface AppSettings {
  llmRuntimeUrl: string;       // ej. "http://localhost:1234"
  activeModelId: string;
  modelPerPreset: Record<string, string>;  // presetId → modelId
  whisperModel: string;         // "base" | "small" | "medium" | "large-v3"
  whisperLanguage: string;      // "es" | "en" | "auto"
  activeTheme: string;
  activeFewShotId: string | null;
  shortcuts: Record<string, string>;
}

// Entrada del historial undo/redo
export interface TransformHistoryEntry {
  id: string;
  timestamp: string;
  presetId: string;
  inputText: string;
  outputText: string;
  modelId: string;
}
```

---

## 5. IPC Channels Tipados

Definidos en `src/shared/ipc.ts`:

| Canal | Dirección | Payload | Descripción |
|-------|-----------|---------|-------------|
| `transcription:start` | renderer → main | `{ language: string }` | Inicia grabación |
| `transcription:stop` | renderer → main | — | Detiene grabación |
| `transcription:partial` | main → renderer | `{ text: string }` | Texto parcial en vivo |
| `transcription:final` | main → renderer | `{ text: string }` | Texto final de segmento |
| `transcription:error` | main → renderer | `{ message: string }` | Error en transcripción |
| `audio:waveform` | main → renderer | `number[]` | Array de amplitudes (0-1) para Canvas |
| `llm:list-models` | renderer → main | — | Solicita lista de modelos |
| `llm:models-result` | main → renderer | `LLMModel[]` | Respuesta con modelos disponibles |
| `llm:transform` | renderer → main | `TransformRequest` | Solicita transformación |
| `llm:transform-result` | main → renderer | `{ text: string }` | Resultado de transformación |
| `llm:transform-error` | main → renderer | `{ message: string }` | Error de transformación |
| `fewshot:save` | renderer → main | `IFewShotExample` | Guarda ejemplo |
| `fewshot:load` | renderer → main | — | Solicita lista de ejemplos |
| `fewshot:list` | main → renderer | `IFewShotExample[]` | Lista de ejemplos disponibles |
| `fewshot:delete` | renderer → main | `{ id: string }` | Elimina ejemplo |
| `spellcheck:check` | renderer → main | `{ text: string }` | Verifica ortografía |
| `spellcheck:result` | main → renderer | `SpellCheckResult` | Correcciones sugeridas |
| `settings:get` | renderer → main | — | Solicita configuración |
| `settings:data` | main → renderer | `AppSettings` | Configuración actual |
| `settings:set` | renderer → main | `Partial<AppSettings>` | Actualiza configuración |
| `window:drag` | renderer → main | — | Inicia drag en region no draggable |
| `history:get` | renderer → main | — | Solicita historial |
| `history:data` | main → renderer | `TransformHistoryEntry[]` | Historial de transformaciones |

### Tipos de payload adicionales
```typescript
interface TransformRequest {
  text: string;
  presetId: string;
  modelId: string;
  fewShotExampleId?: string;
}

interface SpellCheckResult {
  corrected: string;
  corrections: Array<{ original: string; suggestion: string }>;
}
```

---

## 6. Stack Tecnológico

| Capa | Tecnología | Versión | Decisión |
|------|-----------|---------|----------|
| Framework | Electron | ^28.0.0 | Estándar para desktop apps con web stack |
| Lenguaje | TypeScript | ^5.3.0 (estricto) | `strict: true`, sin `any` |
| Bundler Main | Webpack 5 | ^5.89.0 | Config separada main/renderer |
| Bundler Renderer | Webpack 5 + html-webpack-plugin | ^5.89.0 | — |
| Transcripción | Python `faster-whisper` | latest | subprocess con child_process |
| Audio capture | `node-record-lpcm16` | ^1.0.1 | **Ver decisión ADR-001** |
| LLM Runtime | LM Studio REST API | localhost:1234 | OpenAI-compatible, extensible |
| Spellcheck | `nspell` + diccionarios hunspell | ^2.1.5 | Sin LLM, local puro |
| Persistencia | JSON files + `electron-store` | ^8.1.0 | `data/` para fewshot/history |
| UI | Vanilla TS + CSS custom | — | Sin frameworks UI |

---

## 7. Decisiones de Arquitectura

### ADR-001: Audio Capture — node-record-lpcm16 vs naudiodon
**Decisión:** Usar `node-record-lpcm16` como implementación inicial.  
**Razón:** `naudiodon` requiere compilación nativa con Visual Studio Build Tools + Python 2, lo que añade fricción en setup. `node-record-lpcm16` usa SoX (disponible en Windows vía instalador) y es más portable.  
**Trade-off:** Menor calidad/latencia que naudiodon en teoría, pero suficiente para Whisper (muestrea a 16kHz mono).  
**Alternativa futura:** Migrar a `naudiodon` si el usuario confirma que tiene MSVC Build Tools instalados y requiere mejor latencia.  
**Prerequisito:** SoX instalado en el sistema y disponible en PATH (`choco install sox` o instalador manual).

### ADR-002: Selección de modelo por preset
**Decisión:** El ModelSwitcher global establece un modelo por defecto. Adicionalmente, en Ajustes se puede asignar un modelo específico por tipo de preset (ej. modelo rápido para "estilo WhatsApp", modelo grande para "feedback profesional").  
**Implementación:** Campo `modelPerPreset: Record<string, string>` en `AppSettings`. `LMStudioRuntime.chatCompletion` recibe el `modelId` resuelto desde este mapa.

### ADR-003: Whisper via subprocess Python
**Decisión:** Lanzar Python con `faster-whisper` como child_process, comunicar via stdin/stdout.  
**Razón:** No existe binding Node.js estable para faster-whisper en Windows. El subprocess es confiable y desacopla el runtime de Python del proceso Electron.  
**Script Python:** `scripts/whisper_server.py` — lee chunks de audio de stdin, emite JSON por stdout.

---

## 8. Componentes UI

### Toolbar Central (7 botones)
```
[ Editar (E) ] [ llm ] [ s/l ] [ ● REC ] [ Info (i) ] [ TH ] [ Ajustes (⚙) ]
```

### EditPanel — Sub-secciones colapsables (independientes, encadenables)
1. **Ortografía** — `nspell`, corrección local sin LLM. Input: texto transcripto. Output: texto corregido.
2. **Cambiar estilo** — LLM con preset seleccionado + few-shot opcional. Targets: formal, informal, WhatsApp, email, etc.
3. **Resumir** — LLM, acorta manteniendo sentido.
4. **Traducir** — LLM, idioma destino seleccionable (ES/EN/FR/PT/DE).

Cada sub-sección tiene su propio botón "Aplicar". El output de uno puede ser el input del siguiente (encadenamiento).  
Sistema de undo/redo: stack en `data/history/`, navegable con botones ← →.

### SaveLoadPanel (s/l)
- Desplegable hacia arriba desde toolbar.
- Listar / cargar / guardar / eliminar ejemplos few-shot (JSON en `data/fewshot/`).
- También guarda/carga configuraciones completas (modelo + preset + tema).
- Ejemplo few-shot activo se indica con ★ y se usa en "Cambiar estilo".

### ModelSwitcher (llm)
- Dropdown que lista modelos cargados en LM Studio.
- Cambia `activeModelId` en settings sin abrir Ajustes.
- Indicador de modelo actual visible en toolbar status.

### ThemeSwitcher (TH)
- Dropdown con temas disponibles (definidos en `src/config/themes.ts`).
- Aplica cambiando clase en `<body>`.
- Default: `dark-blue`.

### SettingsPanel (Ajustes)
- URL del runtime LLM (default: `http://localhost:1234`).
- Lista de modelos con estado: cargado / no cargado / cargando.
- Acción cargar/descargar modelo con feedback.
- Modelo por preset: tabla de asignación presetId → modelId.
- Config Whisper: modelo (base/small/medium/large-v3) e idioma.
- Atajos de teclado, idioma de UI.

### ResultPanel (texto modificado)
- Muestra el output de la última transformación aplicada.
- Acciones: **Copiar** al portapapeles, **Volver a generar** (re-ejecuta transformación), **Me gusta** / **No me gusta** (feedback, almacenado localmente).
- **Feedback profesional** (v0: placeholder, en v1: el LLM evalúa calidad/tono y sugiere mejoras).

### ToolbarStatus (barra inferior)
- Dot verde + "Conectado" | Dot rojo + "Grabando..." | Dot gris + "Desconectado"
- Icono waveform pequeño + "Modelo: [nombre del modelo Whisper activo]"
- Flecha expandir/colapsar barra.

---

## 9. Presets de Transformación

Definidos en `src/config/presets.ts` (implementación en `src/main/llm/presets/presets.ts`):

| ID | Label | Requiere Few-Shot |
|----|-------|-------------------|
| `style` | Cambiar estilo | Sí (opcional) |
| `summarize` | Resumir | No |
| `translate` | Traducir | No |
| `feedback` | Feedback profesional | No |

---

## 10. Reglas de Desarrollo

1. **TypeScript estricto:** `strict: true` en tsconfig. Sin `any` explícito.
2. **IPC tipado:** Siempre usar las constantes de `src/shared/ipc.ts`, nunca strings hardcoded.
3. **Separación de procesos:** Whisper y spellcheck en procesos separados, no bloquean main thread.
4. **Extensibilidad:** Presets y temas extensibles añadiendo entradas a arrays en `src/config/`.
5. **Persistencia:** Settings en `electron-store` (userData). Fewshot y history en `data/` (JSON).
6. **Sin dependencias de red en core:** Whisper y spellcheck corren 100% local. LLM requiere LM Studio local.
7. **Metodología SDD:** Cualquier desviación de esta spec debe documentarse en `.specify/decisions/` y actualizar SPEC.md.
