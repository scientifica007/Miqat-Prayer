import GLib from 'gi://GLib';

export function toEpoch(date, localTime, zoneId) {
    const zone = GLib.TimeZone.new_identifier(zoneId);
    if (!zone)
        throw new Error(`Unknown time zone: ${zoneId}`);
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = localTime.split(':').map(Number);
    const value = GLib.DateTime.new(zone, year, month, day, hour, minute, 0);
    // Reject a normalized/nonexistent local time instead of silently moving it.
    if (!value || value.format('%Y-%m-%d') !== date || value.format('%H:%M') !== localTime)
        throw new Error(`Invalid local time: ${date} ${localTime} ${zoneId}`);
    return value.to_unix() * 1000;
}
