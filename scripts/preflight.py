"""Read-only pre-install checks; must never install or enable the extension."""
from pathlib import Path
import hashlib
import json
import os
import subprocess

ROOT = Path(__file__).resolve().parents[1]
uuid = json.loads((ROOT / 'extension/metadata.json').read_text())['uuid']
assert os.getuid() != 0 and os.geteuid() == os.getuid(), 'Run as the desktop user, never sudo'
home = Path.home().resolve()
data = Path(os.environ.get('XDG_DATA_HOME') or home / '.local/share')
assert data.is_absolute(), 'XDG_DATA_HOME must be absolute'
target = data / 'gnome-shell/extensions' / uuid
assert target.resolve().is_relative_to(home), 'User installation resolves outside home'
roots = [data]
roots.extend(Path(p) for p in os.environ.get('XDG_DATA_DIRS', '/usr/local/share:/usr/share').split(':') if p)
roots.extend([Path('/usr/local/share'), Path('/usr/share')])
for base in dict.fromkeys(roots):
    extensions = base / 'gnome-shell/extensions'
    direct = extensions / uuid
    assert not direct.exists() and not direct.is_symlink(), f'UUID path already exists: {direct}'
    if not extensions.is_dir():
        continue
    for directory in extensions.iterdir():
        metadata = directory / 'metadata.json'
        if metadata.is_file():
            # An unreadable/malformed installed extension needs review, not silence.
            found = json.loads(metadata.read_text())
            assert found.get('uuid') != uuid, f'UUID metadata conflict: {metadata}'
    print(f'Checked: {extensions}')
runtime = subprocess.run(['gnome-extensions', 'list'], check=True, capture_output=True, text=True, timeout=10)
assert uuid not in runtime.stdout.splitlines(), 'UUID already registered in Shell'
branch = subprocess.run(['git', 'branch', '--show-current'], cwd=ROOT,
                        check=True, capture_output=True, text=True).stdout.strip()
assert branch == 'dev/m0', f'Unexpected branch: {branch}'
digest, name = (ROOT / 'dist/SHA256SUMS').read_text().strip().split()
assert name == uuid + '.shell-extension.zip'
archive = ROOT / 'dist' / name
actual = hashlib.sha256(archive.read_bytes()).hexdigest()
assert actual == digest, 'Archive checksum mismatch'
print(f'UUID absent from filesystem and running Shell: {uuid}')
print(f'User-only target (not created): {target}')
print(f'UID {os.getuid()}; session {os.environ.get("XDG_SESSION_TYPE")}')
print(f'SHA256 verified: {actual}')
print('PASS: read-only preflight; nothing installed, enabled, or changed in GNOME.')
