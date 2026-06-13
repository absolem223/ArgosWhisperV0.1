/**
 * src/shared/ipc.ts
 * Canales IPC tipados entre main y renderer.
 * SPEC: Sección 5 — IPC Channels Tipados
 *
 * REGLA: Nunca usar strings hardcoded para canales IPC.
 * Siempre usar las constantes de este archivo.
 */

export const IPC = {
  // ─── Transcripción ────────────────────────────────────────────────────────
  TRANSCRIPTION_START: 'transcription:start',
  TRANSCRIPTION_STOP: 'transcription:stop',
  TRANSCRIPTION_PARTIAL: 'transcription:partial',
  TRANSCRIPTION_FINAL: 'transcription:final',
  TRANSCRIPTION_ERROR: 'transcription:error',
  TRANSCRIPTION_STATUS: 'transcription:status',

  // ─── Audio / Waveform ─────────────────────────────────────────────────────
  AUDIO_WAVEFORM: 'audio:waveform',

  // ─── LLM ──────────────────────────────────────────────────────────────────
  LLM_LIST_MODELS: 'llm:list-models',
  LLM_MODELS_RESULT: 'llm:models-result',
  LLM_TRANSFORM: 'llm:transform',
  LLM_TRANSFORM_RESULT: 'llm:transform-result',
  LLM_TRANSFORM_ERROR: 'llm:transform-error',
  LLM_IS_READY: 'llm:is-ready',
  LLM_READY_RESULT: 'llm:ready-result',

  // ─── Few-Shot ─────────────────────────────────────────────────────────────
  FEWSHOT_SAVE: 'fewshot:save',
  FEWSHOT_LOAD: 'fewshot:load',
  FEWSHOT_LIST: 'fewshot:list',
  FEWSHOT_DELETE: 'fewshot:delete',

  // ─── Spellcheck ───────────────────────────────────────────────────────────
  SPELLCHECK_CHECK: 'spellcheck:check',
  SPELLCHECK_RESULT: 'spellcheck:result',

  // ─── Settings ─────────────────────────────────────────────────────────────
  SETTINGS_GET: 'settings:get',
  SETTINGS_DATA: 'settings:data',
  SETTINGS_SET: 'settings:set',

  // ─── History ──────────────────────────────────────────────────────────────
  HISTORY_GET: 'history:get',
  HISTORY_DATA: 'history:data',
  HISTORY_CLEAR: 'history:clear',

  // ─── Window ───────────────────────────────────────────────────────────────
  WINDOW_DRAG: 'window:drag',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_CLOSE: 'window:close',
} as const;

export type IPCChannel = (typeof IPC)[keyof typeof IPC];
