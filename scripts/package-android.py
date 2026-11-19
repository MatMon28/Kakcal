"""Bundle the synced Android Studio project without signing keys or build caches."""
import hashlib
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/downloads/Kakcalculator-Android-Studio.zip'
PREFIX = 'Kakcalculator/'
entry = ROOT / 'android/app/src/main/assets/public/index.html'
if not entry.exists() or 'content="android-local-no-demo"' not in entry.read_text():
    raise SystemExit('First run: node scripts/prepare-android.mjs')

def include(file):
    parts = file.relative_to(ROOT).parts
    return (file.is_file() and not file.is_symlink()
            and not set(parts).intersection({'.git', '.gradle', '.idea', '.kotlin', 'build', 'dist', 'downloads', '__pycache__'})
            and file.name not in {'local.properties', '.DS_Store', 'google-services.json'}
            and not file.name.startswith('.env')
            and file.suffix not in {'.jks', '.keystore', '.apk', '.aab', '.log', '.iml'})

files = set()
for name in ['README.md', 'package.json', 'package-lock.json', 'capacitor.config.json',
             'index.html', 'vite.config.ts', 'tsconfig.json', '.gitignore',
             'src', 'public/data', 'public/licenses', 'public/offline-worker.js', 'scripts', 'android',
             'node_modules/@capacitor/android/capacitor', 'node_modules/@capacitor/app/android',
             'node_modules/@capacitor/local-notifications/android', 'node_modules/@capacitor/local-notifications/LICENSE',
             'node_modules/@capacitor/android/LICENSE', 'node_modules/@capacitor/app/LICENSE']:
    source = ROOT / name
    if not source.exists():
        raise SystemExit(f'Missing project input: {name}')
    files.update(f for f in (source.rglob('*') if source.is_dir() else [source]) if include(f))
OUT.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(OUT, 'w', ZIP_DEFLATED, compresslevel=9) as archive:
    for file in sorted(files):
        archive.write(file, PREFIX + file.relative_to(ROOT).as_posix())
    archive.writestr(PREFIX + 'START-HERE.txt',
        'Open the android folder in Android Studio, not the outer Kakcalculator folder.\n'
        'The web assets and native Gradle modules are already prepared.\n'
        'Use JDK 21 and Android SDK 36. See android/BUILD_APK.md for building and signing.\n'
        'For web changes: install Node 22+, run npm ci, then node scripts/prepare-android.mjs.\n')
with ZipFile(OUT) as archive:
    if archive.testzip() is not None:
        raise SystemExit('Archive integrity check failed')
print(f'{OUT.relative_to(ROOT)}: {len(files)} files, {OUT.stat().st_size:,} bytes')
print('SHA-256:', hashlib.sha256(OUT.read_bytes()).hexdigest())