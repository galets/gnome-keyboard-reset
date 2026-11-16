#!/usr/bin/env bash
set -euo pipefail

# Integration / smoke test for keyboard-reset@galets inside a headless GNOME Shell session.
# Intended to run inside a container or VM with gnome-shell, dbus-run-session, gdbus, and gsettings.

if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ]]; then
    exec dbus-run-session -- "$0" "$@"
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_FILE="$(mktemp /tmp/gnome-shell-smoke-XXXXXX.log)"
SHELL_PID=""

cleanup() {
    if [[ -n "$SHELL_PID" ]] && kill -0 "$SHELL_PID" 2>/dev/null; then
        kill "$SHELL_PID" 2>/dev/null || true
        wait "$SHELL_PID" 2>/dev/null || true
    fi
    rm -f "$LOG_FILE"
}
trap cleanup EXIT

echo "=== GNOME Shell version ==="
gnome-shell --version

echo "=== Installing extension ==="
make -C "$REPO_ROOT" install

echo "=== Configuring dual keyboard layouts ==="
gsettings set org.gnome.desktop.input-sources sources "[('xkb', 'us'), ('xkb', 'de')]"

echo "=== Starting headless GNOME Shell ==="
export LIBGL_ALWAYS_SOFTWARE=1
export MUTTER_DEBUG_DUMMY_MODE_SPECS=1280x720
export XDG_SESSION_TYPE=wayland
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/xdg-runtime}"
mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

gnome-shell --headless --virtual-monitor 1280x720 --unsafe-mode >"$LOG_FILE" 2>&1 &
SHELL_PID=$!

echo "=== Waiting for org.gnome.Shell on session D-Bus ==="
for _ in $(seq 1 30); do
    if gdbus call --session \
        --dest org.gnome.Shell \
        --object-path /org/gnome/Shell \
        --method org.freedesktop.DBus.Peer.Ping >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

gdbus call --session \
    --dest org.gnome.Shell \
    --object-path /org/gnome/Shell \
    --method org.freedesktop.DBus.Peer.Ping >/dev/null

echo "=== Enabling extension ==="
gnome-extensions enable keyboard-reset@galets
sleep 1
gnome-extensions info keyboard-reset@galets

eval_shell() {
    gdbus call --session \
        --dest org.gnome.Shell \
        --object-path /org/gnome/Shell \
        --method org.gnome.Shell.Eval "$1"
}

echo "=== Test 1: D-Bus reset() when already at index 0 ==="
RES1="$(gdbus call --session --dest org.gnome.Shell --object-path /dev/galets/gkr --method dev.galets.gkr.reset)"
echo "Result 1: $RES1"
[[ "$RES1" == *"(true, 'already reset')"* ]]

echo "=== Test 2: Switch to layout 1 and call D-Bus reset() ==="
eval_shell "imports.ui.status.keyboard.getInputSourceManager().inputSources[1].activate(true);" >/dev/null
sleep 0.5
RES2="$(gdbus call --session --dest org.gnome.Shell --object-path /dev/galets/gkr --method dev.galets.gkr.reset)"
echo "Result 2: $RES2"
[[ "$RES2" == *"(true, 'reset successful')"* ]]

IDX_AFTER_DBUS="$(eval_shell "imports.ui.status.keyboard.getInputSourceManager().currentSource.index;")"
echo "Layout index after D-Bus reset: $IDX_AFTER_DBUS"
[[ "$IDX_AFTER_DBUS" == *"(true, '0')"* ]]

echo "=== Test 3: Switch to layout 1 and trigger ScreenSaver lock/signal ==="
eval_shell "imports.ui.status.keyboard.getInputSourceManager().inputSources[1].activate(true);" >/dev/null
sleep 0.5

# Try real ScreenSaver.Lock() first; in minimal containers without logind, also emit ActiveChanged(true)
gdbus call --session --dest org.gnome.ScreenSaver --object-path /org/gnome/ScreenSaver --method org.gnome.ScreenSaver.Lock >/dev/null 2>&1 || true
sleep 1

IDX_AFTER_LOCK="$(eval_shell "imports.ui.status.keyboard.getInputSourceManager().currentSource.index;")"
if [[ "$IDX_AFTER_LOCK" != *"(true, '0')"* ]]; then
    echo "ScreenSaver.Lock() did not emit ActiveChanged (likely no logind in container); emitting ActiveChanged(true) signal..."
    gdbus emit --session --object-path /org/gnome/ScreenSaver --signal org.gnome.ScreenSaver.ActiveChanged true
    sleep 1
    IDX_AFTER_LOCK="$(eval_shell "imports.ui.status.keyboard.getInputSourceManager().currentSource.index;")"
fi

echo "Layout index after lock/signal: $IDX_AFTER_LOCK"
[[ "$IDX_AFTER_LOCK" == *"(true, '0')"* ]]

echo "=== Smoke test passed! ==="
