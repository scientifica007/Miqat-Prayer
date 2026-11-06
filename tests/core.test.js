import test from 'node:test';
import assert from 'node:assert/strict';
import {createSampleDay, dateKey, addCivilDay, validateSampleDay} from '../core/schedule.js';
import {nextPrayer, formatCountdown} from '../core/next-prayer.js';
import {Resources} from '../core/resources.js';

// Test-only converter for Algiers on these specific 2026 fixture dates. Production
// uses GLib/IANA; GJS adapter coverage is in gjs-time.js, including DST.
const at = (date, time) => Date.parse(`${date}T${time}:00+01:00`);
const today = createSampleDay('2026-11-06', at);
const tomorrow = createSampleDay('2026-11-07', at);
const next = time => nextPrayer(at(today.date, time), today, tomorrow);

test('before fajr, subsecond countdown rounds up without early zero', () => {
    const r = nextPrayer(at(today.date, '05:30') - 1, today, tomorrow);
    assert.equal(r.event.id, 'fajr');
    assert.equal(formatCountdown(r.remainingMs), '00:00:01');
});
test('all prayer boundaries advance at equality, sunrise never selected', () => {
    for (const [time, id] of [['05:29', 'fajr'], ['05:30', 'dhuhr'],
        ['06:59', 'dhuhr'], ['07:00', 'dhuhr'], ['12:30', 'asr'],
        ['15:30', 'maghrib'], ['18:00', 'isha'], ['19:30', 'fajr']])
        assert.equal(next(time).event.id, id, time);
});
test('isha to tomorrow fajr uses tomorrow date and instant', () => {
    const r = next('23:59');
    assert.equal(r.event.date, tomorrow.date);
    assert.equal(r.remainingMs, 5 * 3600000 + 31 * 60000);
});
test('civil day rollover, month/year rollover and leap day', () => {
    for (const [date, expected] of [['2026-12-31', '2027-01-01'],
        ['2028-02-28', '2028-02-29'], ['2028-02-29', '2028-03-01']])
        assert.equal(addCivilDay(date), expected);
    assert.equal(dateKey(Date.parse('2026-11-06T23:00:00Z'), 'Africa/Algiers'), tomorrow.date);
    assert.equal(nextPrayer(at(tomorrow.date, '00:00'), tomorrow,
        createSampleDay('2026-11-08', at)).event.id, 'fajr');
});
test('missing tomorrow never invents times', () => {
    assert.equal(nextPrayer(at(today.date, '19:30'), today).status, 'missing-data');
    assert.equal(nextPrayer(at(today.date, '12:00'), today).status, 'ready');
});
test('clock jumps forward and backward recompute from current wall time', () => {
    assert.equal(next('12:00').event.id, 'dhuhr');
    assert.equal(next('20:00').event.id, 'fajr');
    assert.equal(next('05:00').event.id, 'fajr');
    assert.equal(next('12:00').remainingMs, 30 * 60000);
    assert.equal(next('12:29').remainingMs, 60000);
});
test('stale dates and non-adjacent tomorrow are rejected', () => {
    assert.equal(nextPrayer(at(tomorrow.date, '00:00'), today, tomorrow).status, 'invalid-data');
    assert.equal(nextPrayer(at(today.date, '12:00'), today,
        createSampleDay('2026-11-08', at)).status, 'invalid-data');
});
test('source validation blocks official claims and malformed data', () => {
    assert.ok(validateSampleDay(today));
    for (const patch of [{sample: false}, {sourceType: 'official-timetable'},
        {sourceType: 'authority-method'}, {sourceType: 'international-calculation'},
        {verification: 'verified'}, {sourceId: 'ministry'}, {timeZone: 'UTC'},
        {date: '2026-02-30'}, {events: []}, {events: [null, ...today.events.slice(1)]}])
        assert.equal(validateSampleDay({...today, ...patch}), false);
    const wrong = structuredClone(today);
    wrong.events[0].atMs += 60000;
    assert.equal(validateSampleDay(wrong), false);
    wrong.events[0].atMs = 1e30;
    assert.equal(validateSampleDay(wrong), false);
});
test('mutable inputs are revalidated and fixtures cannot be altered', () => {
    assert.ok(Object.isFrozen(today.events[0]));
    const day = structuredClone(today);
    assert.ok(validateSampleDay(day));
    day.events[1].atMs = day.events[0].atMs;
    assert.equal(validateSampleDay(day), false);
});
test('invalid clocks and invalid countdown inputs are handled', () => {
    for (const value of [NaN, Infinity, 1e30])
        assert.equal(nextPrayer(value, today).status, 'invalid-data');
    for (const value of [-1, NaN, Infinity])
        assert.equal(formatCountdown(value), '—');
    assert.equal(formatCountdown(0), '00:00:00');
});
test('resource ownership drains signals and timers through 10 simulated cycles', () => {
    let live = 0;
    const object = {connect() { live++; return 7; }, disconnect(id) {
        assert.equal(id, 7); live--;
    }};
    for (let i = 0; i < 10; i++) {
        const resources = new Resources();
        resources.connect(object, 'changed', () => {});
        live++;
        resources.own(() => live--);
        resources.clear();
        resources.clear();
        assert.equal(live, 0);
    }
});
test('cleanup continues on failure, including partial initialization', () => {
    const order = [], errors = [];
    const resources = new Resources(e => errors.push(e));
    resources.own(() => order.push('actor'));
    resources.own(() => { throw new Error('disconnect failed'); });
    resources.own(() => order.push('timer'));
    resources.clear();
    assert.deepEqual(order, ['timer', 'actor']);
    assert.equal(errors.length, 1);
});
