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

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Clutter = imports.gi.Clutter;

const GPaste = imports.gi.GPaste;

const _ = Gettext.domain('GPaste').gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const AboutItem = Me.imports.aboutItem;
const DummyHistoryItem = Me.imports.dummyHistoryItem;
const EmptyHistoryItem = Me.imports.emptyHistoryItem;
const Item = Me.imports.item;
const PrefsItem = Me.imports.prefsItem;
const SearchItem = Me.imports.searchItem;
const StateSwitch = Me.imports.stateSwitch;
const StatusIcon = Me.imports.statusIcon;

const GPasteIndicator = new Lang.Class({
    Name: 'GPasteIndicator',
    Extends: PanelMenu.Button,

    _init: function() {
        this.parent(0.0, "GPaste");

        this.actor.add_child(new StatusIcon.GPasteStatusIcon());

        this._settings = new GPaste.Settings();

        this._headerSize = 0;
        this._postHeaderSize = 0;
        this._history = [];
        this._preFooterSize = 0;
        this._footerSize = 0;

        this._dummyHistoryItem = new DummyHistoryItem.GPasteDummyHistoryItem();

        this._searchItem = new SearchItem.GPasteSearchItem();
        this._setMaxDisplayedSize();
        this._settingsMaxSizeChangedId = this._settings.connect('changed::max-displayed-history-size', Lang.bind(this, this._resetMaxDisplayedSize));
        this._searchItem.connect('text-changed', Lang.bind(this, this._onSearch));

        this._settingsSizeChangedId = this._settings.connect('changed::element-size', Lang.bind(this, this._resetEntrySize));
        this._resetEntrySize();
        this.menu.connect('open-state-changed', Lang.bind(this, this._onOpenStateChanged));

        this._actions = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });

        this._addToPostHeader(new PopupMenu.PopupSeparatorMenuItem());
        this._addToPostHeader(this._dummyHistoryItem);
        this._addToPreFooter(new PopupMenu.PopupSeparatorMenuItem());
        this._addToFooter(this._actions);

        GPaste.Client.new(Lang.bind(this, function (obj, result) {
            this._client = GPaste.Client.new_finish(result);

            this._dummyHistoryItem.update();
            this._prefsItem = new PrefsItem.GPastePrefsItem(this.menu);
            this._emptyHistoryItem = new EmptyHistoryItem.GPasteEmptyHistoryItem(this._client);

            this._addToHeader(new StateSwitch.GPasteStateSwitch(this._client));
            this._addToHeader(this._searchItem);
            this._actions.actor.add(this._prefsItem, { expand: true, x_fill: false });
            this._actions.actor.add(this._emptyHistoryItem, { expand: true, x_fill: false });
            this._actions.actor.add(new AboutItem.GPasteAboutItem(this._client, this.menu), { expand: true, x_fill: false });

            this._clientUpdateId = this._client.connect('update', Lang.bind(this, this._update));
            this._refresh(0);

            this._clientShowId = this._client.connect('show-history', Lang.bind(this, this._popup));

            this._onStateChanged (true);

            this.menu.actor.connect('key-press-event', Lang.bind(this, this._onKeyPressEvent));
            this.menu.actor.connect('key-release-event', Lang.bind(this, this._onKeyReleaseEvent));

            this.actor.connect('destroy', Lang.bind(this, this._onDestroy));
        }));
    },

    shutdown: function() {
        this._onStateChanged (false);
        this.destroy();
    },

    _onKeyPressEvent: function(actor, event) {
        if (event.has_control_modifier()) {
            let nb = parseInt(event.get_key_unicode());
            if (nb != NaN && nb >= 0 && nb <= 9 && nb < this._history.length) {
                this._history[nb].setActive(true);
            }
        } else {
            this._maybeUpdateIndexVisibility(event, true);
        }
    },

    _onKeyReleaseEvent: function(actor, event) {
        this._maybeUpdateIndexVisibility(event, false);
    },

    _maybeUpdateIndexVisibility: function(event, state) {
        let key = event.get_key_symbol();
        if (key == Clutter.KEY_Control_L || key == Clutter.KEY_Control_R) {
            this._updateIndexVisibility(state);
        }
    },

    _updateIndexVisibility: function(state) {
        for (let i = 0; i<10 && i < this._history.length; ++i) {
            this._history[i].showIndex(state);
        }
    },

    _doSearch: function(searchChanged) {
        let search = this._searchItem.text.toLowerCase();
        let maxSize = this._maxSize;
        let i = 0;

        this._history.map(function(item) {
            if (i < maxSize) {
                if (item.match(search, searchChanged)) {
                    ++i;
                    item.actor.show();
                    return;
                }
            }
            item.actor.hide();
        });
    },

    _onSearch: function() {
        this._doSearch(true);
    },

    _fakeSearch: function() {
        this._doSearch(false);
    },

    _resetEntrySize: function() {
        this._searchItem.resetSize(this._settings.get_element_size()/2 + 3);
    },

    _setMaxDisplayedSize: function() {
        this._maxSize = this._settings.get_max_displayed_history_size();
    },

    _resetMaxDisplayedSize: function() {
        this._setMaxDisplayedSize();
        this._fakeSearch();
    },

    _update: function(client, action, target, position) {
        switch (target) {
        case GPaste.UpdateTarget.ALL:
            this._refresh(0);
            break;
        case GPaste.UpdateTarget.POSITION:
            switch (action) {
            case GPaste.UpdateAction.REPLACE:
                this._history[position].resetText();
                break;
            case GPaste.UpdateAction.REMOVE:
                this._refresh(position);
                break;
            }
            break;
        }
    },

    _refresh: function(resetTextFrom) {
        this._client.get_history_size(Lang.bind(this, function(client, result) {
            let size = client.get_history_size_finish(result);
            let length = this._history.length;
            let resetTextBound = 0;
            this._updateVisibility(size == 0);
            if (size > length) {
                for (let index = length; index < size; ++index) {
                    let item = new Item.GPasteItem(this._client, this._settings, index);
                    item.connect('changed', Lang.bind(this, this._fakeSearch));
                    this._addToHistory(item);
                }
                resetTextBound = length;
            } else {
                for (let index = size; index < length; ++index) {
                    this._history.pop().destroy();
                }
                resetTextBound = size;
            }
            for (let index = resetTextFrom; index < resetTextBound; ++index) {
                this._history[index].resetText();
            }
            this._fakeSearch();
        }));
    },

    _updateVisibility: function(empty) {
        if (empty) {
            this._dummyHistoryItem.actor.show();
            this._emptyHistoryItem.hide();
            this._searchItem.actor.hide();
        } else {
            this._dummyHistoryItem.actor.hide();
            this._emptyHistoryItem.show();
            this._searchItem.actor.show();
        }
    },

    _popup: function() {
        this.menu.open(true);
        this._selectSearch(true);
    },

    _selectSearch: function(active) {
        if (this._history.length > 0) {
            this._searchItem.setActive(active);
        }
    },

    _addToHeader: function(item) {
        this.menu.addMenuItem(item, this._headerSize++);
    },

    _addToPostHeader: function(item) {
        this.menu.addMenuItem(item, this._headerSize + this._postHeaderSize++);
    },

    _addToHistory: function(item) {
        this.menu.addMenuItem(item, this._headerSize + this._postHeaderSize + this._history.length);
        this._history[this._history.length] = item;
    },

    _addToPreFooter: function(item) {
        this.menu.addMenuItem(item, this._headerSize + this._postHeaderSize + this._history.length + this._preFooterSize++);
    },

    _addToFooter: function(item) {
        this.menu.addMenuItem(item, this._headerSize + this._postHeaderSize + this._history.length + this._preFooterSize + this._footerSize++);
    },

    _onStateChanged: function(state) {
        this._client.on_extension_state_changed(state, null);
    },

    _onOpenStateChanged: function(menu, state) {
        if (state) {
            this._searchItem.reset();
        } else {
            this._updateIndexVisibility(false);
        }
    },

    _onDestroy: function() {
        this._client.disconnect(this._clientUpdateId);
        this._client.disconnect(this._clientShowId);
        this._settings.disconnect(this._settingsMaxSizeChangedId);
        this._settings.disconnect(this._settingsSizeChangedId);
    }
});

