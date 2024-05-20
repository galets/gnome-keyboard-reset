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
        this._dbusImpl = null;
        this._ss = null;
        log(`Loaded`);
    }

    enable() {
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(Iface, this);
        this._dbusImpl.export(Gio.DBus.session, "/dev/galets/gkr");

        this._ss = Gio.DBus.session.signal_subscribe(null, "org.gnome.ScreenSaver", "ActiveChanged", "/org/gnome/ScreenSaver", null, Gio.DBusSignalFlags.NONE, (connection, sender, path, iface, signal, params) => {
            log("Screen lock status changed", params);
            this.reset();
        });

        log(`Enabled`);
    }

    // This extension is using "session-modes": ["unlock-dialog"] because it is designed to switch keyboard mode in unlock dialog
    disable() {
        if (this._ss) {
            Gio.DBus.session.signal_unsubscribe(this._ss);
            this._ss = null;
        }

        if (this._dbusImpl) {
            this._dbusImpl.unexport();
            this._dbusImpl = null;
        }

        log(`Disabled`);
    }

    reset() {
        log("Resetting keyboard layout.");
        const sourceman = imports.ui.status.keyboard.getInputSourceManager();

        if (!sourceman) {
            error("cannot obtain InputSourceManager");
            return [false, "internal error"];
        }

        try {
            const idx = sourceman.currentSource.index;
            log(`Current keyboard layout index is: ${idx}`);

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
