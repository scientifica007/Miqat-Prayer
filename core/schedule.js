export const EVENTS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const LABELS = Object.freeze({
    fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر',
    maghrib: 'المغرب', isha: 'العشاء',
});
export const SAMPLE_ZONE = 'Africa/Algiers';
export const SAMPLE_LOCATION = 'الجزائر — موقع تجريبي';
export const SAMPLE_NOTICE = 'أوقات تجريبية مصطنعة — لا تعتمد عليها للعبادة';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAMPLE_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: SAMPLE_ZONE, hour: '2-digit', minute: '2-digit',
    second: '2-digit', hourCycle: 'h23',
});
const validated = new WeakSet();

export function dateKey(nowMs, timeZone) {
    const formatter = timeZone === SAMPLE_ZONE ? dateFormatter : new Intl.DateTimeFormat('en-CA', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const parts = formatter.formatToParts(new Date(nowMs));
    const part = type => parts.find(p => p.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}

export function addCivilDay(date) {
    // Arithmetic on date labels only, never on a local midnight instant.
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + 1);
    return value.toISOString().slice(0, 10);
}

export function validDate(date) {
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        Number.isFinite(Date.parse(`${date}T12:00:00Z`)) &&
        new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}

// M0 deliberately accepts ONLY synthetic data. Production source types are reserved
// for a later, independently verified source engine, not inferred from a URL.
export function validateSampleDay(day) {
    if (day && validated.has(day))
        return true;
    if (!day || day.sample !== true || day.sourceType !== null ||
        day.sourceId !== 'miqat-m0-synthetic-v1' || day.verification !== 'unverified' ||
        day.timeZone !== SAMPLE_ZONE || !validDate(day.date) ||
        !Array.isArray(day.events) || day.events.length !== EVENTS.length)
        return false;
    let previous = -Infinity;
    const valid = day.events.every((event, i) => {
        if (!event || event.id !== EVENTS[i] || !Number.isFinite(event.atMs) ||
            !Number.isFinite(new Date(event.atMs).getTime()) ||
            event.atMs <= previous || !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.localTime))
            return false;
        previous = event.atMs;
        const parts = timeFormatter.formatToParts(new Date(event.atMs));
        const part = type => parts.find(p => p.type === type)?.value;
        return dateKey(event.atMs, day.timeZone) === day.date &&
            `${part('hour')}:${part('minute')}` === event.localTime && part('second') === '00';
    });
    // Cache only immutable, deeply frozen fixtures; mutable imports are rechecked.
    if (valid && Object.isFrozen(day) && Object.isFrozen(day.events) &&
        day.events.every(Object.isFrozen))
        validated.add(day);
    return valid;
}

export function createSampleDay(date, toEpoch) {
    const times = ['05:30', '07:00', '12:30', '15:30', '18:00', '19:30'];
    const day = {
        date, timeZone: SAMPLE_ZONE, sample: true, sourceType: null,
        sourceId: 'miqat-m0-synthetic-v1', verification: 'unverified',
        events: Object.freeze(EVENTS.map((id, i) => Object.freeze({
            id, localTime: times[i], atMs: toEpoch(date, times[i], SAMPLE_ZONE),
        }))),
    };
    Object.freeze(day);
    if (!validateSampleDay(day))
        throw new Error('Invalid M0 sample day');
    return day;
}
