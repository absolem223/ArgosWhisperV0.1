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
      device: options.device ?? 'cpu',
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

      const spawnArgs = [
        scriptPath,
        '--model', this.options.model,
        '--language', this.options.language,
        '--device', this.options.device,
      ];
      console.log('[WhisperService] ── LANZANDO SUBPROCESS ──────────────────────');
      console.log('[WhisperService] Ejecutable:', this.options.pythonPath);
      console.log('[WhisperService] Argumentos:', spawnArgs.join(' '));
      console.log('[WhisperService] Script path existe?', require('fs').existsSync(scriptPath));

      this.process = spawn(this.options.pythonPath, spawnArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      console.log('[WhisperService] PID del proceso Python:', this.process.pid);

      this.process.stdin?.on('error', (err) => {
        console.error('[WhisperService] Error en process.stdin:', err);
      });
      this.process.stdout?.on('error', (err) => {
        console.error('[WhisperService] Error en process.stdout:', err);
      });
      this.process.stderr?.on('error', (err) => {
        console.error('[WhisperService] Error en process.stderr:', err);
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
          console.log('[WhisperService] stdout RAW:', line);
          try {
            const msg = JSON.parse(line) as { type: string; text?: string; message?: string; model?: string };
            console.log('[WhisperService] stdout JSON parseado → type:', msg.type, msg.text ? '| text:' + msg.text : '');
            this.handleMessage(msg, () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve();
              }
            });
          } catch (e) {
            console.warn('[WhisperService] Línea no JSON (ignorada):', line);
          }
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          console.log('[WhisperService] stderr:', line);
        }
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

      this.process.on('close', (code, signal) => {
        console.log(`[WhisperService] ── PROCESO CERRADO ─ código: ${code} | señal: ${signal}`);
        this.process = null;
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`El proceso de Whisper terminó inesperadamente con código ${code} (señal: ${signal})`));
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
  private _chunkCount = 0;
  private _totalBytes = 0;

  sendAudioChunk(chunk: Buffer): void {
    if (!this.process?.stdin || this.process.stdin.destroyed) return;

    this._chunkCount++;
    this._totalBytes += chunk.length;

    // Log cada 20 chunks (~1 segundo de audio) para no saturar la terminal
    if (this._chunkCount % 20 === 1) {
      console.log(
        `[WhisperService] Enviando chunk #${this._chunkCount} al Python` +
        ` | tamaño: ${chunk.length} bytes | total acumulado: ${this._totalBytes} bytes`
      );
    }

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

  /** Limpia todos los callbacks acumulados (para evitar duplicados al re-usar la instancia) */
  clearCallbacks(): void {
    this.partialCallbacks = [];
    this.finalCallbacks = [];
    this.removeAllListeners('error');
  }

  get isRunning(): boolean {
    return this.process !== null;
  }
}
