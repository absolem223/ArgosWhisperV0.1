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
import * as recorder from 'node-record-lpcm16';

const SAMPLE_RATE = 16000;
const WAVEFORM_BUCKETS = 64;
const WAVEFORM_INTERVAL_MS = 50;

export class AudioCaptureService extends EventEmitter {
  private recording: ReturnType<typeof recorder.record> | null = null;
  private isRecording = false;
  private waveformBuffer: number[] = [];
  private waveformTimer: NodeJS.Timeout | null = null;

  start(): void {
    if (this.isRecording) return;

    this.isRecording = true;
    this.waveformBuffer = [];

    try {
      this.recording = recorder.record({
        sampleRate: SAMPLE_RATE,
        channels: 1,
        audioType: 'raw',
        recorder: 'sox',
        silence: '0',
      });

      const stream = this.recording.stream();

      stream.on('data', (chunk: Buffer) => {
        this.emit('data', chunk);
        this.processChunkForWaveform(chunk);
      });

      stream.on('error', (err: Error) => {
        console.error('[AudioCaptureService] Error de stream:', err);
        this.emit('error', err);
        this.stop();
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

    if (this.recording) {
      this.recording.stop();
      this.recording = null;
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
