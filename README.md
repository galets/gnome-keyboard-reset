# Keyboard reset extension for Gnome

This version is for gnome shell versions 45+. For older shells, please
see [notice for legacy shells](#legacy-gnome-shell)

## Objective

When there is more than one keyboard layout registered in Gnome, the
gnome-screensaver will use the last used keyboard layout. Screensaver
activation usually means that user is away from keyboard, and it is
unreasonable to assume that he will remember to switch back to default.
This results in attempt to enter password incorrectly, due to non-default
keyboard layout.

This extension will reset keyboard layout on screensaver activation to
the first keyboard layout. Also, this extension allows resetting keyboard
using command line.

## Installation

Following command would install extension and activate it

```bash
git clone https://github.com/galets/gnome-keyboard-reset
cd gnome-keyboard-reset
make install
```

restart shell, then activate "Keyboard Reset" extension using extension manager
or using following command line:

```bash
gnome-extensions enable keyboard-reset@galets
# this command must output "Enabled: Yes"
gnome-extensions info keyboard-reset@galets
```

## Reset keyboard to default using command line

Commands such as `setxkbmap` will no longer work on Wayland. Also, latest
versions of Gnome will no longer allow running random scripts via `gdbus`, only
methods from registered extensions can be invoked.

This extension exposes method to set keyboard to default as such:

```bash
/usr/bin/gdbus call --session --dest org.gnome.Shell \
            --object-path /dev/galets/gkr \
            --method dev.galets.gkr.reset
```

## Legacy Gnome Shell

For gnome shells version 41 to 44, please use legacy branch as such:

```bash
git clone https://github.com/galets/gnome-keyboard-reset
cd gnome-keyboard-reset
git checkout legacy
make install
```
