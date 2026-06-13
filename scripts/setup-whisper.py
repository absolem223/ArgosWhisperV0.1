"""
scripts/setup-whisper.py
Helper de configuración del entorno Whisper.
Verifica requisitos, instala faster-whisper y descarga el modelo seleccionado.

Uso: python scripts/setup-whisper.py --model small
"""

import subprocess
import sys
import argparse
import os

MODELS = ["tiny", "base", "small", "medium", "large-v3"]

def run(cmd: list[str]) -> int:
    print(f"  → {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=False)
    return result.returncode

def check_python():
    version = sys.version_info
    print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        print("✗ Se requiere Python 3.10+")
        sys.exit(1)

def check_pip():
    try:
        import pip
        print(f"✓ pip disponible")
    except ImportError:
        print("✗ pip no disponible")
        sys.exit(1)

def install_faster_whisper():
    try:
        import faster_whisper
        print(f"✓ faster-whisper ya instalado")
    except ImportError:
        print("→ Instalando faster-whisper...")
        code = run([sys.executable, "-m", "pip", "install", "faster-whisper"])
        if code != 0:
            print("✗ Error instalando faster-whisper")
            sys.exit(1)
        print("✓ faster-whisper instalado")

def install_numpy():
    try:
        import numpy
        print(f"✓ numpy disponible ({numpy.__version__})")
    except ImportError:
        print("→ Instalando numpy...")
        run([sys.executable, "-m", "pip", "install", "numpy"])

def download_model(model_size: str, models_dir: str):
    print(f"\n→ Descargando modelo Whisper '{model_size}'...")
    print("  (Puede tardar varios minutos dependiendo de tu conexión)")
    try:
        from faster_whisper import WhisperModel
        # El modelo se descarga automáticamente al instanciar
        m = WhisperModel(model_size, device="cpu", compute_type="int8",
                        download_root=models_dir)
        print(f"✓ Modelo '{model_size}' listo en {models_dir}")
        del m
    except Exception as e:
        print(f"✗ Error descargando modelo: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Setup de Argos Whisper")
    parser.add_argument("--model", default="small", choices=MODELS,
                        help="Modelo Whisper a descargar")
    parser.add_argument("--models-dir", default=None,
                        help="Directorio donde guardar los modelos (default: ./models)")
    args = parser.parse_args()

    # Directorio de modelos relativo al proyecto
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    models_dir = args.models_dir or os.path.join(project_root, "models")
    os.makedirs(models_dir, exist_ok=True)

    print("=" * 50)
    print("  Argos Whisper — Setup de entorno")
    print("=" * 50)
    print()
    print("Verificando requisitos...")
    check_python()
    check_pip()
    install_numpy()
    install_faster_whisper()
    download_model(args.model, models_dir)

    print()
    print("=" * 50)
    print("✓ Setup completado exitosamente")
    print(f"  Modelo: {args.model}")
    print(f"  Directorio: {models_dir}")
    print()
    print("Próximos pasos:")
    print("  1. Instalar SoX: choco install sox -y")
    print("     (o descargar desde http://sox.sourceforge.net/)")
    print("  2. Instalar LM Studio: https://lmstudio.ai/")
    print("  3. En LM Studio: habilitar el servidor local (puerto 1234)")
    print("  4. Cargar un modelo en LM Studio (ej. Gemma 3, Qwen3)")
    print("  5. npm install && npm start")
    print("=" * 50)

if __name__ == "__main__":
    main()
