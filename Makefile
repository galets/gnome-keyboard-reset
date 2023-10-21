all: install

.PHONY: install

install:
	install -d ~/.local/share/gnome-shell/extensions/keyboard-reset@galets
	cp -a metadata.json extension.js ~/.local/share/gnome-shell/extensions/keyboard-reset@galets/
