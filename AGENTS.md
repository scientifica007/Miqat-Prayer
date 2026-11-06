# Instructions for Codex CLI — Miqat-Prayer

Read `docs/PRODUCT_SPEC.md` and `docs/ARCHITECTURE.md` before changing code.

## Project purpose
Build a lightweight Ubuntu GNOME Shell prayer-time indicator with a next-prayer countdown, an informative hover card, a click menu, correct Qibla bearing, Hijri date, and authoritative country-specific prayer timetable sources.

## Non-negotiable constraints
1. Never represent computed times as official ministry-approved timetable data without a verified primary publication.
2. Do not modify `scientifica007/Hidjri_Calendar` or `scientifica007/AppHub`; treat them as read-only references unless the user explicitly expands scope.
3. Keep an explicit distinction among `official-timetable`, `authority-method`, and `international-calculation`; show provenance and validity on screen.
4. Use time zone IDs (IANA) and support overnight transitions; never assume a fixed global UTC offset.
5. No network calls inside UI refresh/tick code; do not block GNOME Shell.
6. The first milestone (M0) must use clearly marked **sample times**, and must not suggest religious readiness.
7. Preserve enable/disable lifecycle hygiene: release signals, GLib timers, and all added actors on disable.
8. Support Arabic RTL and accessibility; optimize for the user's Ubuntu 24.04 + GNOME/Wayland laptop without depending on a system tray plugin.
9. Keep the extension small; prefer standard GJS APIs over heavy frameworks or Electron.
10. Add tests for time boundaries and source-validation logic before treating any release as verified.
11. Document all external code provenance and check licenses before copying source files, including from Hidjri_Calendar.
12. Do not install system packages, change GNOME settings globally, or push to remote without user approval during local Codex sessions.

## First local Codex task
- Inspect operating environment: OS, GNOME version, session type, Node runtime, installed extension tooling.
- Propose minimal structure and milestone M0 implementation plan.
- Implement on a development branch after approval, then run unit tests and explain exactly how the user can enable/disable the extension.
- Report changes, commands, automated test results, and what still requires a manual GNOME session test.
- Do not claim an untested GUI feature works merely because JavaScript syntax checks pass.

## Source references
- https://github.com/scientifica007/Hidjri_Calendar
- https://scientifica007.github.io/AppHub/miqat/
- https://gjs.guide/extensions/
