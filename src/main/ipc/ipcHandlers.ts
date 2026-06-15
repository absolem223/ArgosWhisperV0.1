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
  get<T>(key: string, defaultValue?: T): T | undefined;
  set(key: string, value: unknown): void;
}

let whisper: WhisperService | null = null;
let audio: AudioCaptureService | null = null;

export async function cleanupIpcHandlers(): Promise<void> {
  if (audio) {
    try {
      audio.stop();
      audio.removeAllListeners();
    } catch (err) {
      console.error('[IPC] Error al limpiar audio:', err);
    }
  }
  if (whisper) {
    console.log('[IPC] Deteniendo WhisperService en cleanup...');
    try {
      await whisper.stop();
    } catch (err) {
      console.error('[IPC] Error al detener WhisperService:', err);
    }
    whisper = null;
  }
}

/** Emite whisper:ready al renderer esperando a que la ventana esté completamente lista */
function emitWhisperReady(mainWindow: BrowserWindow): void {
  const send = () => mainWindow.webContents.send('whisper:ready');
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', send);
  } else {
    send();
  }
}

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  projectRoot: string,
  dataRoot: string
): void {
  const store: ElectronStore = new Store({ name: 'argos-whisper-settings' });
  audio = new AudioCaptureService();
  const spellcheck = new SpellCheckService();
  const fewshot = new FewShotManager(dataRoot);

  // 1. Leer settings del store (electron-store)
  // 3. Si no hay settings guardados, usar DEFAULT_SETTINGS (que tiene whisperModel = 'small')
  let settings: AppSettings = store.get<AppSettings>('settings') || { ...DEFAULT_SETTINGS };

  let llm: LMStudioRuntime = new LMStudioRuntime(settings.llmRuntimeUrl);

  // Inicializar spellcheck en background
  spellcheck.initialize().catch(console.error);

  // ─── Pre-carga de Whisper al arrancar ──────────────────────────────────────
  // Lanzamos el proceso Python inmediatamente para que la loading screen
  // se oculte en cuanto el modelo esté listo (sin necesidad de presionar REC).
  {
    console.log('[IPC] Pre-cargando WhisperService al inicio de la app...');
    // 2. Usar settings.whisperModel para inicializar WhisperService
    const modelToLoad = settings.whisperModel || DEFAULT_SETTINGS.whisperModel || 'small';
    whisper = new WhisperService({
      projectRoot,
      pythonPath: settings.pythonPath,
      model: modelToLoad,
      language: settings.whisperLanguage,
    });

    whisper.on('error', (err: Error) => {
      console.error('[IPC] ✘ ERROR en pre-carga de WhisperService:', err.message);
    });

    whisper.start()
      .then(() => {
        console.log('[IPC] ✔ WhisperService pre-cargado y listo → emitiendo whisper:ready');
        emitWhisperReady(mainWindow);
      })
      .catch((err: Error) => {
        console.error('[IPC] ✘ Falló la pre-carga de Whisper:', err.message);
        // Si falla (e.g. Python no instalado o modelo no disponible),
        // ocultamos la loading screen de todas formas para no bloquear la app.
        console.warn('[IPC] Ocultando loading screen a pesar del fallo...');
        setTimeout(() => emitWhisperReady(mainWindow), 500);
        whisper = null;
      });
  }

  // ─── Transcripción ──────────────────────────────────────────────────────────

  ipcMain.handle(IPC.TRANSCRIPTION_START, async (_event, args: { language?: string }) => {
    try {
      // Si no hay instancia (falló la pre-carga o fue destruida por cambio de settings),
      // crear una nueva en el momento de grabar.
      if (!whisper) {
        console.log('[IPC] ── TRANSCRIPTION_START (sin pre-carga) ───────────');
        console.log('[IPC] settings.pythonPath:', settings.pythonPath);
        console.log('[IPC] settings.whisperModel:', settings.whisperModel);
        console.log('[IPC] language (args):', args?.language, '| settings.whisperLanguage:', settings.whisperLanguage);
        console.log('[IPC] projectRoot:', projectRoot);

        whisper = new WhisperService({
          projectRoot,
          pythonPath: settings.pythonPath,
          model: settings.whisperModel,
          language: args?.language ?? settings.whisperLanguage,
        });

        console.log('[IPC] Iniciando WhisperService.start()...');
        await whisper.start();
        console.log('[IPC] WhisperService listo y esperando audio.');
      } else {
        console.log('[IPC] WhisperService ya pre-cargado, reutilizando.');
      }

      // Limpiar callbacks previos y registrar de nuevo (evita duplicados al re-usar instancia)
      whisper.clearCallbacks();
      whisper.onPartialResult((text) => {
        console.log('[IPC] ✔ PARTIAL result recibido → enviando al renderer:', text);
        mainWindow.webContents.send(IPC.TRANSCRIPTION_PARTIAL, { text });
      });

      whisper.onFinalResult((text) => {
        console.log('[IPC] ✔✔ FINAL result recibido → enviando al renderer:', text);
        mainWindow.webContents.send(IPC.TRANSCRIPTION_FINAL, { text });
      });

      whisper.on('error', (err: Error) => {
        console.error('[IPC] ✘ ERROR de WhisperService:', err.message);
        mainWindow.webContents.send(IPC.TRANSCRIPTION_ERROR, { message: err.message });
      });

      // Iniciar captura de audio
      audio!.removeAllListeners();
      let audioChunkCount = 0;

      audio!.on('data', (chunk: Buffer) => {
        audioChunkCount++;
        if (audioChunkCount % 20 === 1) {
          console.log(`[IPC] Audio chunk #${audioChunkCount} de SoX → ${chunk.length} bytes → enviando a WhisperService`);
        }
        whisper?.sendAudioChunk(chunk);
      });

      audio!.on('waveform', (amplitudes: number[]) => {
        mainWindow.webContents.send(IPC.AUDIO_WAVEFORM, amplitudes);
      });

      audio!.on('error', (err: Error) => {
        console.error('[IPC] ✘ ERROR de AudioCaptureService:', err.message);
        mainWindow.webContents.send(IPC.TRANSCRIPTION_ERROR, { message: err.message });
      });

      console.log('[IPC] Iniciando AudioCaptureService...');
      audio!.start();
      console.log('[IPC] AudioCaptureService iniciado. Pipeline activo.');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[IPC] ✘ Error en TRANSCRIPTION_START:', message);
      return { success: false, error: message };
    }
  });

  ipcMain.handle(IPC.TRANSCRIPTION_STOP, async () => {
    audio!.stop();
    audio!.removeAllListeners();
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

  ipcMain.handle(IPC.SETTINGS_SET, async (_event, partial: Partial<AppSettings>) => {
    const whisperSettingsChanged =
      (partial.whisperModel && partial.whisperModel !== settings.whisperModel) ||
      (partial.whisperLanguage && partial.whisperLanguage !== settings.whisperLanguage) ||
      (partial.pythonPath && partial.pythonPath !== settings.pythonPath);

    settings = { ...settings, ...partial };
    store.set('settings', settings);

    // Si cambió la URL del runtime, recrear el cliente LLM
    if (partial.llmRuntimeUrl) {
      llm = new LMStudioRuntime(partial.llmRuntimeUrl);
    }

    if (whisperSettingsChanged && whisper) {
      console.log('[IPC] Configuración de Whisper cambiada, recreando WhisperService...');
      try {
        await whisper.stop();
      } catch (err) {
        console.error('[IPC] Error al detener WhisperService:', err);
      }
      whisper = null;
    }

    return { success: true };
  });
}
