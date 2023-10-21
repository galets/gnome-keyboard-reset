"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { Gio } = imports.gi;

const Iface = `<node>
    <interface name="dev.galets.gkr">
        <method name="reset">
        <arg type="b" direction="out" name="success"/>
        <arg type="s" direction="out" name="returnValue"/>
        </method>
    </interface>
</node>`;

class Extension {
    constructor() {
        log(`Initializing`);
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(Iface, this);
        log(`Initialization complete`);
    }

    enable() {
        this._dbusImpl.export(Gio.DBus.session, "/dev/galets/gkr");

        this._ss = Gio.DBus.session.signal_subscribe(null, "org.gnome.ScreenSaver", "ActiveChanged", "/org/gnome/ScreenSaver", null, Gio.DBusSignalFlags.NONE, (connection, sender, path, iface, signal, params) => {
            log("Screen lock status changed", params);
            this.reset();
        });
    }

    disable() {
        if (this._ss) {
            Gio.DBus.session.signal_unsubscribe(this._ss);
            this._ss = null;
        }

        if (this._dbusImpl) {
            this._dbusImpl.unexport();
        }
    }

    reset() {
        log("Resetting keybpoard layout.");
        const sourceman = imports.ui.status.keyboard.getInputSourceManager();

        if (!sourceman) {
            error("cannot obtain InputSourceManager");
            return [false, "internal error"];
        }

        try {
            const idx = sourceman.currentSource.index;
            log(`Current keybpoard layout index is: ${idx}`);

            if (idx != 0) {
                sourceman.inputSources[0].activate(true);
                log(`Keyboard layout was reset.`);
                return [true, "reset successful"];
            } else {
                return [true, "already reset"];
            }
        } catch (e) {
            error(e);
            return [false, `${e}`];
        }
    }
}

function init() {
    return new Extension();
}

function _log(logfunc, ...args) {
    logfunc(`${Me.metadata.uuid}:`, ...args);
}

function log(...args) {
    _log(console.log, ...args);
}

function warn(...args) {
    _log(console.warn, ...args);
}

function error(...args) {
    _log(console.error, ...args);
}
