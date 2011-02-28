/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const StatusIconDispatcher = imports.ui.statusIconDispatcher;
const Panel = imports.ui.panel;
const DBus = imports.dbus;
const Lang = imports.lang;
const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Pango = imports.gi.Pango;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;
const Gettext = imports.gettext;

const _ = Gettext.domain('GPaste').gettext;

const BUS_NAME = 'org.gnome.GPaste';
const OBJECT_PATH = '/org/gnome/GPaste';

let pkglibexecdir = null;

const GPasteInterface = {
    name: BUS_NAME,
    methods: [
        { name: 'GetHistory', inSignature: '', outSignature: 'as' },
        { name: 'Select', inSignature: 'u', outSignature: '' },
        { name: 'Delete', inSignature: 'u', outSignature: '' },
        { name: 'Empty', inSignature: '', outSignature: '' },
        { name: 'Launch', inSignature: '', outSignature: '' },
        { name: 'Stop', inSignature: '', outSignature: '' },
    ],
    signals: [
        { name: 'Changed', inSignature: '', outSignature: '' },
        { name: 'Start', inSignature: '', outSignature: '' },
        { name: 'Exit', inSignature: '', outSignature: '' },
    ],
    properties: [
        { name: 'Active', signature: 'b', access: 'readonly' },
    ]
};
let GPasteProxy = DBus.makeProxyClass(GPasteInterface);

function Indicator() {
    this._init.apply(this, arguments);
}

Indicator.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this, 'edit-paste-symbolic');
        Util.spawn(['@libexecdir@/gpaste/gpasted']);
        this._proxy = new GPasteProxy(DBus.session, BUS_NAME, OBJECT_PATH);
        this._proxy.connect('Changed', Lang.bind(this, this._fillHistory));
        this._proxy.connect('Start', Lang.bind(this, this._started));
        this._proxy.connect('Exit', Lang.bind(this, this._exited));
        this._killSwitch = new PopupMenu.PopupSwitchMenuItem(_("Track clipboard changes"), true);
        this._killSwitch.connect('toggled', Lang.bind(this, this._toggleDaemon));
        this._fillMenu();
    },

    _select: function(index) {
        this._proxy.SelectRemote(index);
    },

    _delete: function(index) {
        this._proxy.DeleteRemote(index);
    },

    _empty: function() {
        this._proxy.EmptyRemote();
    },

    _started: function() {
        this._killSwitch.setToggleState(true);
    },

    _exited: function() {
        this._killSwitch.setToggleState(false);
    },

    _toggleDaemon: function() {
        if (this._killSwitch.state)
            this._proxy.LaunchRemote();
        else
            this._proxy.StopRemote();
    },

    _fillHistory: function(history) {
        this._proxy.GetHistoryRemote(Lang.bind(this, function(history) {
            this._history.removeAll();
            if (history.length == 0) {
                let emptyItem = new PopupMenu.PopupMenuItem(_("(Empty)"), { reactive: false });
                this._history.addMenuItem(emptyItem);
            } else if (history != null) {
                let index;
                let limit = 20;
                if (history.length < 20) limit = history.length;
                for (index = 0; index < limit; ++index) {
                    let displaystr = history[index].replace(/\n/g, ' ');
                    let altdisplaystr = _("delete: %s").format(displaystr);
                    let selection = new PopupMenu.PopupAlternatingMenuItem(displaystr, altdisplaystr);
                    let label = selection.label;
                    let inner_index = index;
                    label.clutter_text.max_length = 60;
                    label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
                    selection.connect('activate', Lang.bind(this, function(actor, event) {
                        if (selection.state == PopupMenu.PopupAlternatingMenuItemState.DEFAULT)
                            this._select(inner_index);
                        else
                            this._delete(inner_index);
                    }));
                    this._history.addMenuItem(selection);
                }
                this._history.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
                let emptyItem = new PopupMenu.PopupMenuItem(_("Empty history"));
                emptyItem.connect('activate', Lang.bind(this, this._empty));
                this._history.addMenuItem(emptyItem);
            }
        }));
    },

    _fillMenu: function() {
        this._proxy.GetRemote('Active', Lang.bind(this, function(active) {
            this._killSwitch.setToggleState(active);
            this.menu.addMenuItem(this._killSwitch);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this._history = new PopupMenu.PopupMenuSection();
            this._history.box.name = 'gpaste-history';
            this.menu.addMenuItem(this._history);
            this._fillHistory();
            let prefsItem = new PopupMenu.PopupMenuItem(_("GPaste Settings"));
            prefsItem.connect('activate', function() {
                Util.spawn(['@libexecdir@/gpaste/gpaste-settings']);
            });
            this.menu.addMenuItem(prefsItem);
        }));
    }
};

function main(metadata) {
    Gettext.bindtextdomain('gpaste', metadata.localedir);
    pkglibexecdir = metadata.pkglibexecdir;
    StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['gpaste-applet'] = 'gpaste';
    Panel.STANDARD_TRAY_ICON_ORDER.unshift('gpaste');
    Panel.STANDARD_TRAY_ICON_SHELL_IMPLEMENTATION['gpaste'] = Indicator;
}