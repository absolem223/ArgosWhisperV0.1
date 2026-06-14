/**
 * src/main/preload.ts
 * Script de preload — expone APIs seguras al renderer via contextBridge.
 * SPEC: Sección 5 — IPC Channels, Seguridad Electron
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc';
import type {
  AppSettings,
  TransformRequest,
  IFewShotExample,
  SpellCheckResult,
  LLMModel,
} from '../shared/types';

// API expuesta al renderer como window.argosAPI
contextBridge.exposeInMainWorld('argosAPI', {
  // ─── Transcripción ─────────────────────────────────────────────────────────
  transcription: {
    start: (language?: string) =>
      ipcRenderer.invoke(IPC.TRANSCRIPTION_START, { language }),
    stop: () =>
      ipcRenderer.invoke(IPC.TRANSCRIPTION_STOP),
    onPartial: (cb: (text: string) => void) => {
      const handler = (_: unknown, data: { text: string }) => cb(data.text);
      ipcRenderer.on(IPC.TRANSCRIPTION_PARTIAL, handler);
      return () => ipcRenderer.removeListener(IPC.TRANSCRIPTION_PARTIAL, handler);
    },
    onFinal: (cb: (text: string) => void) => {
      const handler = (_: unknown, data: { text: string }) => cb(data.text);
      ipcRenderer.on(IPC.TRANSCRIPTION_FINAL, handler);
      return () => ipcRenderer.removeListener(IPC.TRANSCRIPTION_FINAL, handler);
    },
    onError: (cb: (message: string) => void) => {
      const handler = (_: unknown, data: { message: string }) => cb(data.message);
      ipcRenderer.on(IPC.TRANSCRIPTION_ERROR, handler);
      return () => ipcRenderer.removeListener(IPC.TRANSCRIPTION_ERROR, handler);
    },
  },

  // ─── Audio / Waveform ──────────────────────────────────────────────────────
  audio: {
    onWaveform: (cb: (amplitudes: number[]) => void) => {
      const handler = (_: unknown, data: number[]) => cb(data);
      ipcRenderer.on(IPC.AUDIO_WAVEFORM, handler);
      return () => ipcRenderer.removeListener(IPC.AUDIO_WAVEFORM, handler);
    },
  },

  // ─── LLM ───────────────────────────────────────────────────────────────────
  llm: {
    isReady: (): Promise<{ ready: boolean }> =>
      ipcRenderer.invoke(IPC.LLM_IS_READY),
    listModels: (): Promise<{ models: LLMModel[]; error?: string }> =>
      ipcRenderer.invoke(IPC.LLM_LIST_MODELS),
    transform: (request: TransformRequest): Promise<{ text?: string; error?: string }> =>
      ipcRenderer.invoke(IPC.LLM_TRANSFORM, request),
  },

  // ─── Few-Shot ──────────────────────────────────────────────────────────────
  fewshot: {
    load: (): Promise<{ examples: IFewShotExample[] }> =>
      ipcRenderer.invoke(IPC.FEWSHOT_LOAD),
    save: (example: IFewShotExample): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC.FEWSHOT_SAVE, example),
    delete: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC.FEWSHOT_DELETE, { id }),
  },

  // ─── Spellcheck ────────────────────────────────────────────────────────────
  spellcheck: {
    check: (text: string): Promise<SpellCheckResult> =>
      ipcRenderer.invoke(IPC.SPELLCHECK_CHECK, { text }),
  },

  // ─── Settings ──────────────────────────────────────────────────────────────
  settings: {
    get: (): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (partial: Partial<AppSettings>): Promise<{ success: boolean }> =>
      ipcRenderer.invoke(IPC.SETTINGS_SET, partial),
  },

  // ─── Window ────────────────────────────────────────────────────────────────
  window: {
    minimize: () => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
    close: () => ipcRenderer.send(IPC.WINDOW_CLOSE),
  },

  // ─── Whisper Status ──────────────────────────────────────────────────────
  whisper: {
    onReady: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on('whisper:ready', handler);
      return () => ipcRenderer.removeListener('whisper:ready', handler);
    },
  },
});

// Type declaration para window.argosAPI en el renderer
export type ArgosAPI = typeof import('./preload');
