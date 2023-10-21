# Keyboard reset

This project is a gnome extension which addresses annoyance originating
from having more than one keyboard layout. When screensaver activates,
the gnome-screensaver will use the last keyboard layout used, which
often is not a default one. That causes user to incorrectly enter the
password.

This extension will reset keyboard layout on screensaver activation to
the first keyboard layout.

Also, it is possible to invoke keyboard layout reset manually via command
line. See [the notes](./NOTES.md)
