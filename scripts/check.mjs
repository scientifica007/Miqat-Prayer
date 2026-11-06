import {readdirSync, readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

function files(dir) {
    return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
        const path = `${dir}/${entry.name}`;
        return entry.isDirectory() ? files(path) : [path];
    });
}
for (const file of ['core', 'extension', 'scripts', 'tests'].flatMap(files)
    .filter(path => /\.(js|mjs)$/.test(path))) {
    const result = spawnSync(process.execPath, ['--check', file], {stdio: 'inherit'});
    assert.equal(result.status, 0, `Syntax: ${file}`);
}
const metadata = JSON.parse(readFileSync('extension/metadata.json', 'utf8'));
assert.deepEqual(metadata['shell-version'], ['46']);
assert.deepEqual(metadata['session-modes'], ['user']);
assert.match(metadata.uuid, /^[a-z0-9-]+@[a-z0-9.]+$/);
console.log('Syntax and metadata checks passed (no GNOME GUI exercised).');
