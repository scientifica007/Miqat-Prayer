"""Safe checks only: no installs, enablement, network, or global settings."""
from pathlib import Path
import os
import subprocess

ROOT = Path(__file__).resolve().parents[1]

def run(command, **options):
    print('+ ' + ' '.join(command), flush=True)
    subprocess.run(command, cwd=ROOT, check=True, **options)

run(['npm', 'test'])
run(['npm', 'run', 'check'])
run(['gjs', '-m', 'tests/gjs-time.js'])
# Shell typelibs are private and intentionally absent from standalone GJS's
# default path. Extend paths for this subprocess only; do not change system config.
environment = os.environ.copy()
paths = ['/usr/lib/gnome-shell']
paths.extend(str(p) for p in Path('/usr/lib').glob('*/mutter-14'))
for variable in ('GI_TYPELIB_PATH', 'LD_LIBRARY_PATH'):
    environment[variable] = ':'.join(paths + ([environment[variable]] if environment.get(variable) else []))
run(['gjs', '-m', 'tests/gjs-api.js'], env=environment)
run(['npm', 'run', 'build'])
run(['git', 'diff', '--check'])
