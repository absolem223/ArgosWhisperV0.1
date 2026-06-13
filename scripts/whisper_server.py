"""
scripts/whisper_server.py
Servidor de transcripción con faster-whisper, comunicado via stdin/stdout.
SPEC: Sección 7 — ADR-003: Whisper via subprocess Python

Protocolo:
  - Recibe chunks de audio PCM 16-bit 16kHz mono por stdin en paquetes binarios
  - El formato de cada paquete: [4 bytes uint32 LE = longitud] + [N bytes PCM data]
  - Emite JSON por stdout, uno por línea:
    {"type": "partial", "text": "..."}   -> transcripción parcial
    {"type": "final",   "text": "..."}   -> segmento final confirmado
    {"type": "error",   "message": "..."} -> error

Prerequisitos:
  pip install faster-whisper

Uso:
  python scripts/whisper_server.py --model small --language auto
"""

import sys
import json
import struct
import argparse
import threading
import queue
import io
import numpy as np

def log_error(message: str):
    """Emite un error JSON por stdout."""
    print(json.dumps({"type": "error", "message": message}), flush=True)

def emit_partial(text: str):
    print(json.dumps({"type": "partial", "text": text}), flush=True)

def emit_final(text: str):
    print(json.dumps({"type": "final", "text": text.strip()}), flush=True)

def load_model(model_size: str, device: str = "auto"):
    try:
        from faster_whisper import WhisperModel
        compute_type = "int8" if device == "cpu" else "float16"
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print(json.dumps({"type": "ready", "model": model_size}), flush=True)
        return model
    except ImportError:
        log_error("faster-whisper no instalado. Ejecuta: pip install faster-whisper")
        sys.exit(1)
    except Exception as e:
        log_error(f"Error cargando modelo Whisper: {str(e)}")
        sys.exit(1)

def read_audio_chunks(audio_queue: queue.Queue):
    """Lee chunks de audio del stdin en el protocolo [4B length][data]."""
    try:
        while True:
            # Leer 4 bytes de longitud
            length_bytes = sys.stdin.buffer.read(4)
            if not length_bytes or len(length_bytes) < 4:
                break

            length = struct.unpack('<I', length_bytes)[0]
            if length == 0:
                # Señal de fin de grabación
                audio_queue.put(None)
                break

            chunk = sys.stdin.buffer.read(length)
            if len(chunk) < length:
                break

            audio_queue.put(chunk)
    except Exception as e:
        log_error(f"Error leyendo audio: {str(e)}")
        audio_queue.put(None)

def transcribe_loop(model, language: str, audio_queue: queue.Queue):
    """
    Acumula audio y transcribe en ventanas de ~5 segundos.
    Para v0: transcripción por segmentos acumulados.
    """
    SAMPLE_RATE = 16000
    WINDOW_SECONDS = 5
    WINDOW_SAMPLES = SAMPLE_RATE * WINDOW_SECONDS

    audio_buffer = bytearray()

    while True:
        try:
            chunk = audio_queue.get(timeout=1.0)
            if chunk is None:
                # Procesar lo que queda en el buffer
                if len(audio_buffer) > SAMPLE_RATE:  # Al menos 1 segundo
                    _transcribe_buffer(model, audio_buffer, language)
                break

            audio_buffer.extend(chunk)

            # Transcribir cuando tenemos suficiente audio
            if len(audio_buffer) >= WINDOW_SAMPLES * 2:  # *2 porque es int16
                _transcribe_buffer(model, audio_buffer, language)
                audio_buffer = bytearray()

        except queue.Empty:
            # Timeout: si hay audio acumulado, transcribir
            if len(audio_buffer) > SAMPLE_RATE * 2:  # >1s de audio
                _transcribe_buffer(model, audio_buffer, language)
                audio_buffer = bytearray()

def _transcribe_buffer(model, audio_bytes: bytearray, language: str):
    """Convierte PCM int16 a float32 y transcribe."""
    try:
        # Convertir PCM int16 LE a numpy float32
        audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0

        lang = None if language == "auto" else language

        segments, info = model.transcribe(
            audio_np,
            language=lang,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=300),
        )

        for segment in segments:
            emit_partial(segment.text)

        # Emitir resultado final consolidado
        full_text = " ".join(seg.text for seg in model.transcribe(
            audio_np, language=lang, beam_size=5
        )[0])
        if full_text.strip():
            emit_final(full_text)

    except Exception as e:
        log_error(f"Error en transcripción: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description="Argos Whisper — Servidor de transcripción")
    parser.add_argument("--model", default="small",
                        choices=["tiny", "base", "small", "medium", "large-v3"],
                        help="Tamaño del modelo Whisper")
    parser.add_argument("--language", default="auto",
                        help="Idioma ('auto' para detección automática, 'es', 'en', etc.)")
    parser.add_argument("--device", default="auto",
                        choices=["auto", "cpu", "cuda"],
                        help="Dispositivo de cómputo")
    args = parser.parse_args()

    model = load_model(args.model, args.device)

    audio_queue: queue.Queue = queue.Queue(maxsize=100)

    reader_thread = threading.Thread(
        target=read_audio_chunks,
        args=(audio_queue,),
        daemon=True
    )
    reader_thread.start()

    transcribe_loop(model, args.language, audio_queue)

if __name__ == "__main__":
    main()
