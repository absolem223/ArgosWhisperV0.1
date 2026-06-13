/**
 * src/shared/types.ts
 * Interfaces y tipos compartidos entre main y renderer.
 * SPEC: Sección 4 — Contratos / Interfaces Clave
 */

// ─── LLM Runtime ─────────────────────────────────────────────────────────────

export interface LLMModel {
  id: string;
  name: string;
  status: 'loaded' | 'unloaded' | 'loading';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ILLMRuntime {
  listModels(): Promise<LLMModel[]>;
  loadModel(id: string): Promise<void>;
  isReady(): Promise<boolean>;
  chatCompletion(messages: ChatMessage[], model: string): Promise<string>;
}

// ─── Transform Preset ─────────────────────────────────────────────────────────

export interface ITransformPreset {
  id: string;
  label: string;
  systemPrompt: string;
  requiresFewShot: boolean;
  preferredModelId?: string;
}

// ─── Few-Shot Examples ────────────────────────────────────────────────────────

export interface IFewShotExample {
  id: string;
  name: string;
  conversationSample: string; // JSON serializado de ChatMessage[]
  createdAt: string;          // ISO 8601
}

// ─── Transcription ───────────────────────────────────────────────────────────

export interface ITranscriptionEngine {
  start(): Promise<void>;
  stop(): Promise<void>;
  onPartialResult(cb: (text: string) => void): void;
  onFinalResult(cb: (text: string) => void): void;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  llmRuntimeUrl: string;                   // e.g. "http://localhost:1234"
  activeModelId: string;
  modelPerPreset: Record<string, string>;  // presetId → modelId
  whisperModel: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';
  whisperLanguage: string;                 // "es" | "en" | "auto"
  activeTheme: string;
  activeFewShotId: string | null;
  shortcuts: Record<string, string>;
  pythonPath: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  llmRuntimeUrl: 'http://localhost:1234',
  activeModelId: '',
  modelPerPreset: {},
  whisperModel: 'tiny',
  whisperLanguage: 'auto',
  activeTheme: 'dark-blue',
  activeFewShotId: null,
  shortcuts: {
    toggleRecord: 'Space',
    copyResult: 'Ctrl+C',
  },
  pythonPath: 'python',
};

// ─── History ──────────────────────────────────────────────────────────────────

export interface TransformHistoryEntry {
  id: string;
  timestamp: string;
  presetId: string;
  inputText: string;
  outputText: string;
  modelId: string;
}

// ─── IPC Payloads ─────────────────────────────────────────────────────────────

export interface TransformRequest {
  text: string;
  presetId: string;
  modelId: string;
  fewShotExampleId?: string;
}

export interface SpellCheckResult {
  corrected: string;
  corrections: Array<{ original: string; suggestion: string }>;
}

export interface WaveformData {
  amplitudes: number[]; // valores 0-1, array de 64 elementos
}
