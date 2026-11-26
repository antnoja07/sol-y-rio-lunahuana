#!/bin/sh
set -eu
mkdir -p public
cp index.html styles.css script.js creditos.html public/
if [ -d assets ]; then cp -R assets public/; fi
