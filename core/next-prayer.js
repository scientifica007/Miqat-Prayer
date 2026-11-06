import {addCivilDay, dateKey, validateSampleDay} from './schedule.js';

// Absolute instants enter here. No dependency on GLib, the UI, timer cadence or IO.
export function nextPrayer(nowMs, today, tomorrow = null) {
    if (!Number.isFinite(nowMs) || !Number.isFinite(new Date(nowMs).getTime()) ||
        !validateSampleDay(today) || dateKey(nowMs, today.timeZone) !== today.date ||
        (tomorrow !== null && (!validateSampleDay(tomorrow) ||
            tomorrow.date !== addCivilDay(today.date))))
        return {status: 'invalid-data'};
    const candidates = [today, tomorrow].filter(Boolean).flatMap(day =>
        day.events.filter(e => e.id !== 'sunrise').map(e => ({...e, date: day.date})));
    const event = candidates.find(e => e.atMs > nowMs);
    return event
        ? {status: 'ready', event, remainingMs: event.atMs - nowMs}
        : {status: 'missing-data'};
}

export function formatCountdown(remainingMs) {
    if (!Number.isFinite(remainingMs) || remainingMs < 0)
        return '—';
    const seconds = Math.ceil(remainingMs / 1000);
    const pad = n => String(n).padStart(2, '0');
    return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
        .map(pad).join(':');
}
