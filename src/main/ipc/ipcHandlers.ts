/**
 * src/main/ipc/ipcHandlers.ts
 * Registro central de todos los handlers IPC del proceso main.
 * SPEC: Sección 5 — IPC Channels Tipados
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc';
import { AudioCaptureService } from '../audio/AudioCaptureService';
import { WhisperService } from '../transcription/WhisperService';
import { LMStudioRuntime } from '../llm/runtime/LMStudioRuntime';
import { FewShotManager } from '../llm/fewshot/FewShotManager';
import { SpellCheckService } from '../spellcheck/SpellCheckService';
import { TRANSFORM_PRESETS } from '../llm/presets/presets';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  TransformRequest,
  IFewShotExample,
  ChatMessage,
} from '../../shared/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Store = require('electron-store');

interface ElectronStore {
  get<T>(key: string, defaultValue: T): T;
  set(key: string, value: unknown): void;
}

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  projectRoot: string,
  dataRoot: string
): void {
  const store: ElectronStore = new Store({ name: 'argos-whisper-settings' });
  const audio = new AudioCaptureService();
  const spellcheck = new SpellCheckService();
  const fewshot = new FewShotManager(dataRoot);
  let settings: AppSettings = store.get('settings', DEFAULT_SETTINGS);
  let whisper: WhisperService | null = null;
  let llm: LMStudioRuntime = new LMStudioRuntime(settings.llmRuntimeUrl);

  // Inicializar spellcheck en background
  spellcheck.initialize().catch(console.error);

  // ─── Transcripción ──────────────────────────────────────────────────────────

  ipcMain.handle(IPC.TRANSCRIPTION_START, async (_event, args: { language?: string }) => {
    try {
      // Crear WhisperService si no existe
      if (!whisper) {
        whisper = new WhisperService({
          projectRoot,
          pythonPath: settings.pythonPath,
          model: settings.whisperModel,
          language: args?.language ?? settings.whisperLanguage,
        });

        whisper.onPartialResult((text) => {
          mainWindow.webContents.send(IPC.TRANSCRIPTION_PARTIAL, { text });
        });

        whisper.onFinalResult((text) => {
          mainWindow.webContents.send(IPC.TRANSCRIPTION_FINAL, { text });
        });

        whisper.on('error', (err: Error) => {
          mainWindow.webContents.send(IPC.TRANSCRIPTION_ERROR, { message: err.message });
        });

        await whisper.start();
      }

      // Iniciar captura de audio
      audio.on('data', (chunk: Buffer) => {
        whisper?.sendAudioChunk(chunk);
      });

      audio.on('waveform', (amplitudes: number[]) => {
        mainWindow.webContents.send(IPC.AUDIO_WAVEFORM, amplitudes);
      });

      audio.on('error', (err: Error) => {
        mainWindow.webContents.send(IPC.TRANSCRIPTION_ERROR, { message: err.message });
      });

      audio.start();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  });

  ipcMain.handle(IPC.TRANSCRIPTION_STOP, async () => {
    audio.stop();
    audio.removeAllListeners();
    return { success: true };
  });

  // ─── LLM ────────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.LLM_IS_READY, async () => {
    const ready = await llm.isReady();
    return { ready };
  });

  ipcMain.handle(IPC.LLM_LIST_MODELS, async () => {
    try {
      const models = await llm.listModels();
      return { models };
    } catch (error) {
      return { models: [], error: String(error) };
    }
  });

  ipcMain.handle(IPC.LLM_TRANSFORM, async (_event, request: TransformRequest) => {
    try {
      const preset = TRANSFORM_PRESETS.find((p) => p.id === request.presetId);
      if (!preset) {
        return { error: `Preset '${request.presetId}' no encontrado` };
      }

      // Resolver modelo: usar el del request, o el asignado por preset, o el activo global
      const modelId =
        request.modelId ||
        settings.modelPerPreset[request.presetId] ||
        settings.activeModelId;

      if (!modelId) {
        return { error: 'No hay modelo activo seleccionado' };
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: preset.systemPrompt },
      ];

      // Agregar few-shot example si aplica
      if (preset.requiresFewShot && request.fewShotExampleId) {
        const example = await fewshot.loadExample(request.fewShotExampleId);
        if (example?.conversationSample) {
          try {
            const sample = JSON.parse(example.conversationSample) as ChatMessage[];
            messages.push(...sample);
          } catch {
            console.warn('[IPC] Error parseando few-shot sample');
          }
        }
      }

      messages.push({ role: 'user', content: request.text });

      const result = await llm.chatCompletion(messages, modelId);
      return { text: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: message };
    }
  });

  // ─── Few-Shot ────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.FEWSHOT_LOAD, async () => {
    const examples = await fewshot.listExamples();
    return { examples };
  });

  ipcMain.handle(IPC.FEWSHOT_SAVE, async (_event, example: IFewShotExample) => {
    await fewshot.saveExample(example);
    return { success: true };
  });

  ipcMain.handle(IPC.FEWSHOT_DELETE, async (_event, { id }: { id: string }) => {
    await fewshot.deleteExample(id);
    return { success: true };
  });

  // ─── Spellcheck ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.SPELLCHECK_CHECK, (_event, { text }: { text: string }) => {
    const result = spellcheck.check(text, settings.whisperLanguage as 'es' | 'en' | 'auto');
    return result;
  });

  // ─── Settings ────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return settings;
  });

  ipcMain.handle(IPC.SETTINGS_SET, (_event, partial: Partial<AppSettings>) => {
    settings = { ...settings, ...partial };
    store.set('settings', settings);

    // Si cambió la URL del runtime, recrear el cliente LLM
    if (partial.llmRuntimeUrl) {
      llm = new LMStudioRuntime(partial.llmRuntimeUrl);
    }

    return { success: true };
  });
}
