/**
 * src/main/audio/AudioCaptureService.ts
 * Captura de audio del micrófono y generación de datos de waveform.
 * SPEC: Sección 6 — Stack, ADR-001 (node-record-lpcm16)
 *
 * Prerequisito: SoX instalado en el sistema y disponible en PATH.
 * Instalación: choco install sox -y  (o manual desde sox.sourceforge.net)
 *
 * Emite:
 * - 'waveform': number[] (amplitudes 0-1, 64 buckets) cada ~50ms
 * - 'data': Buffer (PCM 16kHz mono) para WhisperService
 * - 'error': Error
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';

/**
 * Resolve la ruta al ejecutable sox.exe.
 * Electron no hereda el PATH del shell del usuario, así que buscamos
 * en las rutas de instalación típicas de Windows antes de recurrir
 * al nombre desnudo (que funciona si está en PATH del sistema).
 */
function resolveSoxPath(): string {
  const candidates = [
    'C:\\Program Files (x86)\\sox-14-4-2\\sox.exe',
    'C:\\Program Files\\sox-14-4-2\\sox.exe',
    'C:\\Program Files (x86)\\SoX\\sox.exe',
    'C:\\Program Files\\SoX\\sox.exe',
    'C:\\tools\\sox\\sox.exe',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log('[AudioCaptureService] SoX encontrado en:', candidate);
      return candidate;
    }
  }
  console.log('[AudioCaptureService] SoX no encontrado en rutas conocidas, usando \'sox\' del PATH');
  return 'sox';
}

const SAMPLE_RATE = 16000;
const WAVEFORM_BUCKETS = 64;
const WAVEFORM_INTERVAL_MS = 50;

export class AudioCaptureService extends EventEmitter {
  private soxProcess: ChildProcess | null = null;
  private isRecording = false;
  private waveformBuffer: number[] = [];
  private waveformTimer: NodeJS.Timeout | null = null;

  start(): void {
    if (this.isRecording) return;

    this.isRecording = true;
    this.waveformBuffer = [];

    try {
      // Spawn SoX directly with the Windows waveaudio driver.
      // node-record-lpcm16 always passes --default-device which fails on Windows;
      // using -t waveaudio default works correctly.
      const soxBin = resolveSoxPath();
      this.soxProcess = spawn(soxBin, [
        '-t', 'waveaudio', 'default',
        '--no-show-progress',
        '--rate', String(SAMPLE_RATE),
        '--channels', '1',
        '--encoding', 'signed-integer',
        '--bits', '16',
        '--type', 'raw',
        '-',
      ]);

      const stream = this.soxProcess.stdout!;

      stream.on('data', (chunk: Buffer) => {
        this.emit('data', chunk);
        this.processChunkForWaveform(chunk);
      });

      stream.on('error', (err) => {
        console.error('[AudioCaptureService] Error en soxProcess.stdout:', err);
      });

      this.soxProcess.stdin?.on('error', (err) => {
        console.error('[AudioCaptureService] Error en soxProcess.stdin:', err);
      });

      this.soxProcess.stderr?.on('error', (err) => {
        console.error('[AudioCaptureService] Error en soxProcess.stderr:', err);
      });

      this.soxProcess.stderr?.on('data', (data: Buffer) => {
        // SoX imprime progreso en stderr — no es necesariamente un error
        const msg = data.toString().trim();
        if (msg) console.log('[AudioCaptureService] SoX stderr:', msg);
      });

      this.soxProcess.on('error', (err: Error) => {
        console.error('[AudioCaptureService] Error de proceso SoX:', err);
        this.emit('error', err);
        this.stop();
      });

      this.soxProcess.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
        if (!this.isRecording) {
          // Cierre esperado: stop() ya puso isRecording=false antes de llamar kill()
          return;
        }
        if (code === null) {
          // Terminado por señal (ej: SIGTERM desde kill()) — no es un error
          console.log('[AudioCaptureService] SoX terminado por señal:', signal);
          return;
        }
        if (code !== 0) {
          // Salida inesperada con error real
          const err = new Error(`sox ha salido inesperadamente con código ${code}`);
          console.error('[AudioCaptureService]', err.message);
          this.emit('error', err);
          this.stop();
        }
      });

      // Emitir waveform a intervalos regulares
      this.waveformTimer = setInterval(() => {
        if (this.waveformBuffer.length > 0) {
          const buckets = this.computeWaveformBuckets(this.waveformBuffer);
          this.emit('waveform', buckets);
          this.waveformBuffer = [];
        } else {
          // Emitir silencio si no hay datos
          this.emit('waveform', new Array(WAVEFORM_BUCKETS).fill(0));
        }
      }, WAVEFORM_INTERVAL_MS);

      console.log('[AudioCaptureService] Grabación iniciada');
    } catch (error) {
      console.error('[AudioCaptureService] Error al iniciar grabación:', error);
      this.isRecording = false;
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  stop(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (this.waveformTimer) {
      clearInterval(this.waveformTimer);
      this.waveformTimer = null;
    }

    if (this.soxProcess) {
      this.soxProcess.kill();
      this.soxProcess = null;
    }

    console.log('[AudioCaptureService] Grabación detenida');
  }

  get active(): boolean {
    return this.isRecording;
  }

  private processChunkForWaveform(chunk: Buffer): void {
    // PCM 16-bit signed LE — cada muestra es 2 bytes
    for (let i = 0; i < chunk.length - 1; i += 2) {
      const sample = chunk.readInt16LE(i);
      // Normalizar a 0-1 (Int16 rango: -32768 a 32767)
      const normalized = Math.abs(sample) / 32768;
      this.waveformBuffer.push(normalized);
    }
  }

  private computeWaveformBuckets(samples: number[]): number[] {
    const bucketSize = Math.ceil(samples.length / WAVEFORM_BUCKETS);
    const buckets: number[] = [];

    for (let i = 0; i < WAVEFORM_BUCKETS; i++) {
      const start = i * bucketSize;
      const end = Math.min(start + bucketSize, samples.length);
      const slice = samples.slice(start, end);

      if (slice.length === 0) {
        buckets.push(0);
      } else {
        const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length;
        // Aplicar escala logarítmica para mejor visualización
        buckets.push(Math.min(1, avg * 3));
      }
    }

    return buckets;
  }
}
