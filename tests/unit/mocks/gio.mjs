export const state = {
    exported: [],
    subscriptions: [],
    nextSubId: 1,
};

export function resetGioMock() {
    state.exported = [];
    state.subscriptions = [];
    state.nextSubId = 1;
}

export function emitScreenSaverSignal(active = true) {
    for (const sub of state.subscriptions) {
        if (
            sub.iface === 'org.gnome.ScreenSaver' &&
            sub.signal === 'ActiveChanged' &&
            sub.path === '/org/gnome/ScreenSaver'
        ) {
            sub.callback(null, null, sub.path, sub.iface, sub.signal, [active]);
        }
    }
}

const Gio = {
    DBusSignalFlags: {
        NONE: 0,
    },
    DBus: {
        session: {
            signal_subscribe(sender, iface, signal, path, arg0, flags, callback) {
                const id = state.nextSubId++;
                state.subscriptions.push({
                    id,
                    sender,
                    iface,
                    signal,
                    path,
                    arg0,
                    flags,
                    callback,
                });
                return id;
            },
            signal_unsubscribe(id) {
                state.subscriptions = state.subscriptions.filter((s) => s.id !== id);
            },
        },
    },
    DBusExportedObject: {
        wrapJSObject(ifaceXml, instance) {
            const record = {
                ifaceXml,
                instance,
                bus: null,
                objectPath: null,
                exported: false,
            };
            return {
                export(bus, objectPath) {
                    record.bus = bus;
                    record.objectPath = objectPath;
                    record.exported = true;
                    state.exported.push(record);
                },
                unexport() {
                    record.exported = false;
                    state.exported = state.exported.filter((e) => e !== record);
                },
            };
        },
    },
};

export default Gio;
