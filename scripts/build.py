"""Build locally with GNOME's pack tool; never install or enable the result."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
metadata = json.loads((ROOT / 'extension/metadata.json').read_text())
destination = ROOT / 'dist'
destination.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='miqat-m0-') as temporary:
    stage = Path(temporary) / metadata['uuid']
    shutil.copytree(ROOT / 'extension', stage)
    shutil.copytree(ROOT / 'core', stage / 'core')
    subprocess.run([
        'gnome-extensions', 'pack', str(stage), '--force',
        '--out-dir', str(destination), '--extra-source', 'core', '--extra-source', 'lib',
    ], check=True)

archive = destination / (metadata['uuid'] + '.shell-extension.zip')
expected = {'metadata.json', 'extension.js', 'stylesheet.css'}
expected.update('core/' + p.name for p in (ROOT / 'core').glob('*.js'))
expected.update('lib/' + p.name for p in (ROOT / 'extension/lib').glob('*.js'))
with zipfile.ZipFile(archive) as packed:
    actual = {item.filename for item in packed.infolist() if not item.is_dir()}
    assert actual == expected, (actual, expected)
    assert packed.testzip() is None
    for name in actual:
        source = ROOT / name if name.startswith('core/') else ROOT / 'extension' / name
        assert packed.read(name) == source.read_bytes(), name
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(destination / 'SHA256SUMS').write_text(f'{digest}  {archive.name}\n')
print(f'Package verified: {archive}\n{archive.stat().st_size} bytes\nSHA256 {digest}')
