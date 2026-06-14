/**
 * src/renderer/renderer.ts
 * Entry point del renderer — inicializa todos los componentes UI.
 * SPEC: Sección 8 — Componentes UI
 */

import './styles/global.css';
import './styles/theme-dark-blue.css';
import './styles/animations.css';

import { initWaveformVisualizer } from './components/WaveformVisualizer/WaveformVisualizer';
import { initRecordButton } from './components/RecordButton/RecordButton';
import { initEditPanel } from './components/EditPanel/EditPanel';
import { initModelSwitcher } from './components/ModelSwitcher/ModelSwitcher';
import { initSaveLoadPanel } from './components/SaveLoadPanel/SaveLoadPanel';
import { initSettingsPanel } from './components/SettingsPanel/SettingsPanel';
import { initThemeSwitcher } from './components/ThemeSwitcher/ThemeSwitcher';
import { initResultPanel } from './components/ResultPanel/ResultPanel';
import { initToolbarStatus } from './components/ToolbarStatus/ToolbarStatus';
import { initTranscriptDisplay } from './components/TranscriptDisplay/TranscriptDisplay';
import { initWindowControls } from './components/WindowControls/WindowControls';
import { PanelManager } from './PanelManager';

// ─── Declaración de tipos para window.argosAPI ────────────────────────────────
declare global {
  interface Window {
    argosAPI: {
      transcription: {
        start(language?: string): Promise<{ success: boolean; error?: string }>;
        stop(): Promise<{ success: boolean }>;
        onPartial(cb: (text: string) => void): () => void;
        onFinal(cb: (text: string) => void): () => void;
        onError(cb: (message: string) => void): () => void;
      };
      audio: {
        onWaveform(cb: (amplitudes: number[]) => void): () => void;
      };
      llm: {
        isReady(): Promise<{ ready: boolean }>;
        listModels(): Promise<{ models: Array<{ id: string; name: string; status: string }>; error?: string }>;
        transform(request: {
          text: string;
          presetId: string;
          modelId: string;
          fewShotExampleId?: string;
        }): Promise<{ text?: string; error?: string }>;
      };
      fewshot: {
        load(): Promise<{ examples: Array<{ id: string; name: string; conversationSample: string; createdAt: string }> }>;
        save(example: { id: string; name: string; conversationSample: string; createdAt: string }): Promise<{ success: boolean }>;
        delete(id: string): Promise<{ success: boolean }>;
      };
      spellcheck: {
        check(text: string): Promise<{ corrected: string; corrections: Array<{ original: string; suggestion: string }> }>;
      };
      settings: {
        get(): Promise<{
          llmRuntimeUrl: string;
          activeModelId: string;
          modelPerPreset: Record<string, string>;
          whisperModel: string;
          whisperLanguage: string;
          activeTheme: string;
          activeFewShotId: string | null;
          shortcuts: Record<string, string>;
          pythonPath: string;
        }>;
        set(partial: Record<string, unknown>): Promise<{ success: boolean }>;
      };
      window: {
        minimize(): void;
        close(): void;
      };
    };
  }
}

// ─── Estado global del renderer ───────────────────────────────────────────────
export interface AppState {
  isRecording: boolean;
  transcriptText: string;
  resultText: string;
  activePresetId: string;
  activeModelId: string;
  activeFewShotId: string | null;
  activeTheme: string;
  lastTransformRequest: {
    text: string;
    presetId: string;
    modelId: string;
    fewShotExampleId?: string;
  } | null;
}

const state: AppState = {
  isRecording: false,
  transcriptText: '',
  resultText: '',
  activePresetId: 'style',
  activeModelId: '',
  activeFewShotId: null,
  activeTheme: 'dark-blue',
  lastTransformRequest: null,
};

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init(): Promise<void> {
  // Cargar settings persistidas
  try {
    const settings = await window.argosAPI.settings.get();
    state.activeModelId = settings.activeModelId;
    state.activeFewShotId = settings.activeFewShotId;
    state.activeTheme = settings.activeTheme;

    // Aplicar tema guardado
    if (settings.activeTheme !== 'dark-blue') {
      document.body.className = `theme-${settings.activeTheme}`;
    }

    // Actualizar selects en settings con valores guardados
    const urlInput = document.getElementById('lm-url-input') as HTMLInputElement | null;
    if (urlInput) urlInput.value = settings.llmRuntimeUrl;

    const whisperModel = document.getElementById('whisper-model-select') as HTMLSelectElement | null;
    if (whisperModel) whisperModel.value = settings.whisperModel;

    const whisperLang = document.getElementById('whisper-lang-select') as HTMLSelectElement | null;
    if (whisperLang) whisperLang.value = settings.whisperLanguage;

    const pythonPathInput = document.getElementById('python-path-input') as HTMLInputElement | null;
    if (pythonPathInput) pythonPathInput.value = settings.pythonPath || 'python';

    const statusModelLabel = document.getElementById('status-model-label');
    if (statusModelLabel) {
      statusModelLabel.textContent = `Whisper: ${settings.whisperModel}`;
    }
  } catch (e) {
    console.warn('[Renderer] Error cargando settings:', e);
  }

  // Panel manager (gestiona abrir/cerrar paneles flotantes)
  const panelManager = new PanelManager();

  // Inicializar componentes
  initWindowControls();
  initWaveformVisualizer(state);
  initTranscriptDisplay(state);
  initRecordButton(state);
  initEditPanel(state);
  initResultPanel(state);
  initModelSwitcher(state, panelManager);
  initSaveLoadPanel(state, panelManager);
  initSettingsPanel(state, panelManager);
  initThemeSwitcher(state, panelManager);
  initToolbarStatus(state);
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(console.error);
});
