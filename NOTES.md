# Debugging notes

## Install

gnome-extensions install gnome-keyboard-reset.zip

## Via command line

```bash
/usr/bin/dbus-monitor --session "type=method_call,interface=org.gnome.ScreenSaver" |
while read -r MSG; do
    if /usr/bin/grep "member=Lock" <<<$MSG ; then
        /usr/bin/gdbus call --session --dest org.gnome.Shell \
            --object-path /dev/galets/gkr \
            --method dev.galets.gkr.reset
    fi
done
```

## Notes

to debug, run this:

```bash
dbus-run-session -- gnome-shell --nested --wayland
```

