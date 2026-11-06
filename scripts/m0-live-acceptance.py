"""Targeted, fail-fast M0 session test. No installation or global settings changes."""
import datetime
import json
import os
from pathlib import Path
import re
import subprocess
import time
import tempfile

ROOT = Path(__file__).resolve().parents[1]
UUID = 'miqat-prayer@scientifica007.github.io'
# Session details stay outside the repository in a user-only temporary directory.
OUT = Path(tempfile.mkdtemp(prefix='miqat-m0-private-')) / 'result.json'

def run(*args):
    return subprocess.check_output(args, text=True, timeout=15).strip()

def enabled():
    return sorted(run('gnome-extensions', 'list', '--enabled').splitlines())

def info():
    return run('gnome-extensions', 'info', UUID)

def pid():
    return run('pgrep', '-x', '-u', str(os.getuid()), 'gnome-shell')

def sample():
    p = pid()
    status = Path(f'/proc/{p}/status').read_text()
    return {'pid': p, 'rss_kib': int(re.search(r'VmRSS:\s+(\d+)', status)[1]),
            'cpu_ticks': sum(map(int, Path(f'/proc/{p}/stat').read_text().split()[13:15])),
            'monotonic': time.monotonic()}

def journal(*extra):
    return run('journalctl', '--user', '-b', f'_PID={initial_pid}', '--no-pager', '-o', 'json', *extra)

def entries(raw):
    return [json.loads(line) for line in raw.splitlines() if line.startswith('{')]

def check_logs():
    global cursor
    rows = entries(journal(f'--after-cursor={cursor}'))
    if rows:
        cursor = rows[-1]['__CURSOR']
    messages = [r.get('MESSAGE', '') for r in rows]
    result['new_shell_messages'].extend(messages)
    bad = [r.get('MESSAGE', '') for r in rows if int(r.get('PRIORITY', 6)) <= 4 or
           re.search(r'error|exception|critical|already disposed|JSAPI|Miqat.*cleanup', r.get('MESSAGE', ''), re.I)]
    if bad:
        raise RuntimeError('New Shell warning/error: ' + '\n'.join(bad))

result = {'date': datetime.datetime.now().astimezone().isoformat(), 'uuid': UUID,
          'cycles': [], 'new_shell_messages': [], 'status': 'not-started'}
try:
    assert run('git', 'branch', '--show-current') == 'dev/m0'
    initial_pid = pid()
    assert initial_pid.isdigit()
    initial = enabled()
    assert UUID in initial and 'State: ACTIVE' in info()
    result['initial_enabled'] = initial
    result['initial_info'] = info()
    installed = Path.home() / '.local/share/gnome-shell/extensions' / UUID
    for relative in ['extension.js', 'stylesheet.css', 'metadata.json', 'lib/time.js',
                     'core/schedule.js', 'core/next-prayer.js', 'core/resources.js']:
        source = ROOT / ('core' if relative.startswith('core/') else 'extension') / (relative[5:] if relative.startswith('core/') else relative)
        assert source.read_bytes() == (installed / relative).read_bytes(), relative
    result['installed_matches_source'] = True
    before = entries(journal())
    assert before, 'Journal unavailable'
    cursor = before[-1]['__CURSOR']
    result['baseline_shell_entries'] = len(before)
    result['baseline_miqat_messages'] = [r.get('MESSAGE', '') for r in before if re.search('miqat', r.get('MESSAGE', ''), re.I)]
    result['baseline'] = sample()
    result['status'] = 'running'
    for cycle in range(1, 11):
        run('gnome-extensions', 'disable', UUID)
        time.sleep(2)
        assert pid() == initial_pid, 'Shell PID changed'
        assert enabled() == [x for x in initial if x != UUID], 'Other enabled extensions changed'
        disabled = info()
        assert 'Enabled: No' in disabled and 'State: INACTIVE' in disabled, disabled
        check_logs()
        run('gnome-extensions', 'enable', UUID)
        time.sleep(3)
        assert pid() == initial_pid, 'Shell PID changed'
        assert enabled() == initial, 'Enabled set changed'
        assert 'Enabled: Yes' in info() and 'State: ACTIVE' in info(), info()
        check_logs()
        result['cycles'].append({'cycle': cycle, 'disabled': True, 'active': True, **sample()})
        print(f'Cycle {cycle}/10 PASS', flush=True)
    result['final'] = sample()
    result['final_info'] = info()
    result['final_enabled'] = enabled()
    result['status'] = 'passed'
except Exception as error:
    result['status'] = 'stopped'
    result['error'] = str(error)
    print('STOP:', error, flush=True)
finally:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(str(OUT), result['status'], flush=True)
if result['status'] != 'passed':
    raise SystemExit(1)
