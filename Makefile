all: install

.PHONY: install test test-unit

install:
	install -d ~/.local/share/gnome-shell/extensions/keyboard-reset@galets
	cp -a metadata.json extension.js ~/.local/share/gnome-shell/extensions/keyboard-reset@galets/

test: test-unit

test-unit:
	node --test tests/unit/extension.test.js
