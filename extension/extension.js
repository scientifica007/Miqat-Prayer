import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {addCivilDay, createSampleDay, dateKey, LABELS, SAMPLE_ZONE,
    SAMPLE_LOCATION, SAMPLE_NOTICE} from './core/schedule.js';
import {nextPrayer, formatCountdown} from './core/next-prayer.js';
import {Resources} from './core/resources.js';
import {toEpoch} from './lib/time.js';

export default class MiqatExtension extends Extension {
    enable() {
        this._resources = new Resources(error => console.error('[Miqat M0] cleanup', error));
        this._hoverId = 0;
        this._tickId = 0;
        this._day = null;
        try {
            this._button = new PanelMenu.Button(0.5, 'مِيقات — أوقات تجريبية');
            this._resources.own(() => this._button.destroy());
            const box = new St.BoxLayout({style_class: 'panel-status-menu-box miqat-panel'});
            this._button.add_child(box);
            box.set_text_direction(Clutter.TextDirection.RTL);
            this._title = new St.Label({text: 'تجريبي · مِيقات', y_align: Clutter.ActorAlign.CENTER});
            box.add_child(this._title);
            this._countdown = new St.Label({text: '—', style_class: 'miqat-countdown',
                y_align: Clutter.ActorAlign.CENTER});
            box.add_child(this._countdown);
            this._countdown.set_text_direction(Clutter.TextDirection.LTR);

            this._card = new St.BoxLayout({vertical: true, reactive: false,
                visible: false, style_class: 'miqat-card'});
            // Own the actor immediately, including failures before addChrome().
            const card = this._card;
            this._resources.own(() => {
                try {
                    if (card.get_parent())
                        Main.layoutManager.removeChrome(card);
                } finally {
                    card.destroy();
                }
            });
            this._card.set_text_direction(Clutter.TextDirection.RTL);
            this._cardLabel = new St.Label({style_class: 'miqat-card-label'});
            this._card.add_child(this._cardLabel);
            this._cardLabel.clutter_text.line_wrap = true;
            this._cardLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
            this._cardLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            Main.layoutManager.addChrome(this._card, {affectsInputRegion: false});
            this._button.track_hover = true;
            this._resources.connect(this._button, 'notify::hover', () => this._hoverChanged());
            this._resources.connect(this._button.menu, 'open-state-changed', () => this._hideCard());
            this._resources.connect(Main.layoutManager, 'monitors-changed', () => this._hideCard());
            this._resources.connect(Main.sessionMode, 'updated', () => {
                this._hideCard();
                if (!Main.sessionMode.isLocked)
                    this._refresh();
            });
            // Registered last so pending callbacks stop before actors are destroyed.
            this._resources.own(() => {
                this._hideCard();
                if (this._tickId) {
                    GLib.Source.remove(this._tickId);
                    this._tickId = 0;
                }
            });
            Main.panel.addToStatusArea(this.uuid, this._button);
            this._refresh();
            this._tickId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
                // First delivered tick after resume recomputes from wall time.
                if (!Main.sessionMode.isLocked)
                    this._refresh();
                return GLib.SOURCE_CONTINUE;
            });
        } catch (error) {
            this.disable();
            throw error;
        }
    }

    _refresh() {
        const now = Date.now();
        const key = dateKey(now, SAMPLE_ZONE);
        if (this._day?.date !== key) {
            this._day = createSampleDay(key, toEpoch);
            this._tomorrow = createSampleDay(addCivilDay(key), toEpoch);
            this._buildMenu();
        }
        const result = nextPrayer(now, this._day, this._tomorrow);
        const ready = result.status === 'ready';
        const name = ready ? LABELS[result.event.id] : 'بيانات غير متاحة';
        const title = `تجريبي · ${name}`;
        const countdown = ready ? formatCountdown(result.remainingMs) : '—';
        if (this._title.text !== title)
            this._title.text = title;
        if (this._countdown.text !== countdown)
            this._countdown.text = countdown;
        const next = ready
            ? `${name}: \u2066${result.event.localTime}\u2069 · \u2066${result.event.date}\u2069`
            : 'موعد الصلاة القادمة غير متاح';
        const text = [SAMPLE_NOTICE, next, SAMPLE_LOCATION, `المنطقة الزمنية: ${SAMPLE_ZONE}`,
            'المصدر: نموذج M0 محلي مصطنع — غير موثّق',
            `التغطية التجريبية: ${this._day.date} / ${this._tomorrow.date}`,
            'زاوية القبلة: غير متاحة بعد', 'التاريخ الهجري: غير متاح بعد'].join('\n');
        if (this._cardLabel.text !== text)
            this._cardLabel.text = text;
        const accessibleName = `مِيقات تجريبي، ${name}`;
        if (this._button.accessible_name !== accessibleName)
            this._button.accessible_name = accessibleName;
        // Accessible description changes by minute, avoiding second-by-second announcements.
        const description = ready
            ? `${SAMPLE_NOTICE}، المتبقي ${Math.ceil(result.remainingMs / 60000)} دقيقة`
            : SAMPLE_NOTICE;
        if (this._button.accessible_description !== description)
            this._button.accessible_description = description;
    }

    _buildMenu() {
        const menu = this._button.menu;
        menu.removeAll();
        const add = text => {
            const item = new PopupMenu.PopupMenuItem(text, {reactive: false, can_focus: false});
            menu.addMenuItem(item);
            item.set_text_direction(Clutter.TextDirection.RTL);
        };
        add(SAMPLE_NOTICE);
        add(`${SAMPLE_LOCATION} · \u2066${this._day.date}\u2069`);
        add(`المنطقة الزمنية: ${SAMPLE_ZONE}`);
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        for (const event of this._day.events) {
            const extra = event.id === 'sunrise' ? ' (ليس صلاة ضمن العدّاد)' : '';
            add(`${LABELS[event.id]}${extra}     \u2066${event.localTime}\u2069`);
        }
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        add(`المصدر: نموذج M0 مصطنع — غير موثّق`);
        add(`التغطية التجريبية: ${this._day.date} / ${this._tomorrow.date}`);
        add('زاوية القبلة: غير متاحة بعد');
        add('التاريخ الهجري: غير متاح بعد');
    }

    _hoverChanged() {
        this._hideCard();
        if (!this._button.hover || this._button.menu.isOpen || Main.sessionMode.isLocked)
            return;
        this._hoverId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
            this._hoverId = 0;
            if (this._button.hover && !this._button.menu.isOpen && !Main.sessionMode.isLocked)
                this._showCard();
            return GLib.SOURCE_REMOVE;
        });
    }

    _showCard() {
        this._refresh();
        const monitor = Main.layoutManager.findMonitorForActor(this._button);
        if (!monitor)
            return;
        const [x, y] = this._button.get_transformed_position();
        const [width, height] = this._button.get_transformed_size();
        this._card.set_width(Math.min(480, monitor.width - 24));
        this._card.show();
        const [, cardWidth] = this._card.get_preferred_width(-1);
        this._card.set_position(Math.max(monitor.x + 8,
            Math.min(x + width / 2 - cardWidth / 2, monitor.x + monitor.width - cardWidth - 8)),
        y + height + 6);
    }

    _hideCard() {
        if (this._hoverId) {
            GLib.Source.remove(this._hoverId);
            this._hoverId = 0;
        }
        this._card?.hide();
    }

    disable() {
        this._resources?.clear();
        this._resources = null;
        this._button = null;
        this._card = null;
        this._cardLabel = null;
        this._title = null;
        this._countdown = null;
        this._day = null;
        this._tomorrow = null;
    }
}
