import './register-loader.mjs';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { default: GnomeKeyboardResetExtension } = await import('../../extension.js');
const { state: gioState, resetGioMock, emitScreenSaverSignal } = await import('./mocks/gio.mjs');
const { setMockInputSourceManager, createMockInputSourceManager } = await import('./mocks/keyboard.mjs');

const metadata = JSON.parse(
    readFileSync(new URL('../../metadata.json', import.meta.url), 'utf8')
);

describe('metadata.json', () => {
    it('contains required extension metadata fields', () => {
        assert.equal(metadata.uuid, 'keyboard-reset@galets');
        assert.ok(typeof metadata.name === 'string' && metadata.name.length > 0);
        assert.ok(typeof metadata.description === 'string' && metadata.description.length > 0);
        assert.ok(Array.isArray(metadata['shell-version']) && metadata['shell-version'].length > 0);
        assert.ok(Number.isInteger(Number(metadata.version)) && Number(metadata.version) > 0);
    });

    it('declares both user and unlock-dialog session modes', () => {
        assert.ok(Array.isArray(metadata['session-modes']));
        assert.ok(metadata['session-modes'].includes('user'));
        assert.ok(metadata['session-modes'].includes('unlock-dialog'));
    });
});

describe('GnomeKeyboardResetExtension', () => {
    let ext;

    beforeEach(() => {
        resetGioMock();
        setMockInputSourceManager(createMockInputSourceManager(0, 2));
        ext = new GnomeKeyboardResetExtension(metadata);
    });

    it('initializes with null D-Bus and screensaver handles', () => {
        assert.equal(ext._dbusImpl, null);
        assert.equal(ext._ss, null);
        assert.equal(ext.metadata.uuid, 'keyboard-reset@galets');
    });

    it('exports D-Bus interface and subscribes to ScreenSaver ActiveChanged on enable()', () => {
        ext.enable();

        assert.equal(gioState.exported.length, 1);
        assert.equal(gioState.exported[0].objectPath, '/dev/galets/gkr');
        assert.match(gioState.exported[0].ifaceXml, /<interface name="dev\.galets\.gkr">/);
        assert.match(gioState.exported[0].ifaceXml, /<method name="reset">/);

        assert.equal(gioState.subscriptions.length, 1);
        assert.equal(gioState.subscriptions[0].iface, 'org.gnome.ScreenSaver');
        assert.equal(gioState.subscriptions[0].signal, 'ActiveChanged');
        assert.equal(gioState.subscriptions[0].path, '/org/gnome/ScreenSaver');
    });

    it('cleans up D-Bus export and signal subscription on disable()', () => {
        ext.enable();
        ext.disable();

        assert.equal(gioState.exported.length, 0);
        assert.equal(gioState.subscriptions.length, 0);
        assert.equal(ext._dbusImpl, null);
        assert.equal(ext._ss, null);
    });

    it('handles disable() safely when not enabled or called twice', () => {
        assert.doesNotThrow(() => ext.disable());
        ext.enable();
        ext.disable();
        assert.doesNotThrow(() => ext.disable());
    });

    it('returns already reset when current layout index is 0', () => {
        const manager = createMockInputSourceManager(0, 2);
        setMockInputSourceManager(manager);

        const result = ext.reset();
        assert.deepEqual(result, [true, 'already reset']);
        assert.equal(manager.activateCalls.length, 0);
    });

    it('activates input source 0 when current layout index is non-zero', () => {
        const manager = createMockInputSourceManager(1, 3);
        setMockInputSourceManager(manager);

        const result = ext.reset();
        assert.deepEqual(result, [true, 'reset successful']);
        assert.deepEqual(manager.activateCalls, [{ index: 0, interactive: true }]);
        assert.equal(manager.currentSource.index, 0);
    });

    it('resets keyboard layout when ScreenSaver ActiveChanged signal fires', () => {
        const manager = createMockInputSourceManager(1, 2);
        setMockInputSourceManager(manager);

        ext.enable();
        emitScreenSaverSignal(true);

        assert.equal(manager.currentSource.index, 0);
        assert.deepEqual(manager.activateCalls, [{ index: 0, interactive: true }]);
    });

    it('returns internal error if InputSourceManager is unavailable', () => {
        setMockInputSourceManager(null);

        const result = ext.reset();
        assert.deepEqual(result, [false, 'internal error']);
    });

    it('catches exceptions from InputSourceManager and returns failure tuple', () => {
        setMockInputSourceManager({
            get currentSource() {
                throw new Error('mock failure');
            },
        });

        const result = ext.reset();
        assert.equal(result[0], false);
        assert.match(result[1], /mock failure/);
    });
});
