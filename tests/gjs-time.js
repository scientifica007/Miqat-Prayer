// Run with gjs -m tests/gjs-time.js; imports no Shell UI and opens no window.
import GLib from 'gi://GLib';
import {toEpoch} from '../extension/lib/time.js';
import {createSampleDay, addCivilDay} from '../core/schedule.js';
import {nextPrayer} from '../core/next-prayer.js';

let checks = 0;
function equal(actual, expected) {
    if (actual !== expected)
        throw new Error(`${actual} != ${expected}`);
    checks++;
}
const date = '2026-11-06';
const today = createSampleDay(date, toEpoch);
const tomorrow = createSampleDay(addCivilDay(date), toEpoch);
equal(toEpoch(date, '05:30', 'Africa/Algiers'), Date.parse('2026-11-06T04:30:00Z'));
equal(nextPrayer(toEpoch(date, '19:30', 'Africa/Algiers'), today, tomorrow).event.date,
    '2026-11-07');
// Real IANA rules, not a hardcoded offset. DST day lengths in Europe/Paris.
for (const [start, end, hours] of [['2026-03-29', '2026-03-30', 23],
    ['2026-10-25', '2026-10-26', 25]])
    equal((toEpoch(end, '00:00', 'Europe/Paris') -
        toEpoch(start, '00:00', 'Europe/Paris')) / 3600000, hours);
let rejected = false;
try { toEpoch('2026-03-29', '02:30', 'Europe/Paris'); } catch { rejected = true; }
equal(rejected, true);
equal(GLib.TimeZone.new_identifier('Definitely/Invalid'), null);
print(`${checks} GJS/API/time checks passed; no Shell actors instantiated.`);
