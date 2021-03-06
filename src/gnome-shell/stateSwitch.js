/*
 *      This file is part of GPaste.
 *
 *      Copyright 2014 Marc-Antoine Perennou <Marc-Antoine@Perennou.com>
 *
 *      GPaste is free software: you can redistribute it and/or modify
 *      it under the terms of the GNU General Public License as published by
 *      the Free Software Foundation, either version 3 of the License, or
 *      (at your option) any later version.
 *
 *      GPaste is distributed in the hope that it will be useful,
 *      but WITHOUT ANY WARRANTY; without even the implied warranty of
 *      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *      GNU General Public License for more details.
 *
 *      You should have received a copy of the GNU General Public License
 *      along with GPaste.  If not, see <http://www.gnu.org/licenses/>.
 */
/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const Gettext = imports.gettext;
const Lang = imports.lang;

const PopupMenu = imports.ui.popupMenu;

const _ = Gettext.domain('GPaste').gettext;

const GPasteStateSwitch = new Lang.Class({
    Name: 'GPasteStateSwitch',
    Extends: PopupMenu.PopupSwitchMenuItem,

    _init: function(client) {
        this.parent(_("Track changes"), client.is_active());

        this._client = client;
        this._fromDaemon = false;

        this._clientTrackingId = client.connect('tracking', Lang.bind(this, function(c, state) {
            this._toggle(state);
        }));
        this._toggle(client.is_active());

        this.connect('toggled', Lang.bind(this, function() {
            if (!this._fromDaemon) {
                client.track(this.state, null);
            }
        }));

        this.actor.connect('destroy', Lang.bind(this, this._onDestroy));
    },

    _toggle: function(state) {
        this._fromDaemon = true;
        this.setToggleState(state);
        this._fromDaemon = false;
    },

    _onDestroy: function() {
        this._client.disconnect(this._clientTrackingId);
    }
});
