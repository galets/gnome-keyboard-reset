#!/bin/bash

set -e
md="$(jq '.version |= (tonumber + 1 | tostring)' metadata.json)"
echo "$md" >metadata.json
7z a gnome-keyboard-reset.zip extension.js LICENSE metadata.json README.md