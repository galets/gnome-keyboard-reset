let currentManager = null;

export function setMockInputSourceManager(manager) {
    currentManager = manager;
}

export function createMockInputSourceManager(initialIndex = 0, count = 2) {
    const activateCalls = [];
    const inputSources = Array.from({ length: count }, (_, idx) => ({
        index: idx,
        activate(interactive) {
            activateCalls.push({ index: idx, interactive });
            manager.currentSource = inputSources[idx];
        },
    }));

    const manager = {
        inputSources,
        currentSource: inputSources[initialIndex],
        activateCalls,
    };

    return manager;
}

export function getInputSourceManager() {
    return currentManager;
}
