/**
 * src/main/transcription/WhisperService.ts
 * Wrapper para el servidor Python de faster-whisper.
 * SPEC: Sección 4 — ITranscriptionEngine, ADR-003
 *
 * Lanza scripts/whisper_server.py como child_process.
 * Comunica audio PCM via stdin y recibe JSON via stdout.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { EventEmitter } from 'events';
import { ITranscriptionEngine } from '../../shared/types';

export interface WhisperServiceOptions {
  pythonPath?: string;
  model?: string;
  language?: string;
  device?: 'auto' | 'cpu' | 'cuda';
  projectRoot: string;
}

export class WhisperService extends EventEmitter implements ITranscriptionEngine {
  private process: ChildProcess | null = null;
  private options: Required<WhisperServiceOptions>;
  private partialCallbacks: Array<(text: string) => void> = [];
  private finalCallbacks: Array<(text: string) => void> = [];
  private lineBuffer = '';

  constructor(options: WhisperServiceOptions) {
    super();
    this.options = {
      pythonPath: options.pythonPath ?? 'python',
      model: options.model ?? 'small',
      language: options.language ?? 'auto',
      device: options.device ?? 'auto',
      projectRoot: options.projectRoot,
    };
  }

  async start(): Promise<void> {
    if (this.process) {
      console.warn('[WhisperService] Ya hay un proceso activo');
      return;
    }

    const scriptPath = path.join(this.options.projectRoot, 'scripts', 'whisper_server.py');

    return new Promise((resolve, reject) => {
      let resolved = false;

      this.process = spawn(this.options.pythonPath, [
        scriptPath,
        '--model', this.options.model,
        '--language', this.options.language,
        '--device', this.options.device,
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        reject(new Error('Timeout esperando que Whisper esté listo'));
        this.stop().catch(console.error);
      }, 60000);

      if (!this.process.stdout) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error('No se pudo obtener stdout del proceso Whisper'));
        return;
      }

      this.process.stdout.on('data', (data: Buffer) => {
        this.lineBuffer += data.toString('utf-8');
        const lines = this.lineBuffer.split('\n');
        this.lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line) as { type: string; text?: string; message?: string; model?: string };
            this.handleMessage(msg, () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve();
              }
            });
          } catch (e) {
            console.warn('[WhisperService] Línea no JSON:', line);
          }
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        console.log('[Whisper Python]', data.toString());
      });

      this.process.on('error', (err) => {
        console.error('[WhisperService] Error de proceso:', err);
        this.emit('error', err);
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(err);
        }
      });

      this.process.on('close', (code) => {
        console.log(`[WhisperService] Proceso cerrado con código ${code}`);
        this.process = null;
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`El proceso de Whisper terminó inesperadamente con código ${code}`));
        }
      });
    });
  }

  private handleMessage(
    msg: { type: string; text?: string; message?: string; model?: string },
    onReady: () => void
  ): void {
    switch (msg.type) {
      case 'ready':
        console.log(`[WhisperService] Modelo '${msg.model}' listo`);
        onReady();
        break;

      case 'partial':
        if (msg.text) {
          this.partialCallbacks.forEach((cb) => cb(msg.text!));
          this.emit('partial', msg.text);
        }
        break;

      case 'final':
        if (msg.text) {
          this.finalCallbacks.forEach((cb) => cb(msg.text!));
          this.emit('final', msg.text);
        }
        break;

      case 'error':
        console.error('[WhisperService] Error Python:', msg.message);
        this.emit('error', new Error(msg.message ?? 'Error desconocido'));
        break;
    }
  }

  async stop(): Promise<void> {
    if (!this.process) return;

    // Enviar señal de fin (chunk de longitud 0)
    if (this.process.stdin && !this.process.stdin.destroyed) {
      const endSignal = Buffer.alloc(4);
      endSignal.writeUInt32LE(0, 0);
      this.process.stdin.write(endSignal);
      this.process.stdin.end();
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this.process?.kill('SIGTERM');
        resolve();
      }, 3000);

      this.process?.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.process = null;
  }

  /**
   * Envía un chunk de audio PCM al proceso Python.
   * Protocolo: [4 bytes uint32 LE = longitud] + [N bytes PCM data]
   */
  sendAudioChunk(chunk: Buffer): void {
    if (!this.process?.stdin || this.process.stdin.destroyed) return;

    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(chunk.length, 0);
    this.process.stdin.write(Buffer.concat([lengthBuffer, chunk]));
  }

  onPartialResult(cb: (text: string) => void): void {
    this.partialCallbacks.push(cb);
  }

  onFinalResult(cb: (text: string) => void): void {
    this.finalCallbacks.push(cb);
  }

  get isRunning(): boolean {
    return this.process !== null;
  }
}
