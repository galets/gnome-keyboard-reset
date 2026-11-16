const MOCK_MAP = {
    'gi://Gio': new URL('./mocks/gio.mjs', import.meta.url).href,
    'resource:///org/gnome/shell/extensions/extension.js': new URL('./mocks/extension.mjs', import.meta.url).href,
    'resource:///org/gnome/shell/ui/status/keyboard.js': new URL('./mocks/keyboard.mjs', import.meta.url).href,
};

export async function resolve(specifier, context, nextResolve) {
    if (Object.hasOwn(MOCK_MAP, specifier)) {
        return {
            url: MOCK_MAP[specifier],
            shortCircuit: true,
        };
    }
    return nextResolve(specifier, context);
}
